"use client";

import { useState, useEffect } from "react";
import React from "react";
import useSWR from "swr";
import { useTheme } from "../context/themeContext";
import { Calendar, Clock, User, Mail, MapPin, Video, ExternalLink, Filter, CheckCircle2, XCircle, AlertCircle, CalendarX, CalendarClock, MoreVertical } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AppointmentsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [statusFilter, setStatusFilter] = useState("all");
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, appointment: null });
  const [cancelModal, setCancelModal] = useState({ isOpen: false, appointment: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [openActionsMenu, setOpenActionsMenu] = useState(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-actions-menu="true"]')) {
        setOpenActionsMenu(null);
      }
    };

    if (openActionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openActionsMenu]);

  // Fetch all appointments (no status filter on server)
  const { data: appointments, error, isLoading, mutate } = useSWR(
    `/api/appointments`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Normalize appointments to array to avoid runtime errors
  const appointmentsList = Array.isArray(appointments) ? appointments : [];

  // Calculate counts for each status
  const statusCounts = {
    all: appointmentsList.length,
    booked: appointmentsList.filter((apt) => apt.status === "booked").length,
    rescheduled: appointmentsList.filter((apt) => apt.status === "rescheduled").length,
    cancelled: appointmentsList.filter((apt) => apt.status === "cancelled").length,
  };

  // Filter and sort appointments based on status
  const filteredAppointments = React.useMemo(() => {
    let filtered = appointmentsList;
    
    // Filter by status if not "all"
    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    } else {
      // When "all" is selected, sort so booked appointments appear first
      filtered = [...filtered].sort((a, b) => {
        if (a.status === "booked" && b.status !== "booked") return -1;
        if (a.status !== "booked" && b.status === "booked") return 1;
        // For same status, sort by start_time (most recent first)
        const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
        return bTime - aTime;
      });
    }
    
    return filtered;
  }, [appointmentsList, statusFilter]);

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

  // Handle cancel appointment
  const handleCancel = async (appointment) => {
    if (!confirm(`Are you sure you want to cancel the meeting with ${appointment.lead_name || appointment.attendee_name || "this lead"}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to cancel appointment");
      }

      // Refresh appointments list
      mutate();
      alert("Appointment cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert(error.message || "Failed to cancel appointment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reschedule appointment
  const handleReschedule = async (appointment, newStartTime, newEndTime) => {
    if (!newStartTime || !newEndTime) {
      alert("Please select both start and end times");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          start_time: newStartTime,
          end_time: newEndTime,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reschedule appointment");
      }

      // Refresh appointments list
      mutate();
      setRescheduleModal({ isOpen: false, appointment: null });
      alert("Appointment rescheduled successfully!");
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      alert(error.message || "Failed to reschedule appointment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
      <div className="pl-5 md:pl-0 2xl:pl-0 w-full mt-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Appointments
          </h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            View and manage all your booked meetings
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
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
          <div className="ml-auto">
            <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Showing: {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${isDark ? "border-orange-500" : "border-orange-600"}`}></div>
              <p className={`mt-4 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Loading appointments...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`p-4 rounded-lg ${isDark ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"}`}>
            <p className="text-sm font-medium">Error loading appointments: {error.message || "Unknown error"}</p>
          </div>
        )}

        {/* Appointments List */}
        {!isLoading && !error && (
          <div>
            {filteredAppointments.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${isDark ? "bg-[#262626]" : "bg-white"}`}>
                <Calendar className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                <p className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  No appointments found
                </p>
                <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {statusFilter !== "all" ? `No ${statusFilter} appointments.` : "You don't have any appointments yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAppointments.map((appointment) => {
                  const startTime = formatDateTime(appointment.start_time);
                  const endTime = formatDateTime(appointment.end_time);

                  return (
                    <div
                      key={appointment.id}
                      className={`p-6 rounded-lg border transition-all hover:shadow-lg ${
                        isDark
                          ? "bg-[#262626] border-gray-700 hover:border-gray-600"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                    <div className="flex items-start justify-between">
                      {/* Left Section - Main Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2 rounded-lg ${isDark ? "bg-orange-900/30" : "bg-orange-100"}`}>
                            <Calendar className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                          </div>
                          <div>
                            <h3 className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                              {appointment.title || "Meeting"}
                            </h3>
                            
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                          {/* Date & Time */}
                          <div className="flex items-start gap-3">
                            <Clock className={`w-5 h-5 mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                            <div>
                              <p className={`text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                Date & Time
                              </p>
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

                          {/* Lead Information */}
                          {appointment.lead_name && (
                            <div className="flex items-start gap-3">
                              <User className={`w-5 h-5 mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                              <div>
                                <p className={`text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  Lead
                                </p>
                                <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                                  {appointment.lead_name}
                                </p>
                                {appointment.lead_id && (
                                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                    ID: {appointment.lead_id}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                        

                        

                          {/* Join URL */}
                          {appointment.join_url && (
                            <div className="flex items-start gap-3">
                              <Video className={`w-5 h-5 mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                              <div>
                                <p className={`text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  Meeting Link
                                </p>
                                <a
                                  href={appointment.join_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-sm flex items-center gap-1 hover:underline ${
                                    isDark ? "text-orange-400" : "text-orange-600"
                                  }`}
                                >
                                  Join Meeting
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Section - Actions */}
                      <div className="ml-4 relative">
                        {appointment.status === "booked" && (
                          <div className="relative" data-actions-menu="true">
                            <button
                              type="button"
                              aria-label="Open actions menu"
                              onClick={() => setOpenActionsMenu(openActionsMenu === appointment.id ? null : appointment.id)}
                              className={`inline-flex items-center justify-center rounded-full border p-2 focus:outline-none transition-colors ${
                                isDark
                                  ? "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                                  : "border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300"
                              }`}
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {openActionsMenu === appointment.id && (
                              <div
                                className={`absolute right-0 z-10 mt-2 w-40 rounded-lg border text-sm font-medium shadow-xl ${
                                  isDark
                                    ? "bg-gray-800 text-gray-200 border-gray-700"
                                    : "bg-white text-gray-700 border-gray-200"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRescheduleModal({ isOpen: true, appointment });
                                    setOpenActionsMenu(null);
                                  }}
                                  disabled={isProcessing}
                                  className={`flex w-full items-center gap-2 px-4 py-2 transition-colors ${
                                    isProcessing
                                      ? isDark
                                        ? "text-gray-600 cursor-not-allowed opacity-50"
                                        : "text-gray-400 cursor-not-allowed opacity-50"
                                      : isDark
                                      ? "hover:bg-gray-700"
                                      : "hover:bg-gray-100"
                                  }`}
                                >
                                  <CalendarClock className="w-4 h-4" />
                                  Reschedule
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCancel(appointment);
                                    setOpenActionsMenu(null);
                                  }}
                                  disabled={isProcessing}
                                  className={`flex w-full items-center gap-2 px-4 py-2 transition-colors ${
                                    isProcessing
                                      ? isDark
                                        ? "text-gray-600 cursor-not-allowed opacity-50"
                                        : "text-gray-400 cursor-not-allowed opacity-50"
                                      : isDark
                                      ? "hover:bg-gray-700 text-red-400"
                                      : "hover:bg-gray-100 text-red-600"
                                  }`}
                                >
                                  <CalendarX className="w-4 h-4" />
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                      {/* Footer - Metadata */}
                      <div className={`mt-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-4">
                            {appointment.cal_event_id && (
                              <span className={isDark ? "text-gray-500" : "text-gray-500"}>
                                Event ID: {appointment.cal_event_id}
                              </span>
                            )}
                            {appointment.created_at && (
                              <span className={isDark ? "text-gray-500" : "text-gray-500"}>
                                Created: {formatDateTime(appointment.created_at).date}
                              </span>
                            )}
                          </div>
                          {appointment.updated_at && appointment.updated_at !== appointment.created_at && (
                            <span className={isDark ? "text-gray-500" : "text-gray-500"}>
                              Updated: {formatDateTime(appointment.updated_at).date}
                            </span>
                          )}
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
      alert("Please select both start and end times");
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
            Select new date and time for the meeting with {appointment.lead_name || appointment.attendee_name || "this lead"}
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
                  ? "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  : "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
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

