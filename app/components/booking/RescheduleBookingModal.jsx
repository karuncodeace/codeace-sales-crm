"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Calendar from "../../book/[slug]/components/calender";
import SlotPicker from "../../book/[slug]/components/SlotPicker";
import BookingForm from "../../book/[slug]/components/BookingForm";
import { useSlots } from "../../book/[slug]/hooks/useSlots";
import { getLocalDateKey } from "../../book/[slug]/utils/dateUtils";

/**
 * Full reschedule flow: calendar + available slots (same as public book page) + prefilled form.
 */
export default function RescheduleBookingModal({ booking, onClose, onRescheduled, isDark }) {
  const [eventType, setEventType] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loadingEventType, setLoadingEventType] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (!booking?.event_type_id) {
      setLoadError("Booking is missing event type");
      setLoadingEventType(false);
      return;
    }
    let cancelled = false;
    setLoadingEventType(true);
    setLoadError(null);
    fetch(`/api/event-types?id=${encodeURIComponent(booking.event_type_id)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load event type");
        if (!cancelled) setEventType(data);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message || "Failed to load event type");
      })
      .finally(() => {
        if (!cancelled) setLoadingEventType(false);
      });
    return () => {
      cancelled = true;
    };
  }, [booking?.event_type_id]);

  // Prefill calendar + slot from existing booking
  useEffect(() => {
    if (!booking?.start_time) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedDate(getLocalDateKey(booking.start_time, tz));
    setSelectedSlot({
      start: booking.start_time,
      end: booking.end_time || booking.start_time,
    });
  }, [booking?.id, booking?.start_time, booking?.end_time]);

  const { filteredSlots, loading: slotsLoading, error: slotsError, refetchSlots } = useSlots(
    eventType,
    selectedDate
  );

  // If user changes calendar day, clear slot unless it still falls on that day
  useEffect(() => {
    if (!selectedDate || !selectedSlot?.start) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const slotDay = getLocalDateKey(selectedSlot.start, tz);
    if (slotDay !== selectedDate) {
      setSelectedSlot(null);
    }
  }, [selectedDate, selectedSlot]);

  const handleBookingSuccess = (data) => {
    toast.success("Booking rescheduled");
    onRescheduled?.(data);
    onClose();
  };

  const handleSlotUnavailable = () => {
    refetchSlots();
    setSelectedSlot(null);
  };

  if (!booking) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className={`my-4 w-full max-w-6xl rounded-xl shadow-xl ${
          isDark ? "bg-[#1a1a1a] border border-gray-700" : "bg-white border border-gray-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-start justify-between gap-4 border-b px-4 py-3 md:px-6 ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Reschedule meeting
            </h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Pick a new time. Your booking details are prefilled below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
              isDark ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4 md:p-6">
          {loadError && (
            <p className={`mb-4 text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>{loadError}</p>
          )}

          {loadingEventType && !loadError && (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          )}

          {!loadingEventType && eventType && !loadError && (
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              <div className="w-full shrink-0 lg:w-[42%]">
                <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0">
                <div className="pb-2">
                  <label
                    className={`mb-3 block text-base font-bold ${isDark ? "text-white" : "text-gray-800"}`}
                  >
                    Available times
                  </label>
                  {slotsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-12 rounded-md animate-pulse ${
                            isDark ? "bg-[#262626]" : "bg-gray-100"
                          }`}
                        />
                      ))}
                    </div>
                  ) : slotsError ? (
                    <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>
                      {slotsError}
                    </p>
                  ) : filteredSlots.length === 0 ? (
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      No slots for this date. Choose another day on the calendar.
                    </p>
                  ) : (
                    <SlotPicker
                      slots={filteredSlots}
                      selectedSlot={selectedSlot}
                      onSelectSlot={setSelectedSlot}
                    />
                  )}
                </div>
                <div
                  className={`mt-8 border-t pt-8 ${
                    isDark ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <BookingForm
                    eventType={eventType}
                    selectedSlot={selectedSlot}
                    bookingToReschedule={booking}
                    slug={eventType.slug}
                    embeddedInModal
                    onBookingSuccess={handleBookingSuccess}
                    onSlotUnavailable={handleSlotUnavailable}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
