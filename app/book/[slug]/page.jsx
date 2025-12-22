"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SlotPicker from "./components/SlotPicker";
import BookingForm from "./components/BookingForm";
import Success from "./components/Success";
import Calendar from "./components/calender";
import { useEventType } from "./hooks/useEventType";
import { useSlots } from "./hooks/useSlots";
import { getTodayDateString } from "./utils/dateUtils";
import { useTheme } from "../../context/themeContext";

export default function BookingPage() {
    const { theme } = useTheme();
    const params = useParams();
    const slug = params.slug;

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingData, setBookingData] = useState(null);

    // Set initial date to today when event type is loaded
    useEffect(() => {
        if (!selectedDate) {
            setSelectedDate(getTodayDateString());
        }
    }, [selectedDate]);

    // Custom hooks for data fetching
    const { eventType, loading, error } = useEventType(slug);
    const { filteredSlots, loading: slotsLoading, error: slotsError, removeBookedSlot } = useSlots(eventType, selectedDate);

    const handleBookingSuccess = (data) => {
        // Remove the booked slot immediately from the slots array
        if (selectedSlot && selectedSlot.start) {
            removeBookedSlot(selectedSlot.start);
        }
        
        setBookingSuccess(true);
        setBookingData(data);
    };

    const handleCloseSuccess = () => {
        setBookingSuccess(false);
        setBookingData(null);
        // Reset form state if needed
        setSelectedSlot(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen  flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
                    <p className={`${theme === "light" ? "text-gray-600" : "text-white"}`}>Loading event details...</p>
                </div>
            </div>
        );
    }

    if ((error || slotsError) && !eventType) {
        return (
            <div className="min-h-screen  flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <h1 className={`text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-white"} mb-2`}>Event Not Found</h1>
                    <p className={`${theme === "light" ? "text-gray-600" : "text-white"}`}>{error || slotsError}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Success Modal */}
            {bookingSuccess && (
                <Success
                    bookingData={bookingData}
                    eventType={eventType}
                    onClose={handleCloseSuccess}
                />
            )}

            <div className="w-full px-4 sm:px-4 lg:px-6 xl:px-8 2xl:px-1 pt-5   ">
                <div className="max-w-full mx-auto">
                    <div className="mt-8 mb-8">
                        <h1 className={`text-2xl sm:text-3xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Book a <span className={`${theme === "light" ? "text-orange-500" : "text-orange-500"}`}>Meeting</span></h1>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 xl:gap-10 mb-8">
                        <div className="w-full lg:w-[45%] xl:w-[42%] flex-shrink-0">
                            <Calendar 
                                selectedDate={selectedDate} 
                                onDateSelect={setSelectedDate}
                            />
                        </div>
                        <div className="w-full lg:w-[55%] xl:w-[58%] flex flex-col gap-6">
                            {eventType && (
                                <>
                                    <div className="flex-shrink-0">
                                        <label className={`block text-lg font-bold ${theme === "light" ? "text-gray-700" : "text-white"} mb-4`}>
                                            Available Times
                                        </label>
                                        {slotsLoading ? (
                                            <div className="space-y-2">
                                                {[1, 2, 3].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-12 ${theme === "light" ? "bg-gray-100" : "bg-[#262626]"} rounded-md animate-pulse`}
                                                    ></div>
                                                ))}
                                            </div>
                                        ) : filteredSlots.length === 0 ? (
                                            <div className={`${theme === "light" ? "text-gray-500" : "text-gray-500"} text-sm py-4`}>
                                                <p className="mb-2">No slots available for this date.</p>
                                                {eventType && (
                                                    <p className={`text-xs ${theme === "light" ? "text-gray-400" : "text-gray-500"}`}>
                                                        Make sure availability rules are configured for this event type.
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <SlotPicker
                                                slots={filteredSlots}
                                                selectedSlot={selectedSlot}
                                                onSelectSlot={setSelectedSlot}
                                            />
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-h-0">
                                        <BookingForm
                                            eventType={eventType}
                                            selectedSlot={selectedSlot}
                                            onBookingSuccess={handleBookingSuccess}
                                            slug={slug}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

