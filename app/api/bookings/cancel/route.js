import { NextResponse } from "next/server";
import { cancelBooking } from "../../../../lib/bookings/cancelBooking";

export async function PATCH(request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const booking = await cancelBooking(body);

    return NextResponse.json(booking, { status: 200 });
  } catch (error) {
    console.error("Cancel booking API error:", error);

    if (
      error.message === "Booking not found" ||
      error.message === "Only scheduled bookings can be cancelled" ||
      error.message.includes("required") ||
      error.message.includes("must be")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


