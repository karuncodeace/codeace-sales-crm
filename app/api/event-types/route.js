import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");

    const supabase = await supabaseServer();

    // Fetch by primary key (e.g. reschedule flow in CRM)
    if (id) {
      const { data, error } = await supabase
        .from("event_types")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch event type: ${error.message}`);
      }
      if (!data) {
        return NextResponse.json({ error: "Event type not found" }, { status: 404 });
      }
      if (!data.active) {
        return NextResponse.json(
          { error: "Event type is not active" },
          { status: 404 }
        );
      }
      return NextResponse.json(data);
    }

    if (!slug) {
      return NextResponse.json(
        { error: "slug or id is required" },
        { status: 400 }
      );
    }

    // Allow matching slugs that may have trailing whitespace in DB by matching prefix.
    // Use ILIKE with a prefix to tolerate minor data inconsistencies (e.g., "discussion-call ").
    const { data, error } = await supabase
      .from("event_types")
      .select("*")
      .ilike("slug", `${slug}%`)
      .eq("active", true)
      .maybeSingle();

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

