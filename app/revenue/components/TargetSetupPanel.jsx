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
    leads: 0,
    calls: 0,
    meetings: 0,
    prospects: 0,
    proposals: 0,
    converted: 0,
    revenue: 0,
  });

  // Load existing targets when period changes
  const loadTargets = async () => {
    try {
      const params = new URLSearchParams({
        periodType,
        year: year.toString(),
      });
      
      if (periodType === "monthly") {
        params.append("month", month.toString());
      } else if (periodType === "quarterly") {
        params.append("quarter", quarter.toString());
      }

      const response = await fetch(`/api/revenue/targets?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.targets) {
          setTargets(data.targets);
        }
      }
    } catch (error) {
      console.error("Error loading targets:", error);
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
      // Validate inputs
      const targetValues = Object.values(targets);
      if (targetValues.some(val => val < 0)) {
        setSaveMessage({ type: "error", text: "Targets cannot be negative" });
        setIsSaving(false);
        return;
      }

      const response = await fetch("/api/revenue/targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodType,
          year,
          month: periodType === "monthly" ? month : null,
          quarter: periodType === "quarterly" ? quarter : null,
          targets,
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
      console.error("Error saving targets:", error);
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
    setQuarter(Math.floor((now.getMonth() + 3) / 3));
    // Load targets for new period
    setTimeout(() => loadTargets(), 100);
  };

  const handleInputChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    setTargets((prev) => ({
      ...prev,
      [field]: numValue < 0 ? 0 : numValue,
    }));
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
                  {quarters.map((q) => (
                    <option key={q} value={q}>
                      Q{q}
                    </option>
                  ))}
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
                    value={targets[key]}
                    onChange={(e) => handleInputChange(key, e.target.value)}
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
                value={targets.revenue}
                onChange={(e) => handleInputChange("revenue", e.target.value)}
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

