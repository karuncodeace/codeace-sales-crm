import { NextResponse } from "next/server";
import { rescheduleBooking } from "../../../../lib/bookings/rescheduleBooking";

export async function PATCH(request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const booking = await rescheduleBooking(body);

    return NextResponse.json(booking, { status: 200 });
  } catch (error) {
    console.error("Reschedule booking API error:", error);

    if (
      error.message === "New slot is not available" ||
      error.message === "Booking not found" ||
      error.message === "Event type not found" ||
      error.message === "Only scheduled bookings can be rescheduled" ||
      error.message.includes("required") ||
      error.message.includes("must be") ||
      error.message.includes("cannot be")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

