import { NextResponse } from "next/server";
import { generateSlots } from "../../../lib/slots/generateSlots";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventTypeId = searchParams.get("eventTypeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const timezone = searchParams.get("timezone");

    if (!eventTypeId) {
      return NextResponse.json(
        { error: "eventTypeId is required" },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { error: "startDate is required (ISO timestamp)" },
        { status: 400 }
      );
    }

    if (!endDate) {
      return NextResponse.json(
        { error: "endDate is required (ISO timestamp)" },
        { status: 400 }
      );
    }

    // Parse and validate ISO timestamps
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }

    if (!timezone) {
      return NextResponse.json(
        { error: "timezone is required (e.g., Asia/Kolkata)" },
        { status: 400 }
      );
    }

    const slots = await generateSlots(eventTypeId, startDate, endDate, timezone);

    // Log if no slots were generated
    if (!slots || slots.length === 0) {
      console.warn(`⚠️ No slots generated for eventTypeId: ${eventTypeId}, date range: ${startDate} to ${endDate}`);
    } else {
      console.log(`✅ Generated ${slots.length} slots for eventTypeId: ${eventTypeId}`);
    }

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Slots API error:", error);
    console.error("Error details:", {
      eventTypeId,
      startDate,
      endDate,
      timezone,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("not found") || error.message?.includes("required") ? 400 : 500 }
    );
  }
}

