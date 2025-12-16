"use client";

import { useState } from "react";

export default function CallBtn({ leadId, phone, name, email }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!leadId || !phone || !name || !email) {
      alert("Missing required information: lead ID, phone, name, or email");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/fcm-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          phone,
          name,
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to trigger FCM call", data);
        alert(data.error || "Failed to initiate call. Please try again.");
      } else {
        console.log("FCM call triggered successfully:", data);
        // Optionally show success message
      }
    } catch (err) {
      console.error("Error triggering FCM call:", err);
      alert("Error initiating call. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || !leadId || !phone || !name || !email}
      className="px-4 py-2 rounded-md bg-orange-500 text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
    >
      {isLoading ? "Calling..." : "Call"}
    </button>
  );
}