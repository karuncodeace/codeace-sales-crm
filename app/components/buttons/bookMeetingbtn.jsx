"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";
import { generateCalUrl } from "../../../utils/generateCalUrl";

export default function BookMeetingButton({ lead }) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  const handleBook = async () => {
    setIsLoading(true);

    const salespersonId = lead.assigned_to || currentUser?.id || "";

    // Build Cal.com URL with encoded params
    const meetingUrl = generateCalUrl(
      {
        id: lead.id,
        name: lead.name || lead.lead_name || "",
        email: lead.email || lead.lead_email || "",
      },
      { id: salespersonId }
    );

    // Redirect the salesperson to Cal.com (App Router friendly)
    router.push(meetingUrl);
    setIsLoading(false);
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
