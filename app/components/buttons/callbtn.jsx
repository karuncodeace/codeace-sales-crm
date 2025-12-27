"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { useTheme } from "../../context/themeContext";
import { useAlert } from "../../context/alertContext";

export default function CallBtn({ leadId, phone, name, email }) {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!leadId || !phone || !name || !email) {
      showAlert("Missing required information: lead ID, phone, name, or email", "error");
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
        showAlert(data.error || "Failed to initiate call. Please try again.", "error");
      } else {
        showAlert(`Call initiated successfully! Calling ${name} at ${phone}`, "success");
      }
    } catch (err) {
      showAlert("Error initiating call. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || !leadId || !phone || !name || !email}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ${
        theme === "dark"
          ? "bg-gray-800 text-gray-200 hover:bg-orange-600 hover:text-white"
          : "bg-gray-50 text-gray-900 hover:bg-orange-600 hover:text-white border border-gray-200 hover:border-orange-600"
      }`}
    >
      <Phone className="w-4 h-4" />
      {isLoading ? "Calling..." : "Call Now"}
    </button>
  );
}