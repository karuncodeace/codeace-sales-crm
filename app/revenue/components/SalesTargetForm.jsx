"use client";

import { useState } from "react";
import { useTheme } from "../../context/themeContext";
import { Save, Loader2 } from "lucide-react";

export default function SalesTargetForm({ onSuccess, onCancel }) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    period_type: "monthly",
    period_start: "",
    period_end: "",
    quarter: "",
    year: new Date().getFullYear(),
    targets: {
      leads: "",
      calls: "",
      meetings: "",
      prospects: "",
      proposals: "",
      converted: "",
    },
    target_revenue: "",
  });

  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate quarter dates based on quarter number and year
  const calculateQuarterDates = (quarter, year) => {
    const q = parseInt(quarter);
    const y = parseInt(year);
    
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
    
    // Use proper last day of month calculation
    const periodStart = new Date(y, startMonth, 1);
    const periodEnd = new Date(y, endMonth + 1, 0); // Last day of endMonth
    
    return {
      period_start: formatDateLocal(periodStart),
      period_end: formatDateLocal(periodEnd),
    };
  };

  const handleInputChange = (field, value) => {
    if (field.startsWith("targets.")) {
      const targetField = field.replace("targets.", "");
      // Allow empty string while typing
      if (value === "" || value === null || value === undefined) {
        setFormData((prev) => ({
          ...prev,
          targets: {
            ...prev.targets,
            [targetField]: "",
          },
        }));
        return;
      }
      
      // Remove leading zeros and parse
      const cleanValue = value.replace(/^0+/, "") || "0";
      const numValue = parseFloat(cleanValue);
      
      if (!isNaN(numValue)) {
        setFormData((prev) => ({
          ...prev,
          targets: {
            ...prev.targets,
            [targetField]: numValue < 0 ? 0 : numValue,
          },
        }));
      }
    } else if (field === "target_revenue") {
      // Allow empty string while typing
      if (value === "" || value === null || value === undefined) {
        setFormData((prev) => ({
          ...prev,
          [field]: "",
        }));
        return;
      }
      
      // Remove leading zeros and parse
      const cleanValue = value.replace(/^0+/, "") || "0";
      const numValue = parseFloat(cleanValue);
      
      if (!isNaN(numValue)) {
        setFormData((prev) => ({
          ...prev,
          [field]: numValue < 0 ? 0 : numValue,
        }));
      }
    } else if (field === "period_type") {
      // When period type changes, reset dates
      setFormData((prev) => ({
        ...prev,
        period_type: value,
        period_start: "",
        period_end: "",
        quarter: value === "quarterly" ? prev.quarter : "",
      }));
    } else if (field === "quarter") {
      // When quarter is selected, calculate and set dates
      const dates = calculateQuarterDates(value, formData.year);
      setFormData((prev) => ({
        ...prev,
        quarter: value,
        period_start: dates.period_start,
        period_end: dates.period_end,
      }));
    } else if (field === "year") {
      // When year changes and quarter is selected, recalculate dates
      const newYear = parseInt(value) || new Date().getFullYear();
      setFormData((prev) => {
        if (prev.period_type === "quarterly" && prev.quarter) {
          const dates = calculateQuarterDates(prev.quarter, newYear);
          return {
            ...prev,
            year: newYear,
            period_start: dates.period_start,
            period_end: dates.period_end,
          };
        }
        return {
          ...prev,
          year: newYear,
        };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert empty strings to 0 before sending
      // Validate dates
      const startDate = new Date(formData.period_start);
      const endDate = new Date(formData.period_end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setError("Invalid date format. Use YYYY-MM-DD");
        setIsSubmitting(false);
        return;
      }

      if (startDate > endDate) {
        setError("Period start must be before or equal to period end");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        period_type: formData.period_type,
        period_start: formData.period_start,
        period_end: formData.period_end,
        targets: {
          leads: formData.targets.leads === "" ? 0 : parseInt(formData.targets.leads) || 0,
          calls: formData.targets.calls === "" ? 0 : parseInt(formData.targets.calls) || 0,
          meetings: formData.targets.meetings === "" ? 0 : parseInt(formData.targets.meetings) || 0,
          prospects: formData.targets.prospects === "" ? 0 : parseInt(formData.targets.prospects) || 0,
          proposals: formData.targets.proposals === "" ? 0 : parseInt(formData.targets.proposals) || 0,
          converted: formData.targets.converted === "" ? 0 : parseInt(formData.targets.converted) || 0,
        },
        target_revenue: formData.target_revenue === "" ? 0 : parseFloat(formData.target_revenue) || 0,
      };

      const response = await fetch("/api/admin/sales-targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save sales target");
      }

      setSuccess("Sales target saved successfully!");
      if (onSuccess) {
        onSuccess(data.data);
      }
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          period_type: "monthly",
          period_start: "",
          period_end: "",
          quarter: "",
          year: new Date().getFullYear(),
          targets: {
            leads: "",
            calls: "",
            meetings: "",
            prospects: "",
            proposals: "",
            converted: "",
          },
          target_revenue: "",
        });
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Period Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            Period Type *
          </label>
          <select
            value={formData.period_type}
            onChange={(e) => handleInputChange("period_type", e.target.value)}
            required
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

        {formData.period_type === "quarterly" && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Quarter *
            </label>
            <select
              value={formData.quarter}
              onChange={(e) => handleInputChange("quarter", e.target.value)}
              required={formData.period_type === "quarterly"}
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

        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            Year *
          </label>
          <input
            type="number"
            min="2020"
            max="2100"
            value={formData.year}
            onChange={(e) => handleInputChange("year", e.target.value)}
            required
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === "dark"
                ? "bg-[#1a1a1a] border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            } focus:outline-none focus:ring-2 focus:ring-orange-500`}
          />
        </div>

        {formData.period_type !== "quarterly" && (
          <>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Period Start *
              </label>
              <input
                type="date"
                value={formData.period_start}
                onChange={(e) => handleInputChange("period_start", e.target.value)}
                required={formData.period_type !== "quarterly"}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#1a1a1a] border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } focus:outline-none focus:ring-2 focus:ring-orange-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Period End *
              </label>
              <input
                type="date"
                value={formData.period_end}
                onChange={(e) => handleInputChange("period_end", e.target.value)}
                required={formData.period_type !== "quarterly"}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#1a1a1a] border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } focus:outline-none focus:ring-2 focus:ring-orange-500`}
              />
            </div>
          </>
        )}

        {formData.period_type === "quarterly" && (
          <>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Period Start *
              </label>
              <input
                type="date"
                value={formData.period_start}
                onChange={(e) => handleInputChange("period_start", e.target.value)}
                required
                readOnly={formData.quarter !== ""}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#1a1a1a] border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } ${formData.quarter !== "" ? "opacity-75 cursor-not-allowed" : ""} focus:outline-none focus:ring-2 focus:ring-orange-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Period End *
              </label>
              <input
                type="date"
                value={formData.period_end}
                onChange={(e) => handleInputChange("period_end", e.target.value)}
                required
                readOnly={formData.quarter !== ""}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#1a1a1a] border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } ${formData.quarter !== "" ? "opacity-75 cursor-not-allowed" : ""} focus:outline-none focus:ring-2 focus:ring-orange-500`}
              />
            </div>
          </>
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
                value={formData.targets[key] === "" ? "" : formData.targets[key]}
                onChange={(e) => handleInputChange(`targets.${key}`, e.target.value)}
                onBlur={(e) => {
                  // Ensure value is a number on blur
                  const val = parseFloat(e.target.value) || 0;
                  setFormData((prev) => ({
                    ...prev,
                    targets: {
                      ...prev.targets,
                      [key]: val < 0 ? 0 : val,
                    },
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
        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
          Revenue Target (₹) *
        </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.target_revenue === "" ? "" : formData.target_revenue}
            onChange={(e) => handleInputChange("target_revenue", e.target.value)}
            onBlur={(e) => {
              // Ensure value is a number on blur
              const val = parseFloat(e.target.value) || 0;
              setFormData((prev) => ({
                ...prev,
                target_revenue: val < 0 ? 0 : val,
              }));
            }}
            required
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === "dark"
                ? "bg-[#1a1a1a] border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            } focus:outline-none focus:ring-2 focus:ring-orange-500`}
            placeholder="0.00"
          />
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>
          {error}
        </div>
      )}

      {success && (
        <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600"}`}>
          {success}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
            } disabled:opacity-50`}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 rounded-lg font-medium bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Target
            </>
          )}
        </button>
      </div>
    </form>
  );
}

