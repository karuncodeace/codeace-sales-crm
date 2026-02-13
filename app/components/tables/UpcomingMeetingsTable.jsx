"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { Calendar, Clock, User, Video, ChevronRight, Copy } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function UpcomingMeetingsTable() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Fetch all bookings
  const { data: bookings, error, isLoading } = useSWR(
    `/api/bookings`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Normalize bookings to array
  const bookingsList = Array.isArray(bookings) ? bookings : [];

  // Filter and sort upcoming meetings
  const upcomingMeetings = bookingsList
    .filter((booking) => {
      // Only show scheduled meetings (not completed, cancelled, or rescheduled)
      const isScheduled = booking.status === "scheduled";
      const notCompleted = !booking.meeting_completion_status;
      const isFuture = booking.start_time && new Date(booking.start_time) > new Date();
      return isScheduled && notCompleted && isFuture;
    })
    .sort((a, b) => {
      // Sort by start time (earliest first)
      const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
      return aTime - bTime;
    })
    ; // Keep full list; we'll display the next 5 with a scrollable container

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return { date: "N/A", time: "N/A", day: "N/A" };
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return { date: "Invalid Date", time: "N/A", day: "N/A" };
      return {
        date: format(date, "MMM dd, yyyy"),
        time: format(date, "h:mm a"),
        day: format(date, "EEE"), // Short day name (Mon, Tue, etc.)
        full: format(date, "MMM dd, yyyy 'at' h:mm a"),
      };
    } catch (err) {
      return { date: "N/A", time: "N/A", day: "N/A" };
    }
  };

  // Get contact name with truncation
  const getContactName = (booking) => {
    const name = booking.invitiee_contact_name || booking.invitee_name || "Guest";
    return name.length > 20 ? name.substring(0, 20) + "..." : name;
  };

  // Copy link state & handler
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

  const CopyButton = ({ meetingLink, bookingId, isDark, visible }) => {
    if (!visible) return null;
    return (
      <button
        onClick={(e) => handleCopy(e, meetingLink, bookingId)}
        title="Copy meeting link"
        className={`ml-2 p-1 rounded-md text-xs inline-flex items-center justify-center transition-colors ${
          isDark ? "text-gray-400 hover:bg-gray-800/30" : "text-gray-500 hover:bg-gray-100"
        }`}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Copy className="w-4 h-4 opacity-90" />
        {copiedId === bookingId && <span className="ml-1 text-[11px] opacity-90">{`Copied`}</span>}
      </button>
    );
  };

  return (
    <div
      className={`rounded-xl border ${
        isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
      } shadow-sm overflow-hidden flex flex-col h-[430px] md:h-[390px] 2xl:h-[410px]`}
    >
      {/* Header */}
      <div
        className={`px-6 py-4 border-b ${
          isDark ? "border-gray-700 bg-gray-800/30" : "border-gray-200 bg-gray-50/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
              <Calendar className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Upcoming Meetings
              </h2>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Next {upcomingMeetings.length} scheduled meetings
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/appointments")}
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              isDark
                ? "text-orange-400 hover:text-orange-300"
                : "text-orange-600 hover:text-orange-700"
            }`}
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div
                className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${
                  isDark ? "border-orange-500" : "border-orange-600"
                }`}
              ></div>
              <p className={`mt-4 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Loading meetings...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>
              Error loading meetings
            </p>
          </div>
        ) : upcomingMeetings.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar
              className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
            />
            <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              No upcoming meetings
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              Schedule a meeting to see it here
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden max-h-[260px] overflow-y-auto">
          <table className="w-full min-w-full table-fixed">
            <thead>
              <tr className="text-xs font-medium uppercase tracking-wider">
                <th
                  className={`px-6 py-3 text-left sticky top-0 z-10 ${
                    isDark ? "bg-gray-800/50 text-gray-400" : "bg-gray-50 text-gray-600"
                  }`}
                  style={{ width: "40%" }}
                >
                  Contact
                </th>
                <th
                  className={`px-6 py-3 text-left sticky top-0 z-10 ${
                    isDark ? "bg-gray-800/50 text-gray-400" : "bg-gray-50 text-gray-600"
                  }`}
                  style={{ width: "22%" }}
                >
                  Date
                </th>
                <th
                  className={`px-6 py-3 text-left sticky top-0 z-10 ${
                    isDark ? "bg-gray-800/50 text-gray-400" : "bg-gray-50 text-gray-600"
                  }`}
                  style={{ width: "18%" }}
                >
                  Time
                </th>
                <th
                  className={`px-6 py-3 text-center sticky top-0 z-10 ${
                    isDark ? "bg-gray-800/50 text-gray-400" : "bg-gray-50 text-gray-600"
                  }`}
                  style={{ width: "64px" }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
              {upcomingMeetings.slice(0, 5).map((booking) => {
                const startTime = formatDateTime(booking.start_time);
                return (
                  <tr
                    key={booking.id}
                    onClick={() => router.push(`/appointments/${booking.id}`)}
                    className={`group transition-colors cursor-pointer align-middle ${
                      isDark
                        ? "hover:bg-gray-800/50 text-gray-300"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {/* Contact Name */}
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            isDark ? "bg-blue-500/20" : "bg-blue-100"
                          }`}
                        >
                          <User
                            className={`w-4 h-4 ${
                              isDark ? "text-blue-400" : "text-blue-600"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate min-w-0 ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {getContactName(booking)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-0 py-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Calendar
                          className={`w-4 h-4 ${
                            isDark ? "text-gray-500" : "text-gray-400"
                          }`}
                        />
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {startTime.date}
                          </p>
                          
                        </div>
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-2 py-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Clock
                          className={`w-4 h-4 ${
                            isDark ? "text-gray-500" : "text-gray-400"
                          }`}
                        />
                        <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {startTime.time}
                        </p>
                      </div>
                    </td>

                    {/* Action - Meeting Link */}
                    <td className="px-4 py-4 text-center align-middle">
                      {booking.meeting_link ? (
                        <div
                          className="inline-flex items-center justify-center"
                        >
                          <a
                            href={booking.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={() => setHoveredBookingId(booking.id)}
                            onMouseLeave={() => setHoveredBookingId((id) => (id === booking.id ? null : id))}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isDark
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            <Video className="w-3.5 h-3.5" />
                            Join
                          </a>
                          <CopyButton
                            meetingLink={booking.meeting_link}
                            bookingId={booking.id}
                            isDark={isDark}
                            visible={hoveredBookingId === booking.id}
                          />
                        </div>
                      ) : (
                        <span className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                          No link
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {upcomingMeetings.length > 0 && (
        <div
          className={`px-6 py-3 border-t ${
            isDark ? "border-gray-700 bg-gray-800/30" : "border-gray-200 bg-gray-50/50"
          }`}
        >
          <p className={`text-xs text-center ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Showing next {upcomingMeetings.length} meetings • Click any row to view details
          </p>
        </div>
      )}
    </div>
  );
}
