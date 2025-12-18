"use client";

export default function SlotPicker({ slots, selectedSlot, onSelectSlot }) {
  // Safety check: ensure slots is an array
  if (!slots || !Array.isArray(slots)) {
    return (
      <p className="text-gray-500 text-sm py-4">
        No time slots available.
      </p>
    );
  }

  // Working hours constants (local time)
  const WORK_START_MINUTES = 10 * 60; // 10:00 AM
  const WORK_END_MINUTES = 17 * 60;   // 5:00 PM
  const SLOT_DURATION = 30;           // minutes

  // Get user's local timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Check if slot is within working hours (using local time)
  const isWithinWorkingHours = (isoString) => {
    // Parse the UTC ISO string
    const utcDate = new Date(isoString);
    
    // Use Intl to get hours and minutes in user's timezone (24-hour format)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimeZone,
      hour: "numeric",  // Use numeric instead of 2-digit for better compatibility
      minute: "2-digit",
      hour12: false,
    });
    
    const parts = formatter.formatToParts(utcDate);
    const hourPart = parts.find(p => p.type === "hour");
    const minutePart = parts.find(p => p.type === "minute");
    
    if (!hourPart || !minutePart) {
      // Fallback: manually calculate time in user's timezone
      // Create a formatter that gives us the time components
      const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimeZone,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });
      const timeString = timeFormatter.format(utcDate);
      const [hours, minutes] = timeString.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;
      return (
        totalMinutes >= WORK_START_MINUTES &&
        totalMinutes + SLOT_DURATION <= WORK_END_MINUTES
      );
    }
    
    const hours = parseInt(hourPart.value, 10);
    const minutes = parseInt(minutePart.value, 10);
    const totalMinutes = hours * 60 + minutes;

    // Check if slot start and end are within working hours
    const isValid = (
      totalMinutes >= WORK_START_MINUTES &&
      totalMinutes + SLOT_DURATION <= WORK_END_MINUTES
    );
    
    return isValid;
  };

  // Filter slots by working hours BEFORE grouping
  // TODO: Set ENABLE_WORKING_HOURS_FILTER to false to temporarily disable filter for debugging
  const ENABLE_WORKING_HOURS_FILTER = true;
  
  // Debug: Log slot times to understand what's happening
  if (slots.length > 0) {
    console.log('=== Slot Debug Info ===');
    console.log('User Timezone:', userTimeZone);
    console.log('Working Hours:', '10:00 AM - 5:00 PM (600-1020 minutes)');
    console.log('Total slots received:', slots.length);
    
    // Show first 10 slots and their conversion
    slots.slice(0, 10).forEach((slot, idx) => {
      const utcDate = new Date(slot.start);
      const localTime = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(utcDate);
      
      // Get 24-hour format for calculation
      const formatter24 = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimeZone,
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      });
      const parts = formatter24.formatToParts(utcDate);
      const hours = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
      const minutes = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
      const totalMinutes = hours * 60 + minutes;
      
      const isInRange = isWithinWorkingHours(slot.start);
      console.log(`Slot ${idx + 1}:`, {
        UTC: slot.start,
        Local: localTime,
        '24h': `${hours}:${String(minutes).padStart(2, '0')}`,
        'Minutes': totalMinutes,
        'InRange': isInRange,
        'Reason': isInRange ? 'OK' : (totalMinutes < 600 ? 'Before 10 AM' : 'After 5 PM')
      });
    });
    
    // Find slots that ARE in range
    const inRangeSlots = slots.filter(slot => isWithinWorkingHours(slot.start));
    console.log(`Slots in working hours: ${inRangeSlots.length} out of ${slots.length}`);
    
    // Show earliest and latest slots
    if (slots.length > 0) {
      const sortedSlots = [...slots].sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      const earliest = sortedSlots[0];
      const latest = sortedSlots[sortedSlots.length - 1];
      
      const formatSlot = (slot) => {
        const localTime = new Intl.DateTimeFormat("en-US", {
          timeZone: userTimeZone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date(slot.start));
        return `${slot.start} → ${localTime} IST`;
      };
      
      console.log('Earliest slot:', formatSlot(earliest));
      console.log('Latest slot:', formatSlot(latest));
    }
    
    if (inRangeSlots.length > 0) {
      console.log('Example in-range slots:');
      inRangeSlots.slice(0, 3).forEach((slot, idx) => {
        const localTime = new Intl.DateTimeFormat("en-US", {
          timeZone: userTimeZone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date(slot.start));
        console.log(`  ${idx + 1}. ${slot.start} → ${localTime} IST`);
      });
    } else {
      console.warn('⚠️ NO SLOTS IN WORKING HOURS!');
      console.warn('All slots are outside 10:00 AM - 5:00 PM IST');
      console.warn('This means the backend is generating slots for a different timezone.');
      console.warn('Expected UTC range for 10 AM - 5 PM IST: 4:30 AM - 11:30 AM UTC');
    }
  }
  
  const filteredSlots = ENABLE_WORKING_HOURS_FILTER 
    ? slots.filter(slot => isWithinWorkingHours(slot.start))
    : slots;
  
  if (slots.length > 0 && process.env.NODE_ENV === 'development') {
    console.log('Filtered slots:', filteredSlots.length);
  }

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

  // Show message if slots exist but all are filtered out
  if (slots.length > 0 && filteredSlots.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">
        No slots available within working hours (10:00 AM - 5:00 PM).
      </p>
    );
  }

  // Show message if no slots at all
  if (filteredSlots.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">
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
                    px-4 py-2 text-sm font-medium rounded-md  transition-all
                    ${
                      isSlotSelected(slot)
                        ? "bg-orange-500 border-gray-800 shadow-sm text-white"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 "
                    }
                  `}
                >
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

