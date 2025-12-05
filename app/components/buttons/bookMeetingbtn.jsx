"use client";
import React, { useState, useEffect } from "react";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";

export default function BookMeetingButton({ lead }) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  const handleBook = async () => {
    setIsLoading(true);

    const salespersonId = lead.assigned_to || currentUser?.id;

    const meetingUrl =
    `https://cal.com/karun-karthikeyan-8wsv1t/15min?lead_id=${lead.id}&salesperson_id=${salespersonId}`;
  
    try {
      // Save pending appointment
      await fetch("/api/appointments/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          salesperson_id: salespersonId
        }),
      });

      window.open(meetingUrl, "_blank");
    } catch (e) {
      console.error("Pending appointment save error:", e);
      window.open(meetingUrl, "_blank");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleBook}
      disabled={isLoading}
      className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
    >
      {isLoading ? "Opening..." : "Book Meeting"}
    </button>
  );
}
