"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function RescheduleButton({ task, theme, onReschedule }) {
    const [open, setOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [error, setError] = useState("");

    const dueStyles = {
        today: {
            light: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100 hover:bg-blue-100",
            dark: "text-blue-400 bg-blue-900/40 ring-1 ring-inset ring-blue-700 hover:bg-blue-900/60",
        },
        upcoming: {
            light: "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100 hover:bg-emerald-100",
            dark: "text-emerald-400 bg-emerald-900/40 ring-1 ring-inset ring-emerald-700 hover:bg-emerald-900/60",
        },
        overdue: {
            light: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-100 hover:bg-red-100",
            dark: "text-red-400 bg-red-900/40 ring-1 ring-inset ring-red-700 hover:bg-red-900/60",
        },
        rescheduled: {
            light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100 hover:bg-purple-100",
            dark: "text-purple-400 bg-purple-900/40 ring-1 ring-inset ring-purple-700 hover:bg-purple-900/60",
        },
        completed: {
            light: "text-gray-700 bg-gray-50 ring-1 ring-inset ring-gray-200 hover:bg-gray-100",
            dark: "text-gray-300 bg-gray-900/40 ring-1 ring-inset ring-gray-700 hover:bg-gray-800/60",
        },
    };

    const handleOpen = () => {
        setOpen(true);
        setComment("");
        setError("");
    };

    const handleSave = () => {
        if (!comment.trim()) {
            setError("Please add a reason for rescheduling before saving.");
            return;
        }

        const formattedDate = selectedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        const formattedTime = selectedDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        onReschedule(task.id, {
            time: formattedTime,
            date: formattedDate,
            due: "upcoming",
            comment: comment.trim(),
        });

        setOpen(false);
        setComment("");
        setError("");
    };

    const handleCancel = () => {
        setOpen(false);
        setComment("");
        setError("");
    };

    return (
        <>
            {/* Reschedule Button - Shows current time */}
            <button
                onClick={handleOpen}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-all ${
                    dueStyles[task.due]?.[theme === "dark" ? "dark" : "light"] || dueStyles.upcoming.light
                }`}
            >
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    className="w-3 h-3" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M16 2V6M8 2V6" />
                    <path d="M3 10H21" />
                    <path d="M21 12V10C21 6.22876 21 4.34315 19.8284 3.17157C18.6569 2 16.7712 2 13 2H11C7.22876 2 5.34315 2 4.17157 3.17157C3 4.34315 3 6.22876 3 10V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13" />
                    <path d="M16 20L18 22L22 18" />
                </svg>
                {task.time}
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancel}>
                    <div 
                        className={`rounded-xl p-6 shadow-2xl w-[400px] max-h-[90vh] overflow-y-auto animate-fadeIn ${
                            theme === "dark" ? "bg-[#1f1f1f] border border-gray-700" : "bg-white border border-gray-200"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-100"}`}>
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 24 24" 
                                    className={`w-5 h-5 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <path d="M16 2V6M8 2V6" strokeLinecap="round" />
                                    <path d="M3 10H21" />
                                    <path d="M21 12V10C21 6.22876 21 4.34315 19.8284 3.17157C18.6569 2 16.7712 2 13 2H11C7.22876 2 5.34315 2 4.17157 3.17157C3 4.34315 3 6.22876 3 10V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13" />
                                    <path d="M16 20L18 22L22 18" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                    Reschedule Task
                                </h2>
                                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                    {task.title}
                                </p>
                            </div>
                        </div>

                        {/* Comment Section - Required */}
                        <div className="mb-5">
                            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                Reason for Rescheduling <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => {
                                    setComment(e.target.value);
                                    if (e.target.value.trim()) setError("");
                                }}
                                placeholder="Please provide a reason for rescheduling this task..."
                                rows={3}
                                className={`w-full p-3 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                    theme === "dark" 
                                        ? "bg-[#262626] border-gray-600 text-gray-200 placeholder:text-gray-500" 
                                        : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                                } ${error ? "border-red-500 ring-1 ring-red-500" : ""}`}
                            />
                            {error && (
                                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Date & Time Picker */}
                        <div className="mb-5">
                            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                New Date & Time
                            </label>
                            <div className={`rounded-lg overflow-hidden ${theme === "dark" ? "reschedule-datepicker-dark" : ""}`}>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    showTimeSelect
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    timeIntervals={15}
                                    minDate={new Date()}
                                    inline
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Selected DateTime Preview */}
                        <div className={`p-3 rounded-lg mb-5 ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                            <div className="flex items-center gap-2">
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 24 24" 
                                    className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <path d="M12 8V12L14 14" strokeLinecap="round" />
                                    <circle cx="12" cy="12" r="9" />
                                </svg>
                                <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    {selectedDate.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })} at {selectedDate.toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleCancel}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                                    theme === "dark" 
                                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!comment.trim()}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                                    comment.trim()
                                        ? "bg-orange-500 text-white hover:bg-orange-600"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                            >
                                Reschedule
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
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                
                /* Dark theme styles for react-datepicker */
                .reschedule-datepicker-dark .react-datepicker {
                    background-color: #262626 !important;
                    border-color: #404040 !important;
                    color: #e5e5e5 !important;
                    font-family: inherit !important;
                }
                .reschedule-datepicker-dark .react-datepicker__header {
                    background-color: #1f1f1f !important;
                    border-color: #404040 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__current-month,
                .reschedule-datepicker-dark .react-datepicker__day-name,
                .reschedule-datepicker-dark .react-datepicker-time__header {
                    color: #e5e5e5 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__day {
                    color: #d4d4d4 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__day:hover {
                    background-color: #404040 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__day--selected,
                .reschedule-datepicker-dark .react-datepicker__day--keyboard-selected {
                    background-color: #f97316 !important;
                    color: white !important;
                }
                .reschedule-datepicker-dark .react-datepicker__day--disabled {
                    color: #525252 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__time-container {
                    border-color: #404040 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__time {
                    background-color: #262626 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item {
                    color: #d4d4d4 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item:hover {
                    background-color: #404040 !important;
                }
                .reschedule-datepicker-dark .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected {
                    background-color: #f97316 !important;
                    color: white !important;
                }
                .reschedule-datepicker-dark .react-datepicker__navigation-icon::before {
                    border-color: #9ca3af !important;
                }
            `}</style>
        </>
    );
}

