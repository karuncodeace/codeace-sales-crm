"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTheme } from "../../../context/themeContext";
import useSWR from "swr";
import { Search, X } from "lucide-react";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function BookingForm({ eventType, selectedSlot, onBookingSuccess, slug }) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    lead_id: "",
    is_email_required: false,
  });
  const [leadSearchTerm, setLeadSearchTerm] = useState("");
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false);
  const leadDropdownRef = useRef(null);
  const isTypingRef = useRef(false);

  // Fetch leads for dropdown
  const { data: leadsData, error: leadsError, isLoading: leadsLoading } = useSWR("/api/leads", fetcher);
  // Filter out disqualified leads from the UI
  const leads = Array.isArray(leadsData) 
    ? leadsData.filter((lead) => 
        lead.status !== "Disqualified" && 
        lead.status !== "Junk" && 
        lead.status !== "Junk Lead"
      )
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (leadDropdownRef.current && !leadDropdownRef.current.contains(event.target)) {
        setIsLeadDropdownOpen(false);
      }
    };

    if (isLeadDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLeadDropdownOpen]);

  // Filter leads based on search term
  const filteredLeads = useMemo(() => {
    if (!leadSearchTerm.trim()) {
      // Show all leads when search is empty
      return leads;
    }
    
    const searchLower = leadSearchTerm.toLowerCase().trim();
    return leads.filter((lead) => {
      // Get all searchable fields
      const leadId = String(lead.id || "").toLowerCase();
      const leadName = String(lead.name || lead.lead_name || "").toLowerCase();
      const contactName = String(lead.contactName || lead.contact_name || "").toLowerCase();
      const email = String(lead.email || "").toLowerCase();
      const phone = String(lead.phone || "").toLowerCase();
      
      // Create combined search text (matches the display format)
      const combinedDisplay = `${leadId}, ${contactName}, ${leadName}`.toLowerCase();
      
      // Search across all fields including combined display
      return (
        leadId.includes(searchLower) ||
        leadName.includes(searchLower) ||
        contactName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower) ||
        combinedDisplay.includes(searchLower)
      );
    });
  }, [leads, leadSearchTerm]);

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
  const handleLeadSelect = (leadId) => {
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
        // Update search term to show selected lead
        const contactName = selectedLead.contactName || selectedLead.contact_name || "";
        const leadName = selectedLead.name || selectedLead.lead_name || "";
        setLeadSearchTerm(`${leadId}, ${contactName}, ${leadName}`);
      }
    } else {
      // Clear email and phone if no lead is selected
      setFormData((prev) => ({
        ...prev,
        lead_id: "",
        email: "",
        phone: "",
      }));
      setLeadSearchTerm("");
    }
    setIsLeadDropdownOpen(false);
  };

  // Format lead display: "lead no, contact name, lead name"
  const formatLeadDisplay = (lead) => {
    const leadId = lead.id || "";
    const contactName = lead.contactName || lead.contact_name || "";
    const leadName = lead.name || lead.lead_name || "";
    return `${leadId}, ${contactName}, ${leadName}`;
  };

  // Update search term when formData.lead_id changes (e.g., from external source)
  // Use a ref to track if user is actively typing to prevent interference
  useEffect(() => {
    // Don't update if user is currently typing
    if (isTypingRef.current) return;
    
    if (formData.lead_id && leads.length > 0) {
      const selectedLead = leads.find(lead => lead.id === formData.lead_id);
      if (selectedLead) {
        const formatted = formatLeadDisplay(selectedLead);
        // Only update if search term is empty or matches the formatted display
        setLeadSearchTerm((prev) => {
          if (!prev || prev === formatted) {
            return formatted;
          }
          return prev;
        });
      }
    } else if (!formData.lead_id) {
      // Only clear if no lead is selected and user is not typing
      setLeadSearchTerm((prev) => {
        if (!isTypingRef.current) {
          return "";
        }
        return prev;
      });
    }
  }, [formData.lead_id, leads]);

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

      const bookingPayload = {
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
        is_email_required: formData.is_email_required,
        // Include host_user_id (salesperson) when available. Support multiple possible field names.
        host_user_id:
          selectedLead.assigned_to ||
          selectedLead.assignedTo ||
          selectedLead.sales_person_id ||
          selectedLead.salesperson_id ||
          null,
      };

      // Log booking details before sending
      const formattedStartTime = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(selectedSlot.start));

      console.log("📅 Booking Request Details:", {
        eventType: eventType.title || eventType.name || "N/A",
        eventTypeId: eventType.id,
        selectedSlot: {
          start: selectedSlot.start,
          end: selectedSlot.end,
          formattedStart: formattedStartTime,
        },
        invitee: {
          name: leadName,
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          contactName: contactName,
        },
        lead: {
          lead_id: formData.lead_id,
          leadName: leadName,
        },
        emailConfirmation: formData.is_email_required,
        timezone: timezone,
        fullPayload: bookingPayload,
      });

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Booking Error:", errorData);
        throw new Error(errorData.error || "Failed to create booking");
      }

      const bookingData = await response.json();
      
      // Log booking response details
      console.log("✅ Booking Created Successfully:", {
        bookingId: bookingData.id,
        eventTypeId: bookingData.event_type_id,
        startTime: bookingData.start_time,
        endTime: bookingData.end_time,
        timezone: bookingData.timezone,
        status: bookingData.status,
        invitee: {
          name: bookingData.invitee_name,
          email: bookingData.invitee_email,
          phone: bookingData.invitee_phone,
          contactName: bookingData.invitiee_contact_name,
        },
        leadId: bookingData.lead_id,
        emailRequired: bookingData.is_email_required,
        googleCalendarEventId: bookingData.google_calendar_event_id,
        meetLink: bookingData.meet_link,
        fullBookingData: bookingData,
      });
      
      // Reset form after successful booking
      setFormData({
        email: "",
        phone: "",
        lead_id: "",
        is_email_required: false,
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
        {/* Lead Selection - First Field with Search */}
        <div className="relative" ref={leadDropdownRef}>
          <label
            htmlFor="lead_search"
            className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-white"} mb-1`}
          >
            Lead <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === "light" ? "text-gray-400" : "text-gray-500"}`} />
              <input
                type="text"
                id="lead_search"
                value={leadSearchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  
                  // Mark that user is typing
                  isTypingRef.current = true;
                  
                  // Update search term immediately
                  setLeadSearchTerm(value);
                  setIsLeadDropdownOpen(true);
                  
                  // Clear lead_id if user is typing something different from the selected lead
                  if (formData.lead_id) {
                    const selectedLead = leads.find(lead => lead.id === formData.lead_id);
                    if (selectedLead) {
                      const formatted = formatLeadDisplay(selectedLead);
                      // If typed value doesn't match the selected lead's display, clear the selection
                      if (value !== formatted) {
                        setFormData((prev) => ({ ...prev, lead_id: "" }));
                      }
                    }
                  }
                  
                  // Clear lead_id if search is empty
                  if (!value.trim()) {
                    setFormData((prev) => ({ ...prev, lead_id: "" }));
                  }
                  
                  // Reset typing flag after a short delay
                  setTimeout(() => {
                    isTypingRef.current = false;
                  }, 300);
                }}
                onFocus={(e) => {
                  setIsLeadDropdownOpen(true);
                  // If a lead is selected and search term is empty, populate it
                  if (formData.lead_id && !leadSearchTerm) {
                    const selectedLead = leads.find(lead => lead.id === formData.lead_id);
                    if (selectedLead) {
                      const formatted = formatLeadDisplay(selectedLead);
                      setLeadSearchTerm(formatted);
                    }
                  }
                }}
                disabled={leadsLoading || !selectedSlot}
                placeholder={leadsLoading ? "Loading leads..." : "Search by lead ID, name, contact, email, or phone"}
                className={`
                  w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none ${theme === "light" ? "focus:ring-gray-800" : "focus:ring-gray-500"} focus:border-transparent
                  ${
                    errors.lead_id
                      ? `${theme === "light" ? "border-red-300" : "border-red-500"}`
                      : `${theme === "light" ? "border-gray-200" : "border-gray-700"}`
                  }
                  ${leadsLoading || !selectedSlot ? `${theme === "light" ? "bg-gray-100 cursor-not-allowed" : "bg-[#262626] cursor-not-allowed"}` : `${theme === "light" ? "bg-white" : "bg-[#262626]"}`}
                  ${theme === "light" ? "text-gray-900" : "text-white"}
                `}
              />
              {leadSearchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setLeadSearchTerm("");
                    setFormData((prev) => ({ ...prev, lead_id: "" }));
                    setIsLeadDropdownOpen(false);
                  }}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === "light" ? "text-gray-400 hover:text-gray-600" : "text-gray-500 hover:text-gray-300"}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Dropdown List */}
            {isLeadDropdownOpen && !leadsLoading && selectedSlot && (
              <div className={`absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border shadow-lg ${
                theme === "light" 
                  ? "bg-white border-gray-200" 
                  : "bg-[#262626] border-gray-700"
              }`}>
                {filteredLeads.length === 0 ? (
                  <div className={`px-4 py-3 text-sm ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                    {leadSearchTerm.trim() ? "No leads found matching your search" : "No leads available"}
                  </div>
                ) : (
                  filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => handleLeadSelect(lead.id)}
                      className={`w-full text-left px-4 py-2 hover:bg-orange-500 hover:text-white transition-colors ${
                        formData.lead_id === lead.id
                          ? theme === "light"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-orange-500/20 text-orange-400"
                          : theme === "light"
                            ? "text-gray-900"
                            : "text-white"
                      }`}
                    >
                      {formatLeadDisplay(lead)}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
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

        {/* Email Confirmation Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_email_required"
            name="is_email_required"
            checked={formData.is_email_required}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, is_email_required: e.target.checked }));
            }}
            disabled={!selectedSlot}
            className={`
              w-4 h-4 rounded border-2 focus:ring-2 focus:ring-orange-500
              ${
                !selectedSlot
                  ? "opacity-50 cursor-not-allowed"
                  : theme === "light"
                  ? "border-gray-300 text-orange-600 focus:ring-orange-500"
                  : "border-gray-600 text-orange-600 bg-[#262626] focus:ring-orange-500"
              }
            `}
          />
          <label
            htmlFor="is_email_required"
            className={`ml-2 text-sm font-medium ${
              !selectedSlot
                ? theme === "light"
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-500 cursor-not-allowed"
                : theme === "light"
                ? "text-gray-700 cursor-pointer"
                : "text-white cursor-pointer"
            }`}
          >
            Send confirmation email to the attendee
          </label>
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

