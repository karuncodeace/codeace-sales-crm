"use client";

import { useTheme } from "../context/themeContext";
import { useState } from "react";

export default function AddLeadModal({ open, onClose, onAdd }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    contactName: "",
    source: "",
    status: "New",
    lastActivity: "",
    createdAt: new Date().toISOString().split("T")[0],
    priority: "Warm",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Lead name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.contactName.trim()) newErrors.contactName = "Contact name is required";
    if (!formData.source) newErrors.source = "Lead source is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          contactName: formData.contactName,
          source: formData.source,
          status: formData.status,
          priority: formData.priority,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create lead");
      }

      const { lead: newLead } = await res.json();
      
      onAdd(newLead);
      
      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        contactName: "",
        source: "",
        status: "New",
        lastActivity: "",
        createdAt: new Date().toISOString().split("T")[0],
        priority: "Warm",
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Error creating lead:", error);
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
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
        className={`w-full max-w-2xl mx-4 rounded-2xl shadow-2xl transform transition-all ${
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" x2="19" y1="8" y2="14" />
                <line x1="22" x2="16" y1="11" y2="11" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Add New Lead</h2>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Fill in the details to create a new lead
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
            {/* Lead Name */}
            <div>
              <label className={labelClass}>
                Lead Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corporation"
                className={inputClass("name")}
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
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

            {/* Email */}
            <div>
              <label className={labelClass}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="e.g. contact@company.com"
                className={inputClass("email")}
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Contact Name */}
            <div>
              <label className={labelClass}>
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John Smith"
                className={inputClass("contactName")}
                value={formData.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
              />
              {errors.contactName && <p className="mt-1 text-xs text-red-500">{errors.contactName}</p>}
            </div>

            {/* Lead Source */}
            <div>
              <label className={labelClass}>
                Lead Source <span className="text-red-500">*</span>
              </label>
              <select
                className={selectClass("source")}
                value={formData.source}
                onChange={(e) => updateField("source", e.target.value)}
              >
                <option value="">Select source</option>
                <option value="Meta Ads">Meta Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Website Form">Website Form</option>
                <option value="Referral">Referral</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Cold Outreach">Cold Outreach</option>
                <option value="Trade Show">Trade Show</option>
                <option value="Other">Other</option>
              </select>
              {errors.source && <p className="mt-1 text-xs text-red-500">{errors.source}</p>}
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={selectClass("status")}
                value={formData.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Noresponse">No Response</option>
              </select>
            </div>

            {/* Last Activity */}
            <div>
              <label className={labelClass}>Last Activity</label>
              <input
                type="text"
                placeholder="e.g. Call scheduled · Tomorrow"
                className={inputClass("lastActivity")}
                value={formData.lastActivity}
                onChange={(e) => updateField("lastActivity", e.target.value)}
              />
            </div>

            {/* Created At */}
            <div>
              <label className={labelClass}>Created At</label>
              <input
                type="date"
                className={inputClass("createdAt")}
                value={formData.createdAt}
                onChange={(e) => updateField("createdAt", e.target.value)}
              />
            </div>

            {/* Priority */}
            <div>
              <label className={labelClass}>Priority</label>
              <select
                className={selectClass("priority")}
                value={formData.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              >
                <option value="Hot">Hot</option>
                <option value="Warm"> Warm</option>
                <option value="Cold"> Cold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex flex-col gap-3 px-6 py-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          {errors.submit && (
            <p className="text-sm text-red-500 text-center">{errors.submit}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
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
                  Add Lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

