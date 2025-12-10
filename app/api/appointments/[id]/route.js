import { NextResponse } from "next/server";

// Appointments logic has been disabled.
export async function PATCH() {
  return NextResponse.json(
    { message: "Appointments API disabled" },
    { status: 501 }
  );
}

