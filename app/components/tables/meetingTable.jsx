 "use client";

 import { useState, useEffect } from "react";
 import useSWR from "swr";
 import { useTheme } from "../../context/themeContext";
 import { format, parseISO, isValid } from "date-fns";
import { Copy, Video, Check } from "lucide-react";
import toast from "react-hot-toast";
import { mutate as globalMutate } from "swr";
import { useRouter } from "next/navigation";

 // Minimal bookings-only meetings table component.
 // Shows: Invitee Info, Meeting Timing, Meeting Type, Status, Meeting Link.

 const fetchBookings = async () => {
   const res = await fetch("/api/bookings");
   if (!res.ok) return [];
   const data = await res.json();
   return Array.isArray(data) ? data : data?.data || [];
 };

 function formatBookingDateTime(dateString) {
   if (!dateString) return { date: "N/A", time: "" };
   try {
     const d = parseISO(dateString);
     if (!isValid(d)) return { date: "Invalid Date", time: "" };
     return { date: format(d, "MMM dd, yyyy"), time: format(d, "h:mm a") };
   } catch {
     return { date: "N/A", time: "" };
   }
 }

 function getBookingDisplayStatus(booking) {
   const completion =
     booking.meeting_completion_status === true ||
     String(booking.meeting_completion_status || "").toLowerCase() === "completed";
   if (completion) return "conducted";
   if (booking.is_rescheduled) return "rescheduled";
   if (booking.status === "scheduled") return "booked";
   return booking.status || "unknown";
 }

 export default function MeetingTable() {
  const { theme } = useTheme();
   const isDark = theme === "dark";
  const router = useRouter();
 
  // Small component to show latest meeting-type note for a lead
  function NotePreview({ leadId }) {
    const fetcher = async (url) => {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.data || [];
    };
    const { data: notes = [] } = useSWR(leadId ? `/api/lead-notes?lead_id=${leadId}` : null, fetcher, { revalidateOnFocus: false });
    const meetingNotes = Array.isArray(notes) ? notes.filter((n) => String(n.notes_type || n.notes_type === n.notes_type).toLowerCase() === "meeting" || String(n.notes_type || "").toLowerCase() === "meeting") : [];
    const latest = meetingNotes && meetingNotes.length > 0 ? meetingNotes[0] : null;
    if (!leadId) return null;
    return (
      <div className={`max-w-[220px] text-right ${isDark ? "text-gray-300" : "text-gray-600"} text-xs`}>
        {latest ? <div className="truncate">{latest.notes}</div> : <div className="opacity-60">No meeting notes</div>}
      </div>
    );
  }
  const { data: bookings = [], error: bookingsError, isLoading: bookingsLoading, mutate } = useSWR(
    "bookings",
    fetchBookings,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  const [copiedId, setCopiedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("booked");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // default page size (can be 12 or 15)
  const itemsPerPage = pageSize;
  const [processingId, setProcessingId] = useState(null);
  const [refreshingMeetings, setRefreshingMeetings] = useState(false);
  const [openActionId, setOpenActionId] = useState(null);
 
  useEffect(() => {
    if (!openActionId) return;
    const handleOutsideClick = (e) => {
      // if click is not inside the opened action root, close it
      const target = e.target;
      if (!target) return;
      if (!target.closest || !document) return;
      const inside = target.closest(`[data-action-root="${openActionId}"]`);
      if (!inside) setOpenActionId(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openActionId]);
  // compute counts for header pills
  const statusCounts = {
    all: Array.isArray(bookings) ? bookings.length : 0,
    booked: Array.isArray(bookings)
      ? bookings.filter((b) => {
          const s = getBookingDisplayStatus(b);
          return s === "booked" || s === "rescheduled";
        }).length
      : 0,
    conducted: Array.isArray(bookings) ? bookings.filter((b) => getBookingDisplayStatus(b) === "conducted").length : 0,
    rescheduled: Array.isArray(bookings) ? bookings.filter((b) => getBookingDisplayStatus(b) === "rescheduled").length : 0,
    cancelled: Array.isArray(bookings) ? bookings.filter((b) => getBookingDisplayStatus(b) === "cancelled").length : 0,
  };

  const bookingsToShow = Array.isArray(bookings)
    ? bookings.filter((b) => {
        if (statusFilter === "all") return true;
        const s = getBookingDisplayStatus(b);
        if (statusFilter === "booked") return s === "booked" || s === "rescheduled";
        return s === statusFilter;
      })
    : [];

  const totalPages = Math.max(1, Math.ceil(bookingsToShow.length / itemsPerPage));

  // reset page when filter or bookings change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, bookings, pageSize]);
  // Sort bookings: upcoming (future) meetings first (ascending), then past meetings (most recent first)
  const bookingsSorted = [...bookingsToShow].sort((a, b) => {
    const now = Date.now();
    const aTime = a.start_time ? new Date(a.start_time).getTime() : a.start ? new Date(a.start).getTime() : a.startTime ? new Date(a.startTime).getTime() : 0;
    const bTime = b.start_time ? new Date(b.start_time).getTime() : b.start ? new Date(b.start).getTime() : b.startTime ? new Date(b.startTime).getTime() : 0;

    const aIsFuture = aTime > now;
    const bIsFuture = bTime > now;

    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;

    if (aIsFuture && bIsFuture) return aTime - bTime; // nearest upcoming first

    // both past => most recent first
    return bTime - aTime;
  });

  const meetingsToRender = bookingsSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

   const handleCopy = async (e, url, id) => {
     e?.stopPropagation();
     if (!url || !navigator?.clipboard) return;
     try {
       await navigator.clipboard.writeText(url);
       setCopiedId(id);
       setTimeout(() => setCopiedId(null), 1800);
     } catch {
       // ignore
     }
   };

  // Cancel booking
  const handleCancelBooking = async (e, booking) => {
    e.stopPropagation();
    if (!booking?.id) return;
    if (!confirm(`Are you sure you want to cancel the meeting with ${booking.invitee_name || booking.name || "this invitee"}?`)) return;
    setProcessingId(booking.id);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to cancel booking");
      toast.success("Booking cancelled");
      mutate();
      globalMutate("leads");
    } catch (err) {
      toast.error(err.message || "Failed to cancel booking");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkCompleted = async (e, booking) => {
    e.stopPropagation();
    if (!booking?.id && !booking?._id) return;
    if (processingId) return;
    setProcessingId(booking.id || booking._id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id || booking._id, meeting_completion_status: true }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to mark completed");
      toast.success("Meeting marked as completed");
      setOpenActionId(null);
      mutate();
      globalMutate("leads");
    } catch (err) {
      toast.error(err.message || "Failed to mark meeting completed");
    } finally {
      setProcessingId(null);
    }
  };

  // Reschedule modal state & handlers
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, booking: null, start: "", end: "" });

  const openRescheduleModal = (e, booking) => {
    e.stopPropagation();
    const tz = booking.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const startVal = booking.start_time ? new Date(booking.start_time) : booking.start ? new Date(booking.start) : null;
    const endVal = booking.end_time ? new Date(booking.end_time) : booking.end ? new Date(booking.end) : null;
    const toInput = (d) => {
      if (!d) return "";
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };
    setRescheduleModal({ isOpen: true, booking, start: toInput(startVal), end: toInput(endVal) });
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    const { booking, start, end } = rescheduleModal;
    if (!booking || !start || !end) {
      toast.error("Please select start and end times");
      return;
    }
    setProcessingId(booking.id);
    try {
      const res = await fetch("/api/bookings/reschedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, start: new Date(start).toISOString(), end: new Date(end).toISOString(), timezone: booking.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to reschedule booking");
      toast.success("Booking rescheduled");
      setRescheduleModal({ isOpen: false, booking: null, start: "", end: "" });
      mutate();
      globalMutate("leads");
    } catch (err) {
      toast.error(err.message || "Failed to reschedule booking");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="">
      <div className={`h-[calc(100vh-80px)] mt-4 mb-5 rounded-xl shadow-2xs overflow-hidden flex flex-col ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
        <div className={`px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-4">
            <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"} hidden md:block`}>Filter by Status:</div>
            <div className="inline-flex items-center gap-2 flex-wrap">
              {[
                { id: "booked", label: "Booked" },
                { id: "conducted", label: "Conducted" },
                { id: "rescheduled", label: "Rescheduled" },
                { id: "cancelled", label: "Cancelled" },
                { id: "all", label: "All" },
              ].map((pill) => {
                const active = statusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setStatusFilter(pill.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 transition-colors ${
                      active
                        ? "bg-orange-500 text-white"
                        : isDark
                        ? "bg-gray-800 text-gray-300"
                        : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${active ? "bg-white/20" : isDark ? "bg-gray-700 text-gray-300" : "bg-white text-gray-700"}`}>
                      {pill.id === "all" ? statusCounts.all : statusCounts[pill.id] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className={`text-xs ${isDark ? "text-gray-300" : "text-gray-600"} hidden sm:block`}>Per page:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={`text-sm rounded-md p-1 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white border border-gray-200 text-gray-700"}`}
              >
                <option value={12}>12</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>
            <button
              onClick={() => {
                setRefreshingMeetings(true);
                mutate().finally(() => setRefreshingMeetings(false));
              }}
              title="Refresh"
              className={`p-2 rounded-md ${isDark ? "bg-gray-800 text-gray-300" : "bg-white border border-gray-200 text-gray-700"}`}
            >
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  color="currentColor"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`${refreshingMeetings ? "animate-spin" : ""}`}
                >
                  <path d="M20.4879 15C19.2524 18.4956 15.9187 21 12 21C7.02943 21 3 16.9706 3 12C3 7.02943 7.02943 3 12 3C15.7292 3 18.9286 5.26806 20.2941 8.5" />
                  <path d="M15 9H18C19.4142 9 20.1213 9 20.5607 8.56066C21 8.12132 21 7.41421 21 6V3" />
                </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[100vh] overflow-auto">
          <table className={`min-w-full divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
            <thead className={`${isDark ? "bg-[#262626] text-gray-300" : "bg-gray-50"}`}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Invitee Info</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Meeting Timing</th>
              {/* <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Meeting Mode</th> */}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Meeting Link</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Meeting Notes</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
              {bookingsLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-500">Loading meetings…</td>
                </tr>
              ) : bookingsError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-red-500">Error loading meetings.</td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-500">No meetings found.</td>
                </tr>
              ) : (
                meetingsToRender.map((b) => {
                  const dt = formatBookingDateTime(b.start_time || b.start || b.startTime);
                  const status = getBookingDisplayStatus(b);
                  const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
                  const rowKey = b.id || b._id || `${b.invitee_email}-${b.start_time}`;
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => {
                        // navigate to meeting detail page
                        if (b.id || b._id) router.push(`/appointments/${b.id || b._id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (b.id || b._id)) router.push(`/appointments/${b.id || b._id}`);
                      }}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer ${isDark ? "dark:hover:bg-gray-100/5 hover:bg-gray-100/50" : "hover:bg-gray-100/50"}`}
                    >
                      <td className="px-6 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-900"}`}>{b.invitiee_contact_name || b.name || "—"}</span>
                          { (b.invitee_name || b.organizer_name || b.inviter_name || "") ? (
                            <span className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{b.invitee_name || b.organizer_name || b.inviter_name || ""}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-3 align-middle">
                        <div className="text-sm font-medium">{dt.date}</div>
                        <div className="text-xs text-gray-400">{dt.time}</div>
                      </td>
                      {/* <td className="px-6 py-3 align-top text-sm">Gmeet</td> */}
                      <td className="px-6 py-3 align-middle text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            status === "conducted"
                              ? (isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700")
                              : status === "booked"
                              ? (isDark ? "bg-purple-900/30 text-purple-300" : "bg-purple-100 text-purple-700")
                              : status === "rescheduled"
                              ? (isDark ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-100 text-yellow-700")
                              : status === "cancelled"
                              ? (isDark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700")
                              : (isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-700")
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3 align-middle text-sm text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                         

                          {(() => {
                            const url = b.join_url || b.url || b.meeting_link || "";
                            return (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={(e) => handleCopy(e, url, b.id)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleCopy(e, url, b.id); }}
                                className={`group inline-flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer select-none ${isDark ? "bg-green-900/10 text-green-300" : "bg-green-50 text-green-700"}`}
                                title={url || "No meeting link"}
                              >
                                <Video className="w-4 h-4" />
                                <span className="text-sm">{copiedId === b.id ? "Copied" : "Join"}</span>
                                <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-3 align-middle text-sm text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                         

                         {(() => {
                          return (
                            <div>
                              <NotePreview leadId={b.lead_id} />
                            </div>
                          );
                         })()}  
                        </div>
                      </td>
                      <td className="px-6 py-3 align-middle text-sm text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                          <div className="relative" data-action-root={b.id || b._id}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionId(openActionId === (b.id || b._id) ? null : (b.id || b._id));
                              }}
                              title="Actions"
                              className={`p-2 rounded-full border ${isDark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"} flex items-center justify-center`}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
                            </button>

                            {openActionId === (b.id || b._id) && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute right-0 mt-2 w-40 z-50 rounded-md shadow-lg ${isDark ? "bg-[#262626] border border-gray-700 text-gray-200" : "bg-white border border-gray-200 text-gray-800"}`}
                              >
                                <button
                                  onClick={(e) => handleMarkCompleted(e, b)}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-t-md ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                                >
                                  Mark as completed
                                </button>
                                <button
                                  onClick={(e) => {
                                    handleCancelBooking(e, b);
                                    setOpenActionId(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                                >
                                  Cancel meeting
                                </button>
                                <button
                                  onClick={(e) => {
                                    openRescheduleModal(e, b);
                                    setOpenActionId(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-b-md ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                                >
                                  Reschedule
                                </button>
                              </div>
                            )}
                          </div>
                         
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Reschedule Modal */}
        {rescheduleModal.isOpen && rescheduleModal.booking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className={`w-full max-w-md rounded-lg shadow-xl ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
              <div className={`p-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Reschedule Meeting</h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Select new start and end times</p>
              </div>
              <form onSubmit={submitReschedule} className="p-4 space-y-3">
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>New Start</label>
                  <input type="datetime-local" value={rescheduleModal.start} onChange={(e) => setRescheduleModal((p) => ({ ...p, start: e.target.value }))} required className="w-full p-2 rounded-md border" />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>New End</label>
                  <input type="datetime-local" value={rescheduleModal.end} onChange={(e) => setRescheduleModal((p) => ({ ...p, end: e.target.value }))} required className="w-full p-2 rounded-md border" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setRescheduleModal({ isOpen: false, booking: null, start: "", end: "" })} className="px-3 py-2 rounded-md border">{isDark ? "Cancel" : "Cancel"}</button>
                  <button type="submit" className="px-3 py-2 rounded-md bg-orange-500 text-white">Reschedule</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer - pagination */}
        <div className={`px-6 py-2 grid gap-3 md:flex md:justify-between md:items-center border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="inline-flex items-center gap-x-2">
            <p className={`text-sm ${isDark ? "text-gray-400/80" : "text-gray-600"}`}>
              Showing: {bookingsToShow.length > 0 ? ( (currentPage - 1) * itemsPerPage + 1 ) : 0} - {Math.min(currentPage * itemsPerPage, bookingsToShow.length)} of {bookingsToShow.length}
            </p>
          </div>

          <div>
            <div className="inline-flex gap-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg shadow-2xs focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none ${isDark
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
                  : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                Prev
              </button>

              <div className="flex items-center px-2 text-sm">
                <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>Page {currentPage} of {totalPages}</span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg shadow-2xs focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none ${isDark
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
                  : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
 }

 