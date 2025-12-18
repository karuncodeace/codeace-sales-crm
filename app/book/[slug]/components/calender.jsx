"use client";

import { useState, useEffect } from "react";

export default function Calendar({ selectedDate, onDateSelect }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert Sunday (0) to be last (6)
        
        return { daysInMonth, startingDayOfWeek };
    };
    
    const navigateMonth = (direction) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };
    
    const formatDateForInput = (day) => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };
    
    const isDateSelected = (day) => {
        if (!selectedDate) return false;
        return formatDateForInput(day) === selectedDate;
    };
    
    const isDatePast = (day) => {
        const dateStr = formatDateForInput(day);
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };
    
    const handleDateClick = (day) => {
        const dateStr = formatDateForInput(day);
        if (!isDatePast(day)) {
            onDateSelect(dateStr);
        }
    };
    
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const monthName = months[currentMonth.getMonth()];
    const year = currentMonth.getFullYear();
    
    // Initialize current month to selected date's month if available
    useEffect(() => {
        if (selectedDate) {
            const date = new Date(selectedDate);
            setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        }
    }, [selectedDate]);
    
    return (
        <div className="w-full bg-white p-10 rounded-[30px] ">
            {/* Month and Year Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                    aria-label="Previous month"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-lg font-bold text-gray-800">
                    {monthName} {year}
                </h2>
                <button
                    onClick={() => navigateMonth(1)}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                    aria-label="Next month"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
            
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 mt-8">
                {daysOfWeek.map((day) => (
                    <div
                        key={day}
                        className="text-center text-sm text-gray-700  font-medium py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                ))}
                
                {/* Days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dateStr = formatDateForInput(day);
                    const isSelected = isDateSelected(day);
                    const isPast = isDatePast(day);
                    
                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            disabled={isPast}
                            className={`
                                 aspect-square flex items-center justify-center 
                                 text-sm font-semibold transition-colors w-full
                                ${isSelected
                                    ? 'bg-orange-500 text-white rounded-full'
                                    : isPast
                                    ? 'text-gray-300 cursor-not-allowed rounded-md'
                                    : 'text-gray-800 hover:bg-gray-100 cursor-pointer rounded-full'
                                }
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}