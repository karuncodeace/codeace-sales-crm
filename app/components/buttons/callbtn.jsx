"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { useTheme } from "../../context/themeContext";
import toast from "react-hot-toast";

export default function CallBtn({ leadId, phone, altPhone, name, email }) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleClick = async () => {
    if (!leadId || !phone || !name || !email) {
      toast.error("Missing required information: lead ID, phone, name, or email");
      return;
    }

    await initiateCall(phone);
  };

  const initiateCall = async (phoneToUse) => {
    setIsPickerOpen(false);
    setIsLoading(true);
    try {
      const res = await fetch("/api/fcm-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          phone: phoneToUse,
          name,
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to initiate call. Please try again.");
      } else {
        toast.success(`Call initiated successfully! Calling ${name} at ${phoneToUse}`);
      }
    } catch (err) {
      toast.error("Error initiating call. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrimaryClick = () => {
    // If alternative exists, open picker; otherwise directly call primary
    if (altPhone) {
      setIsPickerOpen((s) => !s);
    } else {
      handleClick();
    }
  };

  return (
    <div className="relative inline-block text-left w-full">
      <button
        onClick={handlePrimaryClick}
        disabled={isLoading || !leadId || !phone || !name || !email}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ${
        theme === "dark"
          ? "bg-gray-800 text-gray-200 hover:bg-orange-600 hover:text-white"
          : "bg-gray-50 text-gray-900 hover:bg-orange-600 hover:text-white border border-gray-200 hover:border-orange-600"
      }`}
    >
      <Phone className="w-4 h-4" />
      {isLoading ? "Calling..." : "Call Now"}
      </button>

      {isPickerOpen && altPhone && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-2">
            <button
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => initiateCall(phone)}
            >
              Primary: {phone}
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 mt-1"
              onClick={() => initiateCall(altPhone)}
            >
              Alternative: {altPhone || "—"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}