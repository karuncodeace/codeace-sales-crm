"use client";

import { useState } from "react";
import { useTheme } from "../../../context/themeContext";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function BookingForm({ eventType, selectedSlot, onBookingSuccess, slug }) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    lead_id: "",
  });

  // Fetch leads for dropdown
  const { data: leadsData, error: leadsError, isLoading: leadsLoading } = useSWR("/api/leads", fetcher);
  const leads = Array.isArray(leadsData) ? leadsData : [];

  // Convert slug to title (e.g., "discovery-call" -> "Discovery Call")
  const slugToTitle = (slug) => {
    if (!slug) return "";
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const title = slugToTitle(slug);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // Phone is optional
    return /^[\d\s\-\+\(\)]+$/.test(phone);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || "" }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setSubmitError(null);
  };

  // Handle lead selection - auto-fill email and phone
  const handleLeadChange = (e) => {
    const leadId = e.target.value;
    setFormData((prev) => ({ ...prev, lead_id: leadId || "" }));
    
    // Clear error for lead_id
    if (errors.lead_id) {
      setErrors((prev) => ({ ...prev, lead_id: null }));
    }
    setSubmitError(null);

    // Auto-fill email and phone from selected lead
    if (leadId) {
      const selectedLead = leads.find(lead => lead.id === leadId);
      if (selectedLead) {
        setFormData((prev) => ({
          ...prev,
          lead_id: leadId,
          email: selectedLead.email || prev.email || "",
          phone: selectedLead.phone || prev.phone || "",
        }));
      }
    } else {
      // Clear email and phone if no lead is selected
      setFormData((prev) => ({
        ...prev,
        lead_id: "",
        email: "",
        phone: "",
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.lead_id || !formData.lead_id.trim()) {
      newErrors.lead_id = "Lead selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSlot) {
      setSubmitError("Please select a time slot");
      return;
    }

    if (!validate()) {
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Get the selected lead's name and contact name
      const selectedLead = leads.find(lead => lead.id === formData.lead_id);
      if (!selectedLead) {
        throw new Error("Selected lead not found");
      }
      const leadName = selectedLead.name || selectedLead.lead_name || "Guest";
      const contactName = selectedLead.contactName || selectedLead.contact_name || null;

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventTypeId: eventType.id,
          start: selectedSlot.start,
          end: selectedSlot.end,
          timezone: timezone,
          invitee: {
            name: leadName,
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
          },
          lead_id: formData.lead_id || null,
          invitiee_contact_name: contactName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create booking");
      }

      const bookingData = await response.json();
      
      // Reset form after successful booking
      setFormData({
        email: "",
        phone: "",
        lead_id: "",
      });
      setErrors({});
      setSubmitError(null);
      
      onBookingSuccess(bookingData);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format selected slot time in user's local timezone
  const formatSelectedTime = (isoString) => {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Intl.DateTimeFormat("en-US", {
      timeZone: userTimeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));
  };

  const isFormValid = formData.email.trim() && validateEmail(formData.email) && formData.lead_id && formData.lead_id.trim();
  const isDisabled = !selectedSlot || !isFormValid || loading;

  return (
    <div className={`${theme === "light" ? "bg-white border border-gray-200" : "bg-[#262626] border border-gray-700"} rounded-lg p-6`}>
      <h2 className={`text-lg font-semibold ${theme === "light" ? "text-gray-800" : "text-white"} mb-4`}>
        Booking Details
      </h2>

      {title && (
        <div className={`mb-4 p-3 ${theme === "light" ? "bg-gray-50" : "bg-[#1f1f1f]"} border ${theme === "light" ? "border-gray-200" : "border-gray-700"} rounded-md`}>
          <label className={`block text-xs font-medium ${theme === "light" ? "text-gray-500" : "text-gray-400"} mb-1`}>
            Event Type
          </label>
          <p className={`text-base font-medium ${theme === "light" ? "text-gray-800" : "text-white"}`}>
            {title}
          </p>
        </div>
      )}

      {!selectedSlot && (
          <div className={`mb-4 p-3 ${theme === "light" ? "bg-gray-100 border border-gray-200" : "bg-[#262626] border border-gray-700"}  rounded-md`}>
          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-500"}`}>
            Please select a time slot to continue
          </p>
        </div>
      )}

      {selectedSlot && (
        <div className={`mb-4 p-3 ${theme === "light" ? "bg-white" : "bg-[#262626]"} border ${theme === "light" ? "border-gray-200" : "border-gray-700"} rounded-md`}>
          <p className={`text-sm font-medium ${theme === "light" ? "text-gray-800" : "text-white"}`} placeholder="Selected Time">
            {formatSelectedTime(selectedSlot.start)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lead Selection - First Field */}
        <div>
          <label
            htmlFor="lead_id"
            className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-white"} mb-1`}
          >
            Lead <span className="text-red-500">*</span>
          </label>
          <select
            id="lead_id"
            name="lead_id"
            value={formData.lead_id || ""}
            onChange={handleLeadChange}
            disabled={leadsLoading || !selectedSlot}
            className={`
              w-full px-4 py-2 border rounded-md focus:outline-none ${theme === "light" ? "focus:ring-gray-800" : "focus:ring-gray-500"} focus:border-transparent
              ${
                errors.lead_id
                  ? `${theme === "light" ? "border-red-300" : "border-red-500"}`
                  : `${theme === "light" ? "border-gray-200" : "border-gray-700"}`
              }
              ${leadsLoading || !selectedSlot ? `${theme === "light" ? "bg-gray-100 cursor-not-allowed" : "bg-[#262626] cursor-not-allowed"}` : `${theme === "light" ? "bg-white" : "bg-[#262626]"}`}
              ${theme === "light" ? "text-gray-900" : "text-white"}
            `}
          >
            <option value="">
              {leadsLoading ? "Loading leads..." : "Select a lead"}
            </option>
            {leads.length === 0 && !leadsLoading && (
              <option value="" disabled>No leads available</option>
            )}
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.id} - {lead.name || lead.lead_name || "Unnamed Lead"}
              </option>
            ))}
          </select>
          {errors.lead_id && (
            <p className={`mt-1 text-sm ${theme === "light" ? "text-red-600" : "text-red-500"}`}>{errors.lead_id}</p>
          )}
          {leadsError && (
            <p className={`mt-1 text-sm ${theme === "light" ? "text-red-600" : "text-red-500"}`}>
              Unable to load leads. Please refresh the page.
            </p>
          )}
          {!leadsLoading && leads.length === 0 && !leadsError && (
            <p className={`mt-1 text-sm ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
              No leads found. Please create a lead first.
            </p>
          )}
        </div>

        {/* Email - Second Field */}
        <div>
          <label
            htmlFor="email"
            className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-white"} mb-1`}
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || ""}
            onChange={handleChange}
            disabled={!selectedSlot}
            className={`
              w-full px-4 py-2 border rounded-md focus:outline-none  ${theme === "light" ? "focus:ring-gray-800" : "focus:ring-gray-500"} focus:border-transparent
              ${
                errors.email
                  ? `${theme === "light" ? "border-red-300" : "border-red-500"}`
                  : `${theme === "light" ? "border-gray-200" : "border-gray-700"}`
              }
              ${!selectedSlot ? `${theme === "light" ? "bg-gray-100 cursor-not-allowed" : "bg-[#262626] cursor-not-allowed"}` : `${theme === "light" ? "bg-white" : "bg-[#262626]"}`}
            `}
            placeholder="your.email@example.com"
          />
          {errors.email && (
            <p className={`mt-1 text-sm ${theme === "light" ? "text-red-600" : "text-red-500"}`}>{errors.email}</p>
          )}
        </div>

        {/* Phone - Third Field */}
        <div>
          <label
            htmlFor="phone"
            className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-white"} mb-1`}
          >
            Phone <span className={`${theme === "light" ? "text-gray-400" : "text-gray-500"}`}>(optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone || ""}
            onChange={handleChange}
            disabled={!selectedSlot}
            className={`
              w-full px-4 py-2 border rounded-md focus:outline-none  ${theme === "light" ? "focus:ring-gray-800" : "focus:ring-gray-500"} focus:border-transparent
              ${
                errors.phone
                  ? `${theme === "light" ? "border-red-300" : "border-red-500"}`
                  : `${theme === "light" ? "border-gray-200" : "border-gray-700"}`
              }
              ${!selectedSlot ? `${theme === "light" ? "bg-gray-100 cursor-not-allowed" : "bg-[#262626] cursor-not-allowed"}` : `${theme === "light" ? "bg-white" : "bg-[#262626]"}`}
            `}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && (
            <p className={`mt-1 text-sm ${theme === "light" ? "text-red-600" : "text-red-500"}`}>{errors.phone}</p>
          )}
        </div>

        {submitError && (
          <div className={`p-3 ${theme === "light" ? "bg-red-50 border border-red-200" : "bg-[#262626] border border-red-500"} rounded-md`}>
            <p className={`text-sm ${theme === "light" ? "text-red-600" : "text-red-500"}`}>{submitError}</p>
          </div>
        )}

       <div className="flex justify-end">
       <button
          type="submit"
          disabled={isDisabled}
          className={`
             py-3 px-4 flex items-center justify-center rounded-md font-medium ${theme === "light" ? "text-white" : "text-white"} transition-all cursor-pointer
            ${
              isDisabled
                ? `${theme === "light" ? "bg-gray-400 cursor-not-allowed text-white" : "bg-orange-500 cursor-not-allowed text-white"}`
                : `${theme === "light" ? "bg-orange-500 hover:bg-orange-600" : "bg-orange-500 hover:bg-orange-600 text-white"}`
            }
          `}
        >
          {loading ? "Booking..." : "Confirm Booking"}
        </button> 
       </div>
      </form>
    </div>
  );
}

