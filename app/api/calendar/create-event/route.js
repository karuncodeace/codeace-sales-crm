import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, startTime, endTime } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields: title, startTime, endTime" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from("google_calendar_integrations")
      .select("refresh_token")
      .eq("user_id", user.id)
      .single();

    if (integrationError || !integration || !integration.refresh_token) {
      return NextResponse.json(
        { error: "Google Calendar integration not found" },
        { status: 404 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth credentials not configured" },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "http://localhost:3000/api/auth/google/callback"
    );

    oauth2Client.setCredentials({
      refresh_token: integration.refresh_token,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: title,
      start: {
        dateTime: startTime,
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: endTime,
        timeZone: "Asia/Kolkata",
      },
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });

    const googleEventId = response.data.id;
    const meetLink =
      response.data.conferenceData?.entryPoints?.[0]?.uri ||
      response.data.hangoutLink ||
      null;

    if (!meetLink) {
      return NextResponse.json(
        { error: "Failed to generate Google Meet link" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      google_event_id: googleEventId,
      meet_link: meetLink,
    });
  } catch (error) {
    console.error("Calendar event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}


