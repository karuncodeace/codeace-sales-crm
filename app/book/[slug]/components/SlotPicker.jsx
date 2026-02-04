"use client";

import { useTheme } from "../../../context/themeContext";

export default function SlotPicker({ slots, selectedSlot, onSelectSlot }) {
  const { theme } = useTheme();
  // Safety check: ensure slots is an array
  if (!slots || !Array.isArray(slots)) {
    return (
      <p className={`${theme === "light" ? "text-gray-500" : "text-gray-500"} text-sm py-4`}>
        No time slots available.
      </p>
    );
  }

  // Get user's local timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // CRITICAL FIX: Removed hardcoded working hours filter
  // The backend already handles:
  // - Working hours from database (start_time/end_time in UTC)
  // - Past slot filtering
  // - Booked slot filtering
  // - Timezone conversion
  // Frontend should trust the backend and display all slots it provides
  // 
  // Previous bug: WORK_END_MINUTES = 17 * 60 (5:00 PM) was filtering out slots after 4:30 PM IST
  // Backend generates slots until 15:30 UTC (9:00 PM IST), so frontend should display them all
  
  const filteredSlots = slots; // Display all slots from backend - no frontend filtering

  // Get local date key for grouping (YYYY-MM-DD format in user's timezone)
  const getLocalDateKey = (isoString) => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(isoString));
  };

  // Format date label for display (e.g., "Thu, Dec 18")
  const formatDateLabel = (isoString) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: userTimeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(isoString));
  };

  // Format time in user's local timezone
  const formatTime = (isoString) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: userTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));
  };

  // Group filtered slots by local date key
  const slotsByDate = filteredSlots.reduce((acc, slot) => {
    const dateKey = getLocalDateKey(slot.start);
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    
    acc[dateKey].push(slot);
    return acc;
  }, {});

  const isSlotSelected = (slot) => {
    return selectedSlot && selectedSlot.start === slot.start;
  };

  // Show message if no slots at all (shouldn't happen if backend is working correctly)
  if (slots.length === 0) {
    return (
      <p className={`${theme === "light" ? "text-gray-500" : "text-gray-500"} text-sm py-4`}>
        No time slots available.
      </p>
    );
  }

  // Show message if no slots at all
  if (filteredSlots.length === 0) {
    return (
      <p className={`${theme === "light" ? "text-gray-500" : "text-gray-500"} text-sm py-4`}>
        No time slots available.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(slotsByDate).map(([dateKey, dateSlots]) => {
        // Use the first slot in the group to get the date label
        const dateLabel = formatDateLabel(dateSlots[0].start);
        
        return (
          <div key={dateKey}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 ">
              {dateSlots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => onSelectSlot(slot)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md  transition-all cursor-pointer flex items-center justify-center gap-2 
                    ${
                      isSlotSelected(slot)
                        ? `${theme === "light" ? "bg-orange-500 border-gray-800 shadow-sm text-white" : "bg-orange-500 border-gray-800 shadow-sm text-white"}`
                        : `${theme === "light" ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 " : "bg-[#262626] border-gray-700 text-white hover:bg-gray-700 "}`
                    }
                  `}
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  {formatTime(slot.start)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

