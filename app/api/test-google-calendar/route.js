import { NextResponse } from "next/server";
import { getCalendarClient } from "../../../lib/google/calendarClient";
import { createCalendarEventWithMeet } from "../../../lib/google/createCalendarEvent";

/**
 * Test endpoint to verify Google Calendar integration
 * GET /api/test-google-calendar
 */
export async function GET() {
  try {
    // Check environment variable
    const hasEnvVar = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_2;
    
    if (!hasEnvVar) {
      return NextResponse.json(
        {
          success: false,
          error: "GOOGLE_SERVICE_ACCOUNT_JSON_2 environment variable is not set",
          instructions: "Add GOOGLE_SERVICE_ACCOUNT_JSON_2 to your .env.local file with your service account JSON",
        },
        { status: 400 }
      );
    }

    // Try to parse the credentials
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_2);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON_2",
          details: error.message,
        },
        { status: 400 }
      );
    }

    // Try to create calendar client
    let calendar;
    try {
      calendar = await getCalendarClient();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create Google Calendar client",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Try to create a test event (1 hour from now, 30 min duration)
    const testStartTime = new Date(Date.now() + 3600000).toISOString();
    const testEndTime = new Date(Date.now() + 5400000).toISOString();

    try {
      const result = await createCalendarEventWithMeet({
        summary: "Test Event - Can be deleted",
        description: "This is a test event to verify Google Calendar integration",
        startTime: testStartTime,
        endTime: testEndTime,
        timezone: "UTC",
        inviteeEmail: credentials.client_email, // Send to service account itself
        inviteeName: "Test",
        bookingId: `test-${Date.now()}`,
      });

      return NextResponse.json({
        success: true,
        message: "Google Calendar integration is working!",
        testEvent: {
          eventId: result.eventId,
          meetingLink: result.meetingLink,
        },
        serviceAccountEmail: credentials.client_email,
        note: "A test event was created in your calendar. You can delete it.",
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create test calendar event",
          details: error.message,
          stack: error.stack,
          serviceAccountEmail: credentials.client_email,
          note: "Make sure your Google Calendar is shared with the service account email above. Also note that service accounts cannot send email invitations without Domain-Wide Delegation.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

