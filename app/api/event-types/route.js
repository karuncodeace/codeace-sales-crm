import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    const { data, error } = await supabase
      .from("event_types")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Event type not found" },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch event type: ${error.message}`);
    }

    if (!data.active) {
      return NextResponse.json(
        { error: "Event type is not active" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Event types API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

