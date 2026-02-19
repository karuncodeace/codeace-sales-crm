"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import useSWR from "swr";
import { useTheme } from "../context/themeContext";
import toast from "react-hot-toast";
import { Calendar, Clock, User, Mail, Filter, CheckCircle2, XCircle, AlertCircle, CalendarClock, X, Video, ExternalLink, Copy } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { useRouter } from "next/navigation";
import MeetingTable from "../components/tables/meetingTable";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function BookingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [statusFilter, setStatusFilter] = useState("all");
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, appointment: null });
  const [cancelModal, setCancelModal] = useState({ isOpen: false, appointment: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [hoveredBookingId, setHoveredBookingId] = useState(null);

  const handleCopy = async (e, url, id) => {
    e.stopPropagation();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      // ignore
    }
  };

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
  // Check completion and reschedule flags
  const getDisplayStatus = (booking) => {
    // Check if meeting_completion_status is true (boolean) or "completed" (legacy text)
    const completion = booking.meeting_completion_status === true || 
                       String(booking.meeting_completion_status || "").toLowerCase() === "completed";
    if (completion) return "conducted";
    if (booking.is_rescheduled) return "rescheduled";
    if (booking.status === "scheduled") return "booked";
    return booking.status || "unknown";
  };

  // Calculate counts for each status
  const statusCounts = {
    all: bookingsList.length,
    booked: bookingsList.filter((booking) => {
      const status = getDisplayStatus(booking);
      return status === "booked" || status === "rescheduled";
    }).length,
    conducted: bookingsList.filter((booking) => getDisplayStatus(booking) === "conducted").length,
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
        // When "booked" is selected, also show rescheduled meetings
        if (statusFilter === "booked") {
          return displayStatus === "booked" || displayStatus === "rescheduled";
        }
        return displayStatus === statusFilter;
      });
    }
    
    // Sort: Upcoming meetings first, then sort by date
    filtered = [...filtered].sort((a, b) => {
      const now = new Date().getTime();
      const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
      
      const aIsFuture = aTime > now;
      const bIsFuture = bTime > now;
      
      // Upcoming meetings first
      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;
      
      // If both are future, sort by closest upcoming first (ascending)
      if (aIsFuture && bIsFuture) {
        return aTime - bTime;
      }
      
      // If both are past, sort by most recent first (descending)
      return bTime - aTime;
    });
    
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
      case "conducted":
        return `${baseClasses} ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"}`;
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
      case "conducted":
        return <CheckCircle2 className="w-4 h-4" />;
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
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${isDark ? "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"} transition-colors`}
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

  // Internal helper to call API for marking as completed
  const completeBooking = async (booking, isEmailRequired) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          meeting_completion_status: true,
          is_email_required: isEmailRequired,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to mark booking as completed");
      }

      // Refresh bookings list
      mutate();

      if (isEmailRequired) {
        toast.success("Meeting marked as completed and email will be sent.");
      } else {
        toast.success("Meeting marked as completed without sending email.");
      }
    } catch (error) {
      toast.error(error.message || "Failed to mark booking as completed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle mark as completed with confirmation about email
  const handleMarkCompleted = (booking) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Mark this meeting as completed and send follow-up email?
          </p>
          <p className="text-xs text-gray-500">
            You can choose whether an email should be sent to the attendee.
          </p>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await completeBooking(booking, false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                isDark
                  ? "border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              } transition-colors`}
            >
              No, just complete
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await completeBooking(booking, true);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              Yes, send email
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
    <div className={`min-h-screen ${isDark ? "bg-[#1a1a1a]" : "bg-transparent"}`}>
      <div className="pl-5 md:pl-0 2xl:pl-0   w-full">
      <div className="mt-8  flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold ">Meetings Management</h1>
        </div>
      </div>

     <div>
      <MeetingTable />
     </div>
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

