import { useState, useEffect, useMemo } from "react";
import { getUserTimeZone, getDateRangeForNextDays, getLocalDateKey } from "../utils/dateUtils";

const DAYS_TO_FETCH = 25;

export function useSlots(eventType, selectedDate) {
    const [slots, setSlots] = useState([]);
    const [loading, setSlotsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch slots for next N days when event type is loaded
    useEffect(() => {
        async function fetchSlotsForNextDays() {
            if (!eventType) return;

            try {
                setSlotsLoading(true);
                setError(null);

                const userTimeZone = getUserTimeZone();
                const { startDateISO, endDateISO } = getDateRangeForNextDays(DAYS_TO_FETCH);

                console.log(`✅ Fetching slots for next ${DAYS_TO_FETCH} days`, { 
                    startDate: startDateISO, 
                    endDate: endDateISO 
                });

                const slotsUrl =
                    `/api/slots?eventTypeId=${eventType.id}` +
                    `&startDate=${encodeURIComponent(startDateISO)}` +
                    `&endDate=${encodeURIComponent(endDateISO)}` +
                    `&timezone=${encodeURIComponent(userTimeZone)}`;

                const response = await fetch(slotsUrl);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch slots");
                }

                const slotsData = await response.json();
                setSlots(slotsData);
            } catch (err) {
                setError(err.message);
                setSlots([]);
            } finally {
                setSlotsLoading(false);
            }
        }

        fetchSlotsForNextDays();
    }, [eventType]);

    // Filter slots by selected date using useMemo
    const filteredSlots = useMemo(() => {
        if (!selectedDate || slots.length === 0) return [];

        const userTimeZone = getUserTimeZone();

        // Filter slots that match the selected date
        return slots.filter(slot => {
            const slotDateKey = getLocalDateKey(slot.start, userTimeZone);
            return slotDateKey === selectedDate;
        });
    }, [slots, selectedDate]);

    // Function to remove a booked slot from the slots array
    const removeBookedSlot = (bookedSlotStart) => {
        setSlots(prevSlots => 
            prevSlots.filter(slot => slot.start !== bookedSlotStart)
        );
    };

    return { 
        slots, 
        filteredSlots,
        loading, 
        error,
        removeBookedSlot
    };
}

