"use client";

import { useTheme } from "../context/themeContext";
import { useState } from "react";

export default function AddTaskModal({ open, onClose, onAdd }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Get current date formatted
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const [formData, setFormData] = useState({
    title: "",
    type: "Call",
    lead: "",
    phone: "",
    due: "today",
    priority: "Warm",
    status: "pending",
    assignedTo: "",
  });

  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Task title is required";
    if (!formData.lead.trim()) newErrors.lead = "Lead name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.assignedTo) newErrors.assignedTo = "Assigned to is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const newId = `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const newTask = {
      id: newId,
      title: formData.title,
      type: formData.type,
      lead: formData.lead,
      phone: formData.phone,
      time: formattedDate,
      due: formData.due,
      priority: formData.priority,
      status: formData.status,
      assignedTo: formData.assignedTo,
      createdAt: formattedDate,
      rescheduleComment: "",
    };

    onAdd(newTask);
    
    // Reset form
    setFormData({
      title: "",
      type: "Call",
      lead: "",
      phone: "",
      due: "today",
      priority: "Warm",
      status: "pending",
      assignedTo: "",
    });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const inputClass = (field) =>
    `mt-1 w-full p-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
      isDark
        ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
        : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
    } ${errors[field] ? "border-red-500 ring-1 ring-red-500/50" : ""}`;

  const selectClass = (field) =>
    `mt-1 w-full p-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
      isDark
        ? "bg-[#262626] border-gray-700 text-gray-200"
        : "bg-white border-gray-300 text-gray-900"
    } ${errors[field] ? "border-red-500 ring-1 ring-red-500/50" : ""}`;

  const labelClass = `text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-xl mx-4 rounded-2xl shadow-2xl transform transition-all ${
          isDark ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-orange-500"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Add New Task</h2>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Create a new task for your team
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Task Title */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Call John Doe"
                className={inputClass("title")}
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Task Type */}
            <div>
              <label className={labelClass}>Task Type</label>
              <select
                className={selectClass("type")}
                value={formData.type}
                onChange={(e) => updateField("type", e.target.value)}
              >
                <option value="Call"> Call</option>
                <option value="Meeting"> Meeting</option>
                <option value="Follow-Up"> Follow-Up</option>
                <option value="Proposal"> Proposal</option>
                <option value="Email"> Email</option>
              </select>
            </div>

            {/* Lead Name */}
            <div>
              <label className={labelClass}>
                Lead Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                className={inputClass("lead")}
                value={formData.lead}
                onChange={(e) => updateField("lead", e.target.value)}
              />
              {errors.lead && <p className="mt-1 text-xs text-red-500">{errors.lead}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass}>
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. +1 (555) 123-4567"
                className={inputClass("phone")}
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* Created At - Auto-generated with current date */}
            <div>
              <label className={labelClass}>Created At</label>
              <input
                type="text"
                readOnly
                className={`mt-1 w-full p-2.5 rounded-lg border text-sm cursor-not-allowed ${
                  isDark
                    ? "bg-[#262626]/50 border-gray-700 text-gray-300"
                    : "bg-gray-50 border-gray-300 text-gray-700"
                }`}
                value={getCurrentDate()}
              />
            </div>

            {/* Due */}
            <div>
              <label className={labelClass}>Due</label>
              <select
                className={selectClass("due")}
                value={formData.due}
                onChange={(e) => updateField("due", e.target.value)}
              >
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className={labelClass}>Priority</label>
              <select
                className={selectClass("priority")}
                value={formData.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              >
                <option value="Hot"> Hot</option>
                <option value="Warm"> Warm</option>
                <option value="Cold"> Cold</option>
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label className={labelClass}>
                Assigned To <span className="text-red-500">*</span>
              </label>
              <select
                className={selectClass("assignedTo")}
                value={formData.assignedTo}
                onChange={(e) => updateField("assignedTo", e.target.value)}
              >
                <option value="">Select team member</option>
                <option value="Sarah Lin">Sarah Lin</option>
                <option value="Jorge Patel">Jorge Patel</option>
                <option value="Priya Nair">Priya Nair</option>
                <option value="Rachel Kim">Rachel Kim</option>
                <option value="David Chen">David Chen</option>
              </select>
              {errors.assignedTo && <p className="mt-1 text-xs text-red-500">{errors.assignedTo}</p>}
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={selectClass("status")}
                value={formData.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <button
            onClick={handleClose}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
