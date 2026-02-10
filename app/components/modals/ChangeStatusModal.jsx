"use client";

import React from "react";
import DatePicker from "react-datepicker";
import { Edit2 } from "lucide-react";
import { useTheme } from "../../context/themeContext";

export default function ChangeStatusModal({
  isOpen,
  newStatus,
  comment,
  nextTask,
  connectThrough,
  dueDate,
  isSubmitting,
  onChange, // (field, value)
  onConfirm,
  onClose,
}) {
  const { theme } = useTheme();
  if (!isOpen) return null;

  const connectOptions = [
    { id: "call", label: "Call" },
    { id: "email", label: "Email" },
    { id: "meeting", label: "Meeting" },
    { id: "whatsapp", label: "WhatsApp" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-md mx-auto rounded-2xl shadow-2xl transform transition-all ${theme === "dark" ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Edit2 className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Change Status</h2>
              <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Changing to: <span className="font-medium text-orange-500">{newStatus}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Connect Through (Optional)</label>
            <div className="grid grid-cols-4 gap-2">
              {connectOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onChange("connectThrough", o.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${connectThrough === o.id ? "border-orange-500 bg-orange-50 text-orange-600" : theme === "dark" ? "border-gray-700 hover:border-gray-600 text-gray-400" : "border-gray-200 hover:border-gray-300 text-gray-500"}`}
                >
                  <span className="text-sm">{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Due Date (Optional)</label>
            <div>
              <DatePicker
                selected={dueDate ? new Date(dueDate) : null}
                onChange={(date) => {
                  if (!date) return onChange("dueDate", "");
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  onChange("dueDate", `${yyyy}-${mm}-${dd}`);
                }}
                dateFormat="yyyy-MM-dd"
                className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${theme === "dark" ? "bg-[#262626] border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}
                placeholderText="Select a date"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Current Stage Comment <span className="text-red-500">*</span></label>
            <textarea
              placeholder="Add a comment about this status change..."
              className={`w-full p-3 rounded-xl border-2 text-sm transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${theme === "dark" ? "bg-[#262626] border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}
              rows={4}
              value={comment}
              onChange={(e) => onChange("comment", e.target.value)}
            />
            <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>This will be saved as a note in the Notes tab (General category).</p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Next Task (Optional)</label>
            <textarea
              placeholder="Describe the next task to be done..."
              className={`w-full p-3 rounded-xl border-2 text-sm transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${theme === "dark" ? "bg-[#262626] border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}
              rows={2}
              value={nextTask}
              onChange={(e) => onChange("nextTask", e.target.value)}
            />
          </div>
        </div>

        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <button onClick={onClose} disabled={isSubmitting} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${theme === "dark" ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} disabled:opacity-50`}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isSubmitting || !comment.trim()} className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50">
            {isSubmitting ? "Updating..." : "Confirm Change"}
          </button>
        </div>
      </div>
    </div>
  );
}

