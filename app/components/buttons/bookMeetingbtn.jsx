"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";
import { useTheme } from "../../context/themeContext";
import { X, Calendar, Clock } from "lucide-react";

export default function BookMeetingButton({ lead }) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCallType, setSelectedCallType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  const callTypes = [
    { id: "discovery-call", label: "Discovery Call", duration: "It's a discovery Call" },
    { id: "sales-call", label: "Sales Call", duration: "It's a Sales Call" },
  ];

  const handleBook = () => {
    setIsModalOpen(true);
  };

  const handleCallTypeSelect = (callType) => {
    setSelectedCallType(callType);
    // Navigate to the corresponding booking page
    router.push(`/book/${callType.id}`);
    handleClose();
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedCallType(null);
  };

  return (
    <>
      <button
        data-action="book-meeting"
        onClick={handleBook}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
          isDark
            ? "bg-gray-800 text-gray-200 hover:bg-orange-600 hover:text-white"
            : "bg-gray-50 text-gray-900 hover:bg-orange-600 hover:text-white border border-gray-200 hover:border-orange-600"
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span>Schedule Meeting</span>
      </button>

      {/* Call Type Selection Modal */}
      {isModalOpen && !selectedCallType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

          {/* Modal Content */}
          <div
            className={`relative w-full max-w-md rounded-2xl shadow-2xl transform transition-all ${
              isDark ? "bg-[#1f1f1f] border border-gray-700" : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                  <Calendar className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Select Call Type
                  </h2>
                  <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Choose the duration for your meeting
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
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

            {/* Call Type Options */}
            <div className="p-6 space-y-3">
              {callTypes.map((callType) => (
                <button
                  key={callType.id}
                  onClick={() => handleCallTypeSelect(callType)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isDark
                      ? "border-gray-700 hover:border-orange-500/50 bg-gray-800/50 hover:bg-gray-800"
                      : "border-gray-200 hover:border-orange-500 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? "bg-orange-900/40" : "bg-orange-100"}`}>
                        <Clock className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {callType.label}
                        </h3>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {callType.duration}
                        </p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={isDark ? "text-gray-400" : "text-gray-600"}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
