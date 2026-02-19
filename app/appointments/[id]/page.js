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
  Check,
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
  // Handler: mark booking as completed (updates booking and leading to lead update via API)
  const handleMarkCompleted = async (bookingId) => {
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, meeting_completion_status: true }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to mark completed");
      toast.success("Meeting marked as completed");
      mutate();
      globalMutate("leads");
    } catch (err) {
      toast.error(err.message || "Failed to mark completed");
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0b0b0b]" : "bg-gray-50"} py-8`}>
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.push("/appointments")}
            className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} hover:underline`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bookings
          </button>
        </div>

        <div className="bg-transparent rounded-md">
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6`}>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                  <Calendar className={`w-6 h-6 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                </div>
                <div>
                  <h1 className={`text-3xl font-extrabold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                    {(() => {
                      const explicitTitle = booking.title || booking.event_title || booking.meeting_title;
                      const invitee = booking.invitee_name || booking.invitiee_contact_name || "Guest";
                      return explicitTitle ? explicitTitle : `Meeting with ${invitee}`;
                    })()}
                  </h1>
                  <div className="mt-1 text-sm text-gray-500">
                    Booking ID: <span className="font-medium text-gray-700">{booking.id}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={getStatusBadge(displayStatus)}>
                {getStatusIcon(displayStatus)}
                <span className="ml-2">{displayStatus?.charAt(0).toUpperCase() + displayStatus?.slice(1) || "Unknown"}</span>
              </span>

              <button
                onClick={() => handleMarkCompleted(booking.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md font-semibold ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-800 border border-gray-200"}`}
              >
                <Check className="w-4 h-4" />
                Mark Completed
              </button>

              {booking.meeting_link && (
                <a
                  href={booking.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white font-semibold shadow"
                >
                  <Video className="w-4 h-4" />
                  Join
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <main className="lg:col-span-2 space-y-6">
              {/* Schedule */}
              <section className={`rounded-xl ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} p-6 shadow-sm`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Meeting Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`${isDark ? "bg-gray-800/40" : "bg-gray-50"} p-4 rounded-lg`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                        <Clock className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                      </div>
                      <div className="text-xs font-semibold text-gray-500 uppercase">Start</div>
                    </div>
                    <div className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{startTime.time}</div>
                    <div className="text-sm text-gray-500 mt-1">{startTime.day}, {startTime.date}</div>
                  </div>

                  {endTime.full !== "N/A" && (
                    <div className={`${isDark ? "bg-gray-800/40" : "bg-gray-50"} p-4 rounded-lg`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
                          <Clock className={`w-4 h-4 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                        </div>
                        <div className="text-xs font-semibold text-gray-500 uppercase">End</div>
                      </div>
                      <div className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{endTime.time}</div>
                      <div className="text-sm text-gray-500 mt-1">{endTime.date}</div>
                    </div>
                  )}
                </div>

                {booking.timezone && (
                  <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Timezone: <span className="font-medium text-gray-700 ml-1">{booking.timezone}</span>
                  </div>
                )}
              </section>

              {/* Attendee */}
              {(booking.invitee_name || booking.invitee_email) && (
                <section className={`rounded-xl ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} p-6 shadow-sm`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Attendee</h3>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                      <UserCircle className={`w-8 h-8 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                    </div>
                    <div className="flex-1">
                      {booking.invitee_name && <div className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{booking.invitee_name}</div>}
                      { (booking.company || booking.organization || booking.company_name) && <div className="text-sm text-gray-500 mt-1">{booking.company || booking.organization || booking.company_name}</div>}
                      {booking.invitee_email && (
                        <a href={`mailto:${booking.invitee_email}`} className="text-sm text-orange-600 hover:underline mt-2 inline-block">
                          {booking.invitee_email}
                        </a>
                      )}
                    </div>
                    {booking.meeting_link && (
                      <a href={booking.meeting_link} target="_blank" rel="noreferrer" className="ml-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white font-semibold">
                        <Video className="w-4 h-4" /> Join Meeting
                      </a>
                    )}
                  </div>
                </section>
              )}

              {/* Lead Info */}
              {lead && (
                <section className={`rounded-xl ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} p-6 shadow-sm`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Lead Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lead.lead_name && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Company</div>
                        <div className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{lead.lead_name}</div>
                      </div>
                    )}
                    {lead.contact_name && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Contact</div>
                        <div className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{lead.contact_name}</div>
                      </div>
                    )}
                    {lead.phone && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Phone</div>
                        <a href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`} className={`font-semibold ${isDark ? "text-orange-400" : "text-orange-600"}`}>{lead.phone}</a>
                      </div>
                    )}
                    {lead.email && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Email</div>
                        <a href={`mailto:${lead.email}`} className={`font-semibold ${isDark ? "text-orange-400" : "text-orange-600"}`}>{lead.email}</a>
                      </div>
                    )}
                  </div>
                  {lead.id && <div className="mt-6"><button onClick={() => router.push(`/leads/${lead.id}`)} className={`px-4 py-2 rounded-md ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"}`}>View Full Lead Details</button></div>}
                </section>
              )}

            </main>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className={`rounded-xl ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} p-6 shadow-sm sticky top-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Latest Notes</h3>
                </div>
                {latestNotes.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">No notes available</div>
                ) : (
                  <div className="space-y-3">
                    {latestNotes.map((note) => (
                      <div key={note.id} className={`p-3 rounded-lg ${isDark ? "bg-gray-800/40" : "bg-gray-50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">{note.type}</span>
                          <span className="text-xs text-gray-500">{formatDateTime(note.createdAt).date}</span>
                        </div>
                        <div className="text-sm text-gray-600">{note.content || "No content"}</div>
                      </div>
                    ))}
                  </div>
                )}
                {leadId && latestNotes.length > 0 && <button onClick={() => router.push(`/leads/${leadId}`)} className={`mt-4 w-full px-4 py-2 rounded-md ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"}`}>View All Notes</button>}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
