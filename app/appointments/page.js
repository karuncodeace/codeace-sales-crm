"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import useSWR from "swr";
import { useTheme } from "../context/themeContext";
import toast from "react-hot-toast";
import { Calendar, Clock, User, Mail, Filter, CheckCircle2, XCircle, AlertCircle, CalendarClock, X, Video, ExternalLink } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function BookingsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [statusFilter, setStatusFilter] = useState("all");
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, appointment: null });
  const [cancelModal, setCancelModal] = useState({ isOpen: false, appointment: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all bookings (no status filter on server)
  const { data: bookings, error, isLoading, mutate } = useSWR(
    `/api/bookings`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Normalize bookings to array to avoid runtime errors
  const bookingsList = Array.isArray(bookings) ? bookings : [];


  // Map booking status to display status (bookings use "scheduled", appointments use "booked")
  // Check is_rescheduled flag to detect rescheduled bookings
  const getDisplayStatus = (booking) => {
    if (booking.is_rescheduled) return "rescheduled";
    if (booking.status === "scheduled") return "booked";
    return booking.status || "unknown";
  };

  // Calculate counts for each status
  const statusCounts = {
    all: bookingsList.length,
    booked: bookingsList.filter((booking) => getDisplayStatus(booking) === "booked").length,
    rescheduled: bookingsList.filter((booking) => getDisplayStatus(booking) === "rescheduled").length,
    cancelled: bookingsList.filter((booking) => getDisplayStatus(booking) === "cancelled").length,
  };

  // Filter and sort bookings based on status
  const filteredBookings = React.useMemo(() => {
    let filtered = bookingsList;
    
    // Filter by status if not "all"
    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => {
        const displayStatus = getDisplayStatus(booking);
        return displayStatus === statusFilter;
      });
    } else {
      // When "all" is selected, sort so scheduled/booked bookings appear first
      filtered = [...filtered].sort((a, b) => {
        const aStatus = getDisplayStatus(a);
        const bStatus = getDisplayStatus(b);
        if (aStatus === "booked" && bStatus !== "booked") return -1;
        if (aStatus !== "booked" && bStatus === "booked") return 1;
        // For same status, sort by start_time (most recent first)
        const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
        return bTime - aTime;
      });
    }
    
    return filtered;
  }, [bookingsList, statusFilter]);

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return "Invalid Date";
      return {
        date: format(date, "MMM dd, yyyy"),
        time: format(date, "h:mm a"),
        full: format(date, "MMM dd, yyyy 'at' h:mm a"),
      };
    } catch (err) {
      return { date: "N/A", time: "N/A", full: "N/A" };
    }
  };


  // Get status badge styling
  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "booked":
        return `${baseClasses} ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"}`;
      case "rescheduled":
        return `${baseClasses} ${isDark ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`;
      case "cancelled":
        return `${baseClasses} ${isDark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700"}`;
      default:
        return `${baseClasses} ${isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-700"}`;
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "booked":
        return <CheckCircle2 className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "rescheduled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Handle cancel booking
  const handleCancel = async (booking) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Are you sure you want to cancel the meeting with {booking.invitee_name || "this invitee"}?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(t.id);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                setIsProcessing(true);
                try {
                  const response = await fetch(`/api/bookings/cancel`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      bookingId: booking.id
                    }),
                  });

                  const result = await response.json();

                  if (!response.ok) {
                    throw new Error(result.error || "Failed to cancel booking");
                  }

                  // Refresh bookings list
                  mutate();
                  toast.success("Booking cancelled successfully!");
                } catch (error) {
                  toast.error(error.message || "Failed to cancel booking. Please try again.");
                } finally {
                  setIsProcessing(false);
                }
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
      }
    );
  };

  // Handle reschedule booking
  const handleReschedule = async (booking, newStartTime, newEndTime) => {
    if (!newStartTime || !newEndTime) {
      toast.error("Please select both start and end times");
      return;
    }

    setIsProcessing(true);
    try {
      // Get timezone from booking or use user's timezone
      const timezone = booking.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await fetch(`/api/bookings/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          start: newStartTime,
          end: newEndTime,
          timezone: timezone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reschedule booking");
      }

      // Refresh bookings list
      mutate();
      setRescheduleModal({ isOpen: false, appointment: null });
      toast.success("Booking rescheduled successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to reschedule booking. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
      <div className="pl-5 md:pl-0 2xl:pl-0 w-full mt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Bookings
          </h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            View and manage all your bookings
          </p>
        </div>

        {/* Filters */}
        <div className={`mb-6 flex items-center gap-4 p-4 rounded-lg ${isDark ? "bg-[#262626]" : "bg-white"}`}>
          <Filter className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
          <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Filter by Status:
          </span>
          <div className="flex gap-2">
            {["all", "booked", "rescheduled", "cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  statusFilter === status
                    ? isDark
                      ? "bg-orange-600 text-white"
                      : "bg-orange-500 text-white"
                    : isDark
                    ? "bg-gray-700/50 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    statusFilter === status
                      ? isDark
                        ? "bg-orange-700 text-white"
                        : "bg-orange-600 text-white"
                      : isDark
                      ? "bg-gray-600 text-gray-300"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {statusCounts[status] || 0}
                </span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Showing: {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
            </span>
            {/* Refresh Button */}
            <button
              type="button"
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await mutate();
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className={`inline-flex items-center justify-center rounded-lg border p-2 text-sm font-medium transition-colors focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none ${
                isDark
                  ? "border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                  : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
              aria-label="Refresh bookings table"
              title="Refresh table"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                color="currentColor"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${isRefreshing ? "animate-spin" : ""}`}
              >
                <path d="M20.4879 15C19.2524 18.4956 15.9187 21 12 21C7.02943 21 3 16.9706 3 12C3 7.02943 7.02943 3 12 3C15.7292 3 18.9286 5.26806 20.2941 8.5" />
                <path d="M15 9H18C19.4142 9 20.1213 9 20.5607 8.56066C21 8.12132 21 7.41421 21 6V3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${isDark ? "border-orange-500" : "border-orange-600"}`}></div>
              <p className={`mt-4 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Loading bookings...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`p-4 rounded-lg ${isDark ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"}`}>
            <p className="text-sm font-medium">Error loading bookings: {error.message || "Unknown error"}</p>
          </div>
        )}

        {/* Bookings List */}
        {!isLoading && !error && (
          <div>
            {filteredBookings.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${isDark ? "bg-[#262626]" : "bg-white"}`}>
                <Calendar className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                <p className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  No bookings found
                </p>
                <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {statusFilter !== "all" ? `No ${statusFilter} bookings.` : "You don't have any bookings yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBookings.map((booking) => {
                  const startTime = formatDateTime(booking.start_time);
                  const endTime = formatDateTime(booking.end_time);
                  const displayStatus = getDisplayStatus(booking);

                  return (
                    <div
                      key={booking.id}
                      className={`p-6 rounded-lg border transition-all hover:shadow-lg ${
                        isDark
                          ? "bg-[#262626] border-gray-700 hover:border-gray-600"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                    <div className="flex items-start justify-between">
                      {/* Left Section - Main Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isDark ? "bg-orange-900/30" : "bg-orange-100"}`}>
                              <Calendar className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                            </div>
                            <div>
                              <h3 className={`text-md font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                                Booking
                              </h3>
                            </div>
                          </div>
                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            
                            <span className={getStatusBadge(displayStatus)}>
                              {displayStatus?.charAt(0).toUpperCase() + displayStatus?.slice(1) || "Unknown"}
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                          {/* Date & Time */}
                          <div className="flex items-start gap-3">
                            <Clock className={`w-5 h-5 mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                            <div>
                              
                              <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                                {startTime.full}
                              </p>
                              {endTime.full !== "N/A" && (
                                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                  Ends: {endTime.full}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Invitee Information */}
                          {(booking.invitee_name || booking.invitee_email) && (
                            <div className="flex flex-col  gap-3">
                              <div className="flex items-center gap-3">
                              <User className={`w-5 h-5 mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />

                                {booking.invitee_name && (
                                  <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {booking.invitee_name}
                                  </p>
                                )}
                                
                               
                              </div>
                              <div className="flex items-center gap-3">
                              <Mail className={`w-5 h-5 mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />

                                {booking.invitee_email && (
                                  <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {booking.invitee_email}
                                  </p>
                                )}
                                
                               
                              </div>
                            </div>
                          )}

                          {/* Meeting Link */}
                          {booking.meeting_link && (
                            <div className="flex items-center gap-3">
                              <Video className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                              <a
                                href={booking.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-sm flex items-center gap-1 hover:underline ${
                                  isDark ? "text-orange-400" : "text-orange-600"
                                }`}
                              >
                                Join the meet
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                      {/* Action Buttons */}
                      {booking.status === "scheduled" && (
                        <div className={`mt-4 pt-4 flex justify-end ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex  gap-2">
                            <button
                              type="button"
                              onClick={() => setRescheduleModal({ isOpen: true, appointment: booking })}
                              disabled={isProcessing}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                isDark
                                  ? "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  : "bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              }`}
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(booking)}
                              disabled={isProcessing}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                isDark
                                  ? "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  : "bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Footer - Metadata */}
                      <div className={`mt-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                        <div className="flex justify-between text-xs">
                          {booking.id  && (
                            <div className="flex items-center gap-2">
                              <span className={isDark ? "text-gray-400" : "text-gray-500"}>Booking ID:</span>
                              <span className={isDark ? "text-gray-300" : "text-gray-700"}>{booking.id}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            {booking.created_at && (
                              <div className="flex items-center gap-2">
                                <span className={isDark ? "text-gray-400" : "text-gray-500"}>Created:</span>
                                <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                                  {formatDateTime(booking.created_at).date}
                                </span>
                              </div>
                            )}
                           
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && rescheduleModal.appointment && (
        <RescheduleModal
          appointment={rescheduleModal.appointment}
          onClose={() => setRescheduleModal({ isOpen: false, appointment: null })}
          onReschedule={handleReschedule}
          isDark={isDark}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

// Reschedule Modal Component
function RescheduleModal({ appointment, onClose, onReschedule, isDark, isProcessing }) {
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

  // Set default times based on current appointment
  React.useEffect(() => {
    if (appointment.start_time) {
      const start = new Date(appointment.start_time);
      start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
      setNewStartTime(start.toISOString().slice(0, 16));
    }
    if (appointment.end_time) {
      const end = new Date(appointment.end_time);
      end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
      setNewEndTime(end.toISOString().slice(0, 16));
    }
  }, [appointment]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newStartTime || !newEndTime) {
      toast.error("Please select both start and end times");
      return;
    }
    // Convert to ISO string
    const startISO = new Date(newStartTime).toISOString();
    const endISO = new Date(newEndTime).toISOString();
    onReschedule(appointment, startISO, endISO);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-md rounded-lg shadow-xl ${
          isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"
        }`}
      >
        <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Reschedule Meeting
          </h2>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Select new date and time for the meeting with {appointment.invitee_name || "this invitee"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              New Start Time
            </label>
            <input
              type="datetime-local"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:ring-2 focus:ring-orange-500`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              New End Time
            </label>
            <input
              type="datetime-local"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:ring-2 focus:ring-orange-500`}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !newStartTime || !newEndTime}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                  : "bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
              }`}
            >
              {isProcessing ? "Rescheduling..." : "Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

