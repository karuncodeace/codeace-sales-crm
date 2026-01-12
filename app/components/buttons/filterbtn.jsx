"use client";

import { useTheme } from "../../context/themeContext";
import { useState, useEffect } from "react";

export default function FilterModal({ open, onClose, onApply, currentFilters = {}, salesPersonsData = [] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [filters, setFilters] = useState({
    source: currentFilters.source || "",
    status: currentFilters.status || "",
    assignedTo: currentFilters.assignedTo || "",
    priority: currentFilters.priority || "",
    type: currentFilters.type || "",
  });

  // Update filters when currentFilters prop changes
  useEffect(() => {
    if (open) {
      setFilters({
        source: currentFilters.source || "",
        status: currentFilters.status || "",
        assignedTo: currentFilters.assignedTo || "",
        priority: currentFilters.priority || "",
        type: currentFilters.type || "",
      });
    }
  }, [currentFilters, open]);

  const updateFilter = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const applyFilters = () => {
    onApply(filters);
    onClose();
  };

  const clearFilters = () => {
    const clearedFilters = {
      source: "",
      status: "",
      assignedTo: "",
      priority: "",
      type: "",
    };
    setFilters(clearedFilters);
    onApply(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className={`w-[380px] rounded-xl p-5 shadow-lg ${
          isDark ? "bg-[#1f1f1f] text-gray-300" : "bg-white text-gray-900"
        }`}
      >
        {/* Title */}
        <h2 className="text-lg font-semibold mb-4">Filter Tasks</h2>

        {/* FORM FIELDS */}
        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className={`mt-1 w-full p-2 rounded-md border ${
                isDark
                  ? "bg-[#262626] border-gray-700 text-gray-300"
                  : "bg-white border-gray-300"
              }`}
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <option value="">All</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="text-sm font-medium">Assigned To</label>
            <select
              className={`mt-1 w-full p-2 rounded-md border ${
                isDark
                  ? "bg-[#262626] border-gray-700 text-gray-300"
                  : "bg-white border-gray-300"
              }`}
              value={filters.assignedTo}
              onChange={(e) => updateFilter("assignedTo", e.target.value)}
            >
              <option value="">All</option>
              {Array.isArray(salesPersonsData) && salesPersonsData.length > 0 ? (
                salesPersonsData.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name || person.name || person.email || person.id}
                  </option>
                ))
              ) : (
                <>
                  <option>Sarah Lin</option>
                  <option>Jorge Patel</option>
                  <option>Priya Nair</option>
                  <option>David Chen</option>
                </>
              )}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium">Priority</label>
            <select
              className={`mt-1 w-full p-2 rounded-md border ${
                isDark
                  ? "bg-[#262626] border-gray-700 text-gray-300"
                  : "bg-white border-gray-300"
              }`}
              value={filters.priority}
              onChange={(e) => updateFilter("priority", e.target.value)}
            >
              <option value="">All</option>
              <option>Hot</option>
              <option>Warm</option>
              <option>Cold</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium">Type</label>
            <select
              className={`mt-1 w-full p-2 rounded-md border ${
                isDark
                  ? "bg-[#262626] border-gray-700 text-gray-300"
                  : "bg-white border-gray-300"
              }`}
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">All</option>
              <option>Call</option>
              <option>Follow-Up</option>
              <option>Proposal</option>
              <option>Meeting</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-5">
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                isDark 
                  ? "text-red-400 hover:bg-red-900/30" 
                  : "text-red-600 hover:bg-red-50"
              }`}
            >
              Clear Filters
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-md ${
                isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200"
              }`}
            >
              Cancel
            </button>

            <button
              onClick={applyFilters}
              className="px-4 py-2 rounded-md bg-orange-600 text-white"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}
