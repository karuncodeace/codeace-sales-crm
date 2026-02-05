"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Video, 
  ExternalLink,
  Phone,
  Building2,
  FileText,
  MessageSquare,
  MapPin,
  Globe,
  CalendarClock,
  UserCircle
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import toast from "react-hot-toast";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bookingId = params.id;

  // Fetch booking details
  const { data: bookingData, error: bookingError, isLoading: bookingLoading, mutate } = useSWR(
    bookingId ? `/api/bookings/${bookingId}` : null,
    fetcher
  );

  // Fetch lead notes if lead_id exists
  const leadId = bookingData?.lead_id;
  const { data: leadNotesData } = useSWR(
    leadId ? `/api/lead-notes?lead_id=${leadId}` : null,
    fetcher
  );

  // Fetch task activities if lead_id exists
  const { data: taskActivitiesData } = useSWR(
    leadId ? `/api/task-activities?lead_id=${leadId}` : null,
    fetcher
  );

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
        dateTime: format(date, "yyyy-MM-dd HH:mm"),
        day: format(date, "EEEE"),
      };
    } catch (err) {
      return { date: "N/A", time: "N/A", full: "N/A", dateTime: "N/A", day: "N/A" };
    }
  };

  // Get display status
  const getDisplayStatus = (booking) => {
    if (!booking) return "unknown";
    // Check if meeting_completion_status is true (boolean) or "completed" (legacy text)
    const completion = booking.meeting_completion_status === true || 
                       String(booking.meeting_completion_status || "").toLowerCase() === "completed";
    if (completion) return "conducted";
    if (booking.is_rescheduled) return "rescheduled";
    if (booking.status === "scheduled") return "booked";
    return booking.status || "unknown";
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold";
    switch (status) {
      case "conducted":
        return `${baseClasses} ${isDark ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-green-50 text-green-700 border border-green-200"}`;
      case "booked":
        return `${baseClasses} ${isDark ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-blue-50 text-blue-700 border border-blue-200"}`;
      case "rescheduled":
        return `${baseClasses} ${isDark ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`;
      case "cancelled":
        return `${baseClasses} ${isDark ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-red-50 text-red-700 border border-red-200"}`;
      default:
        return `${baseClasses} ${isDark ? "bg-gray-800 text-gray-400 border border-gray-700" : "bg-gray-100 text-gray-700 border border-gray-300"}`;
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

  // Combine and sort notes
  const allNotes = () => {
    const notes = [];
    
    // Add notes from leads_notes
    if (leadNotesData && Array.isArray(leadNotesData)) {
      leadNotesData.forEach((note) => {
        notes.push({
          id: note.id,
          content: note.notes,
          type: note.notes_type || "general",
          createdAt: note.created_at,
          source: "leads_notes",
        });
      });
    }

    // Add notes from task_activities
    if (taskActivitiesData && Array.isArray(taskActivitiesData)) {
      taskActivitiesData
        .filter((activity) => activity.type === "note" || activity.notes)
        .forEach((activity) => {
          notes.push({
            id: activity.id,
            content: activity.notes || activity.description || "",
            type: activity.notes_type || "general",
            createdAt: activity.created_at,
            source: "task_activities",
          });
        });
    }

    // Sort by created_at (newest first)
    return notes.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  };

  const latestNotes = allNotes().slice(0, 5); // Get latest 5 notes

  if (bookingLoading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${isDark ? "border-orange-500" : "border-orange-600"}`}></div>
          <p className={`mt-4 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Loading booking details...
          </p>
        </div>
      </div>
    );
  }

  if (bookingError || !bookingData) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"} flex items-center justify-center px-4`}>
        <div className="text-center max-w-md">
          <XCircle className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-600"}`} />
          <h1 className={`text-2xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Booking Not Found
          </h1>
          <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mb-4`}>
            {bookingError?.message || "The booking you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => router.push("/appointments")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDark
                ? "bg-orange-600 hover:bg-orange-700 text-white"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  const booking = bookingData;
  const lead = booking.lead || null;
  const startTime = formatDateTime(booking.start_time);
  const endTime = formatDateTime(booking.end_time);
  const displayStatus = getDisplayStatus(booking);

  return (
    <div className={`min-h-screen`}>
      <div className="pl-5 md:pl-0 2xl:pl-0 w-full mt-8">
        {/* Professional Header */}
        <div className={`pb-6`}>
          <button
            onClick={() => router.push("/appointments")}
            className={`flex items-center gap-2 mb-6 text-sm font-medium transition-colors hover:gap-3 ${
              isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bookings
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                  <Calendar className={`w-6 h-6 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                </div>
                <div>
                  <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Booking Details
                  </h1>
                  <p className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    ID: {booking.id}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={getStatusBadge(displayStatus)}>
                {getStatusIcon(displayStatus)}
                {displayStatus?.charAt(0).toUpperCase() + displayStatus?.slice(1) || "Unknown"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Schedule Card */}
            <div className={`rounded-xl border ${isDark ? "bg-[#262626] border-gray-700/50" : "bg-white border-gray-200"} shadow-sm overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700/50 bg-gray-800/30" : "border-gray-200 bg-gray-50/50"}`}>
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Meeting Schedule
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Time */}
                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800/50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                        <Clock className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Start Time
                      </span>
                    </div>
                    <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {startTime.time}
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      {startTime.day}, {startTime.date}
                    </p>
                  </div>

                  {/* End Time */}
                  {endTime.full !== "N/A" && (
                    <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800/50" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
                          <Clock className={`w-4 h-4 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                        </div>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          End Time
                        </span>
                      </div>
                      <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {endTime.time}
                      </p>
                      <p className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {endTime.date}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timezone */}
                {booking.timezone && (
                  <div className={`mt-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="flex items-center gap-2">
                      <Globe className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                      <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Timezone: <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{booking.timezone}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attendee Information Card */}
            {(booking.invitee_name || booking.invitee_email) && (
              <div className={`rounded-xl border ${isDark ? "bg-[#262626] border-gray-700/50" : "bg-white border-gray-200"} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700/50 bg-gray-800/30" : "border-gray-200 bg-gray-50/50"}`}>
                  <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Attendee Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                      <UserCircle className={`w-6 h-6 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                    </div>
                    <div className="flex-1">
                      {booking.invitee_name && (
                        <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                          {booking.invitee_name}
                        </h3>
                      )}
                      {booking.invitee_email && (
                        <div className="flex items-center gap-2">
                          <Mail className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                          <a
                            href={`mailto:${booking.invitee_email}`}
                            className={`text-sm font-medium hover:underline ${isDark ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}`}
                          >
                            {booking.invitee_email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meeting Link */}
                  {booking.meeting_link && (
                    <div className={`mt-6 pt-6 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      <a
                        href={booking.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                          isDark
                            ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20"
                            : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                        }`}
                      >
                        <Video className="w-5 h-5" />
                        Join Meeting
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lead Information Card (if available) */}
            {lead && (
              <div className={`rounded-xl border ${isDark ? "bg-[#262626] border-gray-700/50" : "bg-white border-gray-200"} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700/50 bg-gray-800/30" : "border-gray-200 bg-gray-50/50"}`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      Lead Information
                    </h2>
                    {lead.status && (
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                        isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                      }`}>
                        {lead.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Name */}
                    {lead.lead_name && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Company
                          </span>
                        </div>
                        <p className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {lead.lead_name}
                        </p>
                      </div>
                    )}

                    {/* Contact Name */}
                    {lead.contact_name && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Contact
                          </span>
                        </div>
                        <p className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {lead.contact_name}
                        </p>
                      </div>
                    )}

                    {/* Phone */}
                    {lead.phone && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Phone
                          </span>
                        </div>
                        <a
                          href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                          className={`text-base font-semibold hover:underline ${isDark ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}`}
                        >
                          {lead.phone}
                        </a>
                      </div>
                    )}

                    {/* Email */}
                    {lead.email && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Email
                          </span>
                        </div>
                        <a
                          href={`mailto:${lead.email}`}
                          className={`text-base font-semibold hover:underline ${isDark ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}`}
                        >
                          {lead.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* View Lead Button */}
                  {lead.id && (
                    <div className={`mt-6 pt-6 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      <button
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                          isDark
                            ? "bg-gray-700 hover:bg-gray-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        }`}
                      >
                        View Full Lead Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata Card */}
            <div className={`rounded-xl border ${isDark ? "bg-[#262626] border-gray-700/50" : "bg-white border-gray-200"} shadow-sm overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700/50 bg-gray-800/30" : "border-gray-200 bg-gray-50/50"}`}>
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Additional Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {booking.created_at && (
                    <div className="flex items-center gap-3">
                      <CalendarClock className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Created
                        </p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {formatDateTime(booking.created_at).full}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Latest Notes */}
          <div className="lg:col-span-1">
            <div className={`rounded-xl border ${isDark ? "bg-[#262626] border-gray-700/50" : "bg-white border-gray-200"} shadow-sm overflow-hidden sticky top-6`}>
              <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700/50 bg-gray-800/30" : "border-gray-200 bg-gray-50/50"}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                    <MessageSquare className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                  </div>
                  <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Latest Notes
                  </h2>
                </div>
              </div>
              <div className="p-6">
                {latestNotes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className={`p-4 rounded-full mx-auto mb-4 w-fit ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                      <MessageSquare className={`w-8 h-8 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                    </div>
                    <p className={`text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      No notes available
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                      Notes will appear here once added
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {latestNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-4 rounded-lg border transition-all ${
                          isDark 
                            ? "bg-gray-800/50 border-gray-700/50 hover:border-gray-600" 
                            : "bg-gray-50 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                              isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {note.type}
                          </span>
                          <span className={`text-xs font-medium ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                            {formatDateTime(note.createdAt).date}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {note.content || "No content"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {leadId && latestNotes.length > 0 && (
                  <div className={`mt-6 pt-6 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                    <button
                      onClick={() => router.push(`/leads/${leadId}`)}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        isDark
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                      }`}
                    >
                      View All Notes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
