"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/themeContext";
import { Filter, ChevronDown } from "lucide-react";

export default function PeriodFilter({ periodType, year, month, quarter, onPeriodChange }) {
  const { theme } = useTheme();
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showQuarterSelector, setShowQuarterSelector] = useState(false);
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const monthSelectorRef = useRef(null);
  const quarterSelectorRef = useRef(null);
  const weekSelectorRef = useRef(null);
  const [dropdownPositions, setDropdownPositions] = useState({
    monthly: { left: '0', right: 'auto' },
    quarterly: { left: '0', right: 'auto' },
    weekly: { left: '0', right: 'auto' }
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monthSelectorRef.current && !monthSelectorRef.current.contains(event.target)) {
        setShowMonthSelector(false);
      }
      if (quarterSelectorRef.current && !quarterSelectorRef.current.contains(event.target)) {
        setShowQuarterSelector(false);
      }
      if (weekSelectorRef.current && !weekSelectorRef.current.contains(event.target)) {
        setShowWeekSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Calculate dropdown positions to prevent overflow
  useEffect(() => {
    const calculatePosition = (ref, key) => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const dropdownWidth = 320;
      const viewportWidth = window.innerWidth;
      const spaceOnRight = viewportWidth - rect.right;
      const spaceOnLeft = rect.left;
      
      let position = { left: '0', right: 'auto' };
      
      // If not enough space on right, align to right edge of button
      if (spaceOnRight < dropdownWidth && spaceOnLeft > spaceOnRight) {
        position = { right: '0', left: 'auto' };
      }
      
      setDropdownPositions(prev => ({ ...prev, [key]: position }));
    };

    if (showMonthSelector) {
      calculatePosition(monthSelectorRef, 'monthly');
    }
    if (showQuarterSelector) {
      calculatePosition(quarterSelectorRef, 'quarterly');
    }
    if (showWeekSelector) {
      calculatePosition(weekSelectorRef, 'weekly');
    }
  }, [showMonthSelector, showQuarterSelector, showWeekSelector]);

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  
  // Month options
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  
  // Quarter options
  const quarters = [
    { value: 1, label: "Q1 (Apr - Jun)" },
    { value: 2, label: "Q2 (Jul - Sep)" },
    { value: 3, label: "Q3 (Oct - Dec)" },
    { value: 4, label: "Q4 (Jan - Mar)" },
  ];
  
  // Week options (last 8 weeks)
  const getWeekOptions = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      weeks.push({ value: i, label: weekLabel, startDate: weekStart, endDate: weekEnd });
    }
    return weeks;
  };
  
  const weekOptions = getWeekOptions();

  // Filter button handler
  const handleFilterChange = (newPeriodType) => {
    if (onPeriodChange) {
      const now = new Date();
      const currentYearVal = now.getFullYear();
      const currentMonthVal = now.getMonth() + 1;
      
      // Calculate current quarter based on custom definition
      const currentMonthIndex = now.getMonth();
      let currentQuarter;
      if (currentMonthIndex >= 3 && currentMonthIndex <= 5) {
        currentQuarter = 1; // Apr-Jun
      } else if (currentMonthIndex >= 6 && currentMonthIndex <= 8) {
        currentQuarter = 2; // Jul-Sep
      } else if (currentMonthIndex >= 9 && currentMonthIndex <= 11) {
        currentQuarter = 3; // Oct-Dec
      } else {
        currentQuarter = 4; // Jan-Mar
      }
      
      // Close all selectors
      setShowMonthSelector(false);
      setShowQuarterSelector(false);
      setShowWeekSelector(false);
      
      // If switching to a different period type, use current period
      if (newPeriodType !== periodType) {
        onPeriodChange(newPeriodType, currentYearVal, currentMonthVal, currentQuarter);
      } else {
        // If same period type, toggle the selector
        if (newPeriodType === "monthly") {
          setShowMonthSelector(!showMonthSelector);
        } else if (newPeriodType === "quarterly") {
          setShowQuarterSelector(!showQuarterSelector);
        } else if (newPeriodType === "weekly") {
          setShowWeekSelector(!showWeekSelector);
        }
      }
    }
  };

  // Handle month selection
  const handleMonthSelect = (selectedMonth, selectedYear) => {
    if (onPeriodChange) {
      onPeriodChange("monthly", selectedYear, selectedMonth, quarter);
      setShowMonthSelector(false);
    }
  };

  // Handle quarter selection
  const handleQuarterSelect = (selectedQuarter, selectedYear) => {
    if (onPeriodChange) {
      onPeriodChange("quarterly", selectedYear, month, selectedQuarter);
      setShowQuarterSelector(false);
    }
  };

  // Handle week selection
  const handleWeekSelect = (weekOption) => {
    if (onPeriodChange) {
      // For weekly, we'll use the week start date as reference
      // The API will calculate the period based on weekly logic
      const weekYear = weekOption.startDate.getFullYear();
      const weekMonth = weekOption.startDate.getMonth() + 1;
      // Store week info in a way that can be used for period calculation
      // We'll use the week start date for period_start calculation
      onPeriodChange("weekly", weekYear, weekMonth, quarter, weekOption.startDate);
      setShowWeekSelector(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap overflow-visible">
      <Filter className={`h-4 w-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`} />
      <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
        Filter by:
      </span>
      <div className="flex gap-2 flex-wrap overflow-visible">
        {/* Monthly Filter */}
        <div className="relative" ref={monthSelectorRef} style={{ position: 'relative' }}>
          <button
            onClick={() => handleFilterChange("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              periodType === "monthly"
                ? "bg-orange-600 text-white"
                : theme === "dark"
                ? "bg-[#1a1a1a] border border-gray-600 text-gray-300 hover:bg-gray-700"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Monthly
            {periodType === "monthly" && <ChevronDown className="h-3 w-3" />}
          </button>
          {showMonthSelector && periodType === "monthly" && (
            <div className={`absolute top-full mt-2 z-50 rounded-lg border shadow-lg p-4 w-[320px] max-w-[calc(100vw-1rem)] ${
              theme === "dark" ? "bg-[#1a1a1a] border-gray-700" : "bg-white border-gray-200"
            }`}
            style={dropdownPositions.monthly}>
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Select Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => handleMonthSelect(month, parseInt(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === "dark"
                        ? "bg-[#262626] border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Select Month
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => handleMonthSelect(m.value, year)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          month === m.value
                            ? "bg-orange-600 text-white"
                            : theme === "dark"
                            ? "bg-[#262626] border border-gray-600 text-gray-300 hover:bg-gray-700"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {m.label.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quarterly Filter */}
        <div className="relative" ref={quarterSelectorRef} style={{ position: 'relative' }}>
          <button
            onClick={() => handleFilterChange("quarterly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              periodType === "quarterly"
                ? "bg-orange-600 text-white"
                : theme === "dark"
                ? "bg-[#1a1a1a] border border-gray-600 text-gray-300 hover:bg-gray-700"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Quarterly
            {periodType === "quarterly" && <ChevronDown className="h-3 w-3" />}
          </button>
          {showQuarterSelector && periodType === "quarterly" && (
            <div className={`absolute top-full mt-2 z-50 rounded-lg border shadow-lg p-4 w-[320px] max-w-[calc(100vw-1rem)] ${
              theme === "dark" ? "bg-[#1a1a1a] border-gray-700" : "bg-white border-gray-200"
            }`}
            style={dropdownPositions.quarterly}>
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Select Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => handleQuarterSelect(quarter, parseInt(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === "dark"
                        ? "bg-[#262626] border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Select Quarter
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {quarters.map((q) => (
                      <button
                        key={q.value}
                        onClick={() => handleQuarterSelect(q.value, year)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          quarter === q.value
                            ? "bg-orange-600 text-white"
                            : theme === "dark"
                            ? "bg-[#262626] border border-gray-600 text-gray-300 hover:bg-gray-700"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Filter */}
        <div className="relative" ref={weekSelectorRef} style={{ position: 'relative' }}>
          <button
            onClick={() => handleFilterChange("weekly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              periodType === "weekly"
                ? "bg-orange-600 text-white"
                : theme === "dark"
                ? "bg-[#1a1a1a] border border-gray-600 text-gray-300 hover:bg-gray-700"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Weekly
            {periodType === "weekly" && <ChevronDown className="h-3 w-3" />}
          </button>
          {showWeekSelector && periodType === "weekly" && (
            <div className={`absolute top-full mt-2 z-50 rounded-lg border shadow-lg p-4 w-[320px] max-w-[calc(100vw-1rem)] max-h-[400px] overflow-y-auto ${
              theme === "dark" ? "bg-[#1a1a1a] border-gray-700" : "bg-white border-gray-200"
            }`}
            style={dropdownPositions.weekly}>
              <div className="space-y-2">
                <label className={`block text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Select Week Cycle
                </label>
                {weekOptions.map((week, index) => (
                  <button
                    key={index}
                    onClick={() => handleWeekSelect(week)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      theme === "dark"
                        ? "bg-[#262626] border border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {week.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

