"use client";

import { useState, useEffect } from "react";
import { useTheme } from "../../context/themeContext";
import { ChevronDown, ChevronUp, Save } from "lucide-react";

export default function TargetSetupPanel({
  periodType: initialPeriodType,
  selectedYear: initialYear,
  selectedMonth: initialMonth,
  selectedQuarter: initialQuarter,
  onPeriodChange,
}) {
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  const [periodType, setPeriodType] = useState(initialPeriodType);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [quarter, setQuarter] = useState(initialQuarter);
  
  const [targets, setTargets] = useState({
    leads: "",
    calls: "",
    meetings: "",
    prospects: "",
    proposals: "",
    converted: "",
    revenue: "",
  });

  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load existing targets when period changes
  const loadTargets = async () => {
    try {
      // Calculate period_start and period_end
      let periodStart, periodEnd;
      const currentYear = parseInt(year);
      
      if (periodType === "monthly") {
        const currentMonth = parseInt(month);
        periodStart = formatDateLocal(new Date(currentYear, currentMonth - 1, 1));
        periodEnd = formatDateLocal(new Date(currentYear, currentMonth, 0));
      } else if (periodType === "quarterly") {
        const q = parseInt(quarter);
        let startMonth, endMonth;
        
        // Custom quarter definition:
        // Q1: April, May, June (months 3-5)
        // Q2: July, August, September (months 6-8)
        // Q3: October, November, December (months 9-11)
        // Q4: January, February, March (months 0-2)
        if (q === 1) {
          startMonth = 3; // April
          endMonth = 5;   // June
        } else if (q === 2) {
          startMonth = 6; // July
          endMonth = 8;   // September
        } else if (q === 3) {
          startMonth = 9; // October
          endMonth = 11;  // December
        } else if (q === 4) {
          startMonth = 0; // January
          endMonth = 2;   // March
        }
        
        periodStart = formatDateLocal(new Date(currentYear, startMonth, 1));
        periodEnd = formatDateLocal(new Date(currentYear, endMonth + 1, 0));
      } else {
        // Weekly - last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        periodStart = formatDateLocal(startDate);
        periodEnd = formatDateLocal(endDate);
      }

      const params = new URLSearchParams({
        periodType,
        period_start: periodStart,
        period_end: periodEnd,
      });

      const response = await fetch(`/api/revenue/targets?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.targets) {
          // Convert loaded values to strings for better input handling
          setTargets({
            leads: data.targets.leads || "",
            calls: data.targets.calls || "",
            meetings: data.targets.meetings || "",
            prospects: data.targets.prospects || "",
            proposals: data.targets.proposals || "",
            converted: data.targets.converted || "",
            revenue: data.targets.revenue || "",
          });
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Load targets on mount and when period changes
  useEffect(() => {
    loadTargets();
  }, [periodType, year, month, quarter]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Convert empty strings to 0 before sending and validating
      const targetsToSend = {
        leads: targets.leads === "" ? 0 : parseInt(targets.leads) || 0,
        calls: targets.calls === "" ? 0 : parseInt(targets.calls) || 0,
        meetings: targets.meetings === "" ? 0 : parseInt(targets.meetings) || 0,
        prospects: targets.prospects === "" ? 0 : parseInt(targets.prospects) || 0,
        proposals: targets.proposals === "" ? 0 : parseInt(targets.proposals) || 0,
        converted: targets.converted === "" ? 0 : parseInt(targets.converted) || 0,
        revenue: targets.revenue === "" ? 0 : parseFloat(targets.revenue) || 0,
      };

      // Validate inputs
      const targetValues = Object.values(targetsToSend);
      if (targetValues.some(val => val < 0 || isNaN(val))) {
        setSaveMessage({ type: "error", text: "Targets cannot be negative" });
        setIsSaving(false);
        return;
      }

      // Calculate period_start and period_end
      let periodStart, periodEnd;
      const currentYear = parseInt(year);
      
      if (periodType === "monthly") {
        const currentMonth = parseInt(month);
        periodStart = formatDateLocal(new Date(currentYear, currentMonth - 1, 1));
        periodEnd = formatDateLocal(new Date(currentYear, currentMonth, 0));
      } else if (periodType === "quarterly") {
        const q = parseInt(quarter);
        let startMonth, endMonth;
        
        // Custom quarter definition:
        // Q1: April, May, June (months 3-5)
        // Q2: July, August, September (months 6-8)
        // Q3: October, November, December (months 9-11)
        // Q4: January, February, March (months 0-2)
        if (q === 1) {
          startMonth = 3; // April
          endMonth = 5;   // June
        } else if (q === 2) {
          startMonth = 6; // July
          endMonth = 8;   // September
        } else if (q === 3) {
          startMonth = 9; // October
          endMonth = 11;  // December
        } else if (q === 4) {
          startMonth = 0; // January
          endMonth = 2;   // March
        }
        
        periodStart = formatDateLocal(new Date(currentYear, startMonth, 1));
        periodEnd = formatDateLocal(new Date(currentYear, endMonth + 1, 0));
      } else {
        // Weekly - last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        periodStart = formatDateLocal(startDate);
        periodEnd = formatDateLocal(endDate);
      }

      const response = await fetch("/api/revenue/targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodType,
          period_start: periodStart,
          period_end: periodEnd,
          targets: targetsToSend,
          target_revenue: targetsToSend.revenue,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveMessage({ type: "success", text: "Targets saved successfully!" });
        // Notify parent of period change
        onPeriodChange(periodType, year, month, quarter);
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save targets" });
      }
    } catch (error) {
      setSaveMessage({ type: "error", text: "An error occurred while saving" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePeriodChange = (newPeriodType) => {
    setPeriodType(newPeriodType);
    // Reset to current period
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    
    // Calculate current quarter based on custom definition
    const currentMonth = now.getMonth(); // 0-11
    let currentQuarter;
    if (currentMonth >= 3 && currentMonth <= 5) {
      currentQuarter = 1; // Apr-Jun
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      currentQuarter = 2; // Jul-Sep
    } else if (currentMonth >= 9 && currentMonth <= 11) {
      currentQuarter = 3; // Oct-Dec
    } else {
      currentQuarter = 4; // Jan-Mar
    }
    setQuarter(currentQuarter);
    
    // Load targets for new period
    setTimeout(() => loadTargets(), 100);
  };

  const handleInputChange = (field, value) => {
    // Allow empty string for better UX while typing
    if (value === "" || value === null || value === undefined) {
      setTargets((prev) => ({
        ...prev,
        [field]: "",
      }));
      return;
    }
    
    // Remove leading zeros and parse
    const cleanValue = value.replace(/^0+/, "") || "0";
    const numValue = parseFloat(cleanValue);
    
    // Only update if valid number
    if (!isNaN(numValue)) {
      setTargets((prev) => ({
        ...prev,
        [field]: numValue < 0 ? 0 : numValue,
      }));
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const quarters = [1, 2, 3, 4];

  return (
    <div
      className={`rounded-2xl border p-6 ${
        theme === "dark"
          ? "bg-[#262626] border-gray-700"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer mb-4"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Target Setup
        </h2>
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span
              className={`text-sm ${
                saveMessage.type === "success"
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {saveMessage.text}
            </span>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-6">
          {/* Period Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Period Type
              </label>
              <select
                value={periodType}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#1a1a1a] border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } focus:outline-none focus:ring-2 focus:ring-orange-500`}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Year
              </label>
              <select
                value={year}
                onChange={(e) => {
                  setYear(parseInt(e.target.value));
                  setTimeout(() => loadTargets(), 100);
                }}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#1a1a1a] border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } focus:outline-none focus:ring-2 focus:ring-orange-500`}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {periodType === "monthly" && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => {
                    setMonth(parseInt(e.target.value));
                    setTimeout(() => loadTargets(), 100);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-[#1a1a1a] border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                >
                  {months.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === "quarterly" && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Quarter
                </label>
                <select
                  value={quarter}
                  onChange={(e) => {
                    setQuarter(parseInt(e.target.value));
                    setTimeout(() => loadTargets(), 100);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-[#1a1a1a] border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                >
                  <option value="">Select Quarter</option>
                  <option value="1">Q1 (Apr - Jun)</option>
                  <option value="2">Q2 (Jul - Sep)</option>
                  <option value="3">Q3 (Oct - Dec)</option>
                  <option value="4">Q4 (Jan - Mar)</option>
                </select>
              </div>
            )}
          </div>

          {/* Funnel Targets */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Funnel Targets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "leads", label: "Leads" },
                { key: "calls", label: "Calls" },
                { key: "meetings", label: "Meetings" },
                { key: "prospects", label: "Prospects" },
                { key: "proposals", label: "Proposals" },
                { key: "converted", label: "Converted" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    {label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={targets[key] === "" ? "" : targets[key]}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    onBlur={(e) => {
                      // Ensure value is a number on blur
                      const val = parseFloat(e.target.value) || 0;
                      setTargets((prev) => ({
                        ...prev,
                        [key]: val < 0 ? 0 : val,
                      }));
                    }}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-[#1a1a1a] border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Target */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Revenue Target
            </h3>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Monthly Revenue Target (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targets.revenue === "" ? "" : targets.revenue}
                onChange={(e) => handleInputChange("revenue", e.target.value)}
                onBlur={(e) => {
                  // Ensure value is a number on blur
                  const val = parseFloat(e.target.value) || 0;
                  setTargets((prev) => ({
                    ...prev,
                    revenue: val < 0 ? 0 : val,
                  }));
                }}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#1a1a1a] border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                isSaving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700 text-white"
              }`}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Targets"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

