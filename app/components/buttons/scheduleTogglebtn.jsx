"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import toast from "react-hot-toast";

export default function ScheduleMeeting({ lead }) {
  const [open, setOpen] = useState(false);

  // Default date & time from JSON
  const defaultDateTime = lead?.nextMeeting
    ? new Date(lead.nextMeeting)
    : new Date();

  const [selectedDate, setSelectedDate] = useState(defaultDateTime);

  const handleSave = () => {
    toast.success(`Meeting rescheduled to: ${selectedDate.toString()}`);
    setOpen(false);
  };

  return (
    <>
      {/* RESCHEDULE BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Reschedule
      </button>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-xl p-6 shadow-lg w-[360px] animate-fadeIn">
            
            {/* Modal Title */}
            <h2 className="text-lg font-semibold mb-4 dark:text-gray-200">
              Reschedule Meeting
            </h2>

            {/* Calendar + Time Picker */}
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              timeIntervals={15}
              className="w-full p-2 rounded-md border dark:bg-[#262626] dark:text-gray-200 dark:border-gray-600"
              inline
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
