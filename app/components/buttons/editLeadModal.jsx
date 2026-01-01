"use client";

import { useTheme } from "../../context/themeContext";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

export default function EditLeadModal({ open, onClose, lead, onUpdate }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    contactName: "",
    source: "",
    status: "New",
    priority: "Warm",
    companySize: "",
    turnover: "",
    industryType: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [industries, setIndustries] = useState([]);
  // Start in create mode by default; we turn it off if we actually have industries
  const [showCreateIndustry, setShowCreateIndustry] = useState(true);
  const [newIndustryName, setNewIndustryName] = useState("");
  const [isCreatingIndustry, setIsCreatingIndustry] = useState(false);

  // Fetch industries when modal opens
  useEffect(() => {
    if (open) {
      fetchIndustries();
    }
  }, [open]);

  // Prefill form when lead data is available
  useEffect(() => {
    if (lead && open) {
      setFormData({
        name: lead.name || "",
        phone: lead.phone || "",
        email: lead.email || "",
        contactName: lead.contactName || "",
        source: lead.source || "",
        status: lead.status || "New",
        priority: lead.priority || "Warm",
        companySize: lead.companySize || lead.company_size || "",
        turnover: lead.turnover || "",
        industryType: lead.industryType || lead.industry_type || "",
      });
      setErrors({});
    }
  }, [lead, open]);

  const fetchIndustries = async () => {
    try {
      const res = await fetch("/api/industries");
      if (res.ok) {
        const data = await res.json();
        setIndustries(data || []);
        // Toggle create mode based on whether industries exist
        setShowCreateIndustry(!data || data.length === 0);
      }
    } catch (error) {
      // Error fetching industries
    }
  };

  const handleCreateIndustry = async () => {
    if (!newIndustryName.trim()) {
      return;
    }

    setIsCreatingIndustry(true);
    try {
      const res = await fetch("/api/industries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newIndustryName.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create industry");
      }

      const response = await res.json();
      const newIndustry = response.data || response;
      
      setIndustries([...industries, newIndustry]);
      const industryName = newIndustry.name || newIndustryName.trim();
      setFormData({ ...formData, industryType: industryName });
      setNewIndustryName("");
      setShowCreateIndustry(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsCreatingIndustry(false);
    }
  };

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
      const payload = {
        id: lead.id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        contactName: formData.contactName,
        source: formData.source,
        status: formData.status,
        priority: formData.priority,
        companySize: formData.companySize,
        turnover: formData.turnover,
        industryType: formData.industryType,
      };
      
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update lead");
      }

      const { data: updatedLead } = await res.json();
      
      // The API already returns the lead in frontend format
      onUpdate(updatedLead);
      onClose();
    } catch (error) {
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

  if (!open || !lead) return null;

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
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Edit Lead</h2>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Update lead information
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

            {/* Priority */}
            <div>
              <label className={labelClass}>Priority</label>
              <select
                className={selectClass("priority")}
                value={formData.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              >
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>

            {/* Company Size */}
            <div>
              <label className={labelClass}>Company Size</label>
              <select
                className={selectClass("companySize")}
                value={formData.companySize}
                onChange={(e) => updateField("companySize", e.target.value)}
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-30 employees</option>
                <option value="51-200">31-50 employees</option>
                <option value="201-500">51-100 employees</option>
                <option value="501-1000">101-150 employees</option>
                <option value="1000+">200+ employees</option>
              </select>
            </div>

            {/* Turnover */}
            <div>
              <label className={labelClass}>Turnover</label>
              <input
                type="text"
                placeholder="e.g. INR 50,00,000"
                className={inputClass("turnover")}
                value={formData.turnover}
                onChange={(e) => updateField("turnover", e.target.value)}
              />
            </div>

            {/* Industry */}
            <div>
              <label className={labelClass}>Industry</label>
              <div className="relative">
                {!showCreateIndustry && industries.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      className={selectClass("industryType")}
                      value={formData.industryType}
                      onChange={(e) => updateField("industryType", e.target.value)}
                    >
                      <option value="">Select industry</option>
                      {industries.map((ind) => (
                        <option key={ind.id} value={ind.name}>
                          {ind.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCreateIndustry(true)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isDark
                          ? "bg-[#262626] border-gray-700 text-gray-200 hover:bg-gray-700"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                      title="Create new industry"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter industry name"
                      className={inputClass("industry")}
                      value={newIndustryName}
                      onChange={(e) => {
                        setNewIndustryName(e.target.value);
                        updateField("industryType", e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateIndustry();
                        } else if (e.key === "Escape") {
                          setShowCreateIndustry(false);
                          setNewIndustryName("");
                          updateField("industryType", "");
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateIndustry}
                      disabled={!newIndustryName.trim() || isCreatingIndustry}
                      className="px-3 py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Create industry"
                    >
                      {isCreatingIndustry ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateIndustry(false);
                        setNewIndustryName("");
                      }}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        isDark
                          ? "bg-[#262626] border-gray-700 text-gray-200 hover:bg-gray-700"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
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
                  Updating...
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
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Update Lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

