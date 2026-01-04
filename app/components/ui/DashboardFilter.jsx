"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/themeContext";
import { Filter, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";

export default function DashboardFilter({ onFilterChange }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Filter state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterType, setFilterType] = useState(null); // Start with null for default (last 7 days)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const month = new Date().getMonth();
    if (month >= 3 && month <= 5) return 1;
    if (month >= 6 && month <= 8) return 2;
    if (month >= 9 && month <= 11) return 3;
    return 4;
  });
  const [isResetting, setIsResetting] = useState(false);
  
  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef(null);
  const filterPanelRef = useRef(null);
  
  // Year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  
  // Month options
  const months = [
    { value: 1, label: "Jan", fullLabel: "January" },
    { value: 2, label: "Feb", fullLabel: "February" },
    { value: 3, label: "Mar", fullLabel: "March" },
    { value: 4, label: "Apr", fullLabel: "April" },
    { value: 5, label: "May", fullLabel: "May" },
    { value: 6, label: "Jun", fullLabel: "June" },
    { value: 7, label: "Jul", fullLabel: "July" },
    { value: 8, label: "Aug", fullLabel: "August" },
    { value: 9, label: "Sep", fullLabel: "September" },
    { value: 10, label: "Oct", fullLabel: "October" },
    { value: 11, label: "Nov", fullLabel: "November" },
    { value: 12, label: "Dec", fullLabel: "December" },
  ];
  
  // Quarter options
  const quarters = [
    { value: 1, label: "Q1", period: "Apr - Jun" },
    { value: 2, label: "Q2", period: "Jul - Sep" },
    { value: 3, label: "Q3", period: "Oct - Dec" },
    { value: 4, label: "Q4", period: "Jan - Mar" },
  ];
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Calculate date range based on filter type
  useEffect(() => {
    // Skip if resetting or if filterType is null (default to last 7 days)
    if (isResetting || !filterType) {
      if (onFilterChange && !isResetting) {
        onFilterChange(null); // Default to last 7 days
      }
      return;
    }

    if (onFilterChange) {
      let startDate, endDate;
      
      if (filterType === "custom" && fromDate && toDate) {
        startDate = new Date(fromDate);
        endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (filterType === "quarter") {
        const q = selectedQuarter;
        let startMonth, endMonth;
        if (q === 1) {
          startMonth = 3;
          endMonth = 5;
        } else if (q === 2) {
          startMonth = 6;
          endMonth = 8;
        } else if (q === 3) {
          startMonth = 9;
          endMonth = 11;
        } else {
          startMonth = 0;
          endMonth = 2;
        }
        startDate = new Date(selectedYear, startMonth, 1);
        endDate = new Date(selectedYear, endMonth + 1, 0, 23, 59, 59, 999);
      } else if (filterType === "month") {
        startDate = new Date(selectedYear, selectedMonth - 1, 1);
        endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
      } else if (filterType === "year") {
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      }
      
      if (startDate && endDate) {
        onFilterChange({
          filterType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          fromDate,
          toDate,
          year: selectedYear,
          month: selectedMonth,
          quarter: selectedQuarter,
        });
      }
    }
  }, [filterType, selectedYear, selectedMonth, selectedQuarter, fromDate, toDate, onFilterChange, isResetting]);
  
  // Calendar functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
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
  
  const handleDateClick = (day) => {
    const dateStr = formatDateForInput(day);
    
    if (!fromDate || (fromDate && toDate)) {
      setFromDate(dateStr);
      setToDate("");
    } else if (dateStr >= fromDate) {
      setToDate(dateStr);
      setShowCalendar(false);
    } else {
      setFromDate(dateStr);
      setToDate("");
    }
  };
  
  const isDateInRange = (day) => {
    const dateStr = formatDateForInput(day);
    if (!fromDate || !toDate) return false;
    return dateStr >= fromDate && dateStr <= toDate;
  };
  
  const isDateSelected = (day) => {
    const dateStr = formatDateForInput(day);
    return dateStr === fromDate || dateStr === toDate;
  };
  
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const monthName = months[currentMonth.getMonth()].fullLabel;
  const year = currentMonth.getFullYear();
  const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  
  const getActiveFilterLabel = () => {
    if (filterType === "quarter") {
      const q = quarters.find(q => q.value === selectedQuarter);
      return `${q?.label} ${selectedYear}`;
    } else if (filterType === "month") {
      const m = months.find(m => m.value === selectedMonth);
      return `${m?.fullLabel} ${selectedYear}`;
    } else if (filterType === "year") {
      return selectedYear.toString();
    } else if (filterType === "custom" && fromDate && toDate) {
      return `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`;
    }
    return "Last 7 Days";
  };

  const handleResetFilter = () => {
    setIsResetting(true);
    
    // Reset all filter states
    setFilterType(null); // Set to null for default (last 7 days)
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(new Date().getMonth() + 1);
    const month = new Date().getMonth();
    let defaultQuarter = 1;
    if (month >= 3 && month <= 5) defaultQuarter = 1;
    else if (month >= 6 && month <= 8) defaultQuarter = 2;
    else if (month >= 9 && month <= 11) defaultQuarter = 3;
    else defaultQuarter = 4;
    setSelectedQuarter(defaultQuarter);
    setFromDate("");
    setToDate("");
    setShowCalendar(false);
    
    // Call onFilterChange with null to reset to default (last 7 days)
    if (onFilterChange) {
      onFilterChange(null);
    }
    
    // Reset the flag after a brief delay to allow the effect to skip
    setTimeout(() => {
      setIsResetting(false);
    }, 100);
  };
  
  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setShowFilterPanel(!showFilterPanel)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
          showFilterPanel
            ? "bg-orange-600 text-white"
            : isDark
            ? "bg-[#1a1a1a] border border-gray-600 text-gray-300 hover:bg-gray-700"
            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Filter className="h-4 w-4" />
        <span>Filter</span>
        {getActiveFilterLabel() !== "Last 7 Days" && (
          <span className="text-xs opacity-75">({getActiveFilterLabel()})</span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${showFilterPanel ? "rotate-180" : ""}`} />
      </button>
      
      {/* Filter Panel */}
      {showFilterPanel && (
        <div
          ref={filterPanelRef}
          className={`absolute top-full right-0 mt-2 w-[400px] rounded-xl border shadow-2xl z-50 ${
            isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}>
            <h3 className={`text-base font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>
              Filter by Date Range
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilter}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? "hover:bg-gray-700 text-gray-400 hover:text-gray-300"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Reset filter"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowFilterPanel(false)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                    ? "hover:bg-gray-700 text-gray-400 hover:text-gray-300" 
                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                }`}
                aria-label="Close filter"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Filter Type Selection */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}>
                Select Period
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "quarter", label: "Quarter", icon: "📅" },
                  { id: "month", label: "Month", icon: "📆" },
                  { id: "year", label: "Year", icon: "🗓️" },
                  { id: "custom", label: "Custom", icon: "📝" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      filterType === tab.id
                        ? "bg-orange-600 text-white shadow-lg"
                        : isDark
                        ? "bg-[#1a1a1a] border border-gray-700 text-gray-300 hover:bg-gray-800"
                        : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Filter Options */}
            <div className={`rounded-lg border p-4 ${
              isDark ? "bg-[#1a1a1a] border-gray-700" : "bg-gray-50 border-gray-200"
            }`}>
              {filterType === "quarter" && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark
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
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Quarter
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {quarters.map((q) => (
                        <button
                          key={q.value}
                          onClick={() => setSelectedQuarter(q.value)}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            selectedQuarter === q.value
                              ? "bg-orange-600 text-white shadow-lg"
                              : isDark
                              ? "bg-[#262626] border border-gray-600 text-gray-300 hover:bg-gray-700"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-bold">{q.label}</div>
                            <div className="text-xs opacity-75">{q.period}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {filterType === "month" && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark
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
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Month
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {months.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => setSelectedMonth(m.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedMonth === m.value
                              ? "bg-orange-600 text-white shadow-lg"
                              : isDark
                              ? "bg-[#262626] border border-gray-600 text-gray-300 hover:bg-gray-700"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {filterType === "year" && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      isDark
                        ? "bg-[#262626] border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {filterType === "custom" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}>
                        From Date
                      </label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          if (toDate && e.target.value > toDate) {
                            setToDate("");
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                          isDark
                            ? "bg-[#262626] border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}>
                        To Date
                      </label>
                      <input
                        type="date"
                        value={toDate}
                        min={fromDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                          isDark
                            ? "bg-[#262626] border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                      />
                    </div>
                  </div>
                  
                  {/* Calendar Toggle */}
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`w-full px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      showCalendar
                        ? "bg-orange-600 text-white border-orange-600"
                        : isDark
                        ? "bg-[#262626] border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span>{showCalendar ? "Hide Calendar" : "Show Calendar"}</span>
                  </button>
                  
                  {/* Calendar */}
                  {showCalendar && (
                    <div ref={calendarRef} className={`mt-3 rounded-lg border p-4 ${
                      isDark ? "bg-[#1a1a1a] border-gray-700" : "bg-white border-gray-200"
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => navigateMonth(-1)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark 
                              ? "hover:bg-gray-700 text-gray-400" 
                              : "hover:bg-gray-100 text-gray-600"
                          }`}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h3 className={`text-base font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                          {monthName} {year}
                        </h3>
                        <button
                          onClick={() => navigateMonth(1)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark 
                              ? "hover:bg-gray-700 text-gray-400" 
                              : "hover:bg-gray-100 text-gray-600"
                          }`}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {daysOfWeek.map((day) => (
                          <div
                            key={day}
                            className={`text-center text-xs font-semibold py-2 ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                          <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                          const dateStr = formatDateForInput(day);
                          const inRange = isDateInRange(day);
                          const selected = isDateSelected(day);
                          
                          return (
                            <button
                              key={day}
                              onClick={() => handleDateClick(day)}
                              className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                                selected
                                  ? "bg-orange-600 text-white shadow-lg"
                                  : inRange
                                  ? isDark
                                    ? "bg-orange-900/30 text-orange-300"
                                    : "bg-orange-100 text-orange-700"
                                  : isDark
                                  ? "text-gray-300 hover:bg-gray-700"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
