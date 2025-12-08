"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "../context/themeContext";
import BookingWidget from "./BookingWidget";

export default function BookingModal({ isOpen, onClose, leadId, leadName, leadEmail, salespersonId, callType, onBookingComplete, onError }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal Content */}
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl transform transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-4 ${
          isDark ? "bg-[#1a1a1a] border border-gray-700" : "bg-white border border-gray-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Book a Meeting
            </h2>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {leadName ? `Scheduling ${callType?.duration || ""} meeting with ${leadName}` : "Select a time slot"}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            }`}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Booking Widget Container */}
        <div className="flex-1 overflow-hidden min-h-0">
          <BookingWidget
            leadId={leadId}
            leadName={leadName}
            leadEmail={leadEmail}
            salespersonId={salespersonId}
            callType={callType}
            onBookingComplete={onBookingComplete}
            onError={onError}
          />
        </div>
      </div>
    </div>
  );
}

