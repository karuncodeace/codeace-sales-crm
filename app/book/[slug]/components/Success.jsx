"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../../context/themeContext";
export default function Success({ bookingData, eventType, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  useEffect(() => {
    if (bookingData) {
      // Trigger animation by setting isOpen after a brief delay
      setTimeout(() => setIsOpen(true), 10);
    }
  }, [bookingData]);

  if (!bookingData) return null;

  // Get user's local timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Format datetime in user's local timezone
  const formatDateTime = (isoString) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: userTimeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // Wait for animation to complete
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      id="booking-success-modal"
      className={`size-full fixed top-0 start-0 z-[80] overflow-x-hidden overflow-y-auto ${
        bookingData ? "block" : "hidden"
      }`}
      role="dialog"
      tabIndex="-1"
      aria-labelledby="booking-success-modal-label"
    >
      {/* Backdrop */}
      <div
        className={`fixed top-0 start-0 w-full h-full bg-black/50 transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      ></div>

      {/* Modal Content */}
      <div className="relative z-[90] flex items-center min-h-full pointer-events-none">
      <div
        className={`hs-overlay-animation-target transition-all duration-500 ease-out sm:max-w-lg sm:w-full m-3 sm:mx-auto ${
          isOpen
            ? "hs-overlay-open:mt-7 hs-overlay-open:opacity-100 mt-7 opacity-100"
            : "mt-0 opacity-0"
        }`}
      >
        <div className={`flex flex-col ${theme === "light" ? "bg-white" : "bg-[#262626]"} border ${theme === "light" ? "border-gray-200" : "border-gray-700"} shadow-2xl rounded-xl pointer-events-auto`}>
          {/* Header */}
          <div className={`flex justify-between items-center py-3 px-4 border-b ${theme === "light" ? "border-gray-200" : "border-gray-700"}`}>
            <div className="flex items-center gap-3">
              {/* Checkmark Icon */}
              <div className={`w-10 h-10 ${theme === "light" ? "bg-green-100" : "bg-[#262626]"} rounded-full flex items-center justify-center`}>
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3
                id="booking-success-modal-label"
                className={`font-bold ${theme === "light" ? "text-gray-800" : "text-white"}`}
              >
                Booking Confirmed
              </h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className={`size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent ${theme === "light" ? "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none" : "bg-[#262626] text-white hover:bg-[#262626] focus:outline-none focus:bg-[#262626] disabled:opacity-50 disabled:pointer-events-none"}`}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg
                className="shrink-0 size-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto">
            <p className={`${theme === "light" ? "text-gray-600" : "text-gray-500"} mb-4 text-center`}>
              Your booking has been successfully confirmed.
            </p>

            <div className={`${theme === "light" ? "bg-gray-50 border border-gray-200" : "bg-[#262626] border border-gray-700"} rounded-md p-4 mb-4`}>
              <div className="space-y-3">
                {eventType && (
                  <div>
                    <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-500"} mb-1`}>Event</p>
                    <p className="text-sm font-medium text-gray-800">
                      {eventType.name}
                    </p>
                  </div>
                )}

                <div>
                  <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-500"} mb-1`}>Date & Time</p>
                  <p className={`text-sm font-medium ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                    {formatDateTime(bookingData.start_time)}
                  </p>
                </div>

                {bookingData.invitee_name && (
                  <div>
                    <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-500"} mb-1`}>Name</p>
                    <p className={`text-sm font-medium ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                      {bookingData.invitee_name}
                    </p>
                  </div>
                )}

                {bookingData.invitee_email && (
                  <div>
                    <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-500"} mb-1`}>Email</p>
                    <p className={`text-sm font-medium ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                      {bookingData.invitee_email}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className={`text-sm ${theme === "light" ? "text-gray-500" : "text-gray-500"} text-center`}>
              You will receive a confirmation email shortly.
            </p>
          </div>

          {/* Footer */}
          <div className={`flex justify-end items-center gap-x-2 py-3 px-4 border-t ${theme === "light" ? "border-gray-200" : "border-gray-700"}`}>
            <button
              type="button"
              onClick={handleClose}
              className={`py-2 px-3 inline-flex items-center gap-x- 2 text-sm font-medium rounded-lg border border-transparent ${theme === "light" ? "bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:bg-orange-700 disabled:opacity-50 disabled:pointer-events-none" : "bg-[#262626] text-white hover:bg-[#262626] focus:outline-none focus:bg-[#262626] disabled:opacity-50 disabled:pointer-events-none"}`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

