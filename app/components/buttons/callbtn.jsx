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
      setIsPickerOpen(true);
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
      {/* Confirmation modal when both primary and alternative numbers exist */}
      {isPickerOpen && altPhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsPickerOpen(false)} />
          <div className={`relative w-full max-w-sm p-6 rounded-2xl shadow-2xl border ${theme === "dark" ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"}`}>
            <h3 className={`text-lg font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Choose number to call</h3>
            <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Select which number you want to connect with for {name}.</p>
            <div className="space-y-3">
              <button
                onClick={() => initiateCall(phone)}
                className={`w-full text-left px-4 py-2 rounded-lg ${theme === "dark" ? "bg-gray-800 hover:bg-gray-700 text-gray-100" : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"}`}
              >
                Primary: <span className="font-medium ml-2">{phone}</span>
              </button>
              <button
                onClick={() => initiateCall(altPhone)}
                className={`w-full text-left px-4 py-2 rounded-lg ${theme === "dark" ? "bg-gray-800 hover:bg-gray-700 text-gray-100" : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"}`}
              >
                Alternative: <span className="font-medium ml-2">{altPhone}</span>
              </button>
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => setIsPickerOpen(false)}
                className={`px-4 py-2 rounded-md text-sm ${theme === "dark" ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}