"use client";

import { useState } from "react";

export default function BookingForm({ eventType, selectedSlot, onBookingSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
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
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setSubmitError(null);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
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
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create booking");
      }

      const bookingData = await response.json();
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

  const isFormValid = formData.name.trim() && formData.email.trim() && validateEmail(formData.email);
  const isDisabled = !selectedSlot || !isFormValid || loading;

  return (
    <div className="bg-white  rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Booking Details
      </h2>

      {!selectedSlot && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">
            Please select a time slot to continue
          </p>
        </div>
      )}

      {selectedSlot && (
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-md">
          <p className="text-sm font-medium text-gray-800" placeholder="Selected Time">
            {formatSelectedTime(selectedSlot.start)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={!selectedSlot}
            className={`
              w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent
              ${
                errors.name
                  ? "border-red-300"
                  : "border-gray-200"
              }
              ${!selectedSlot ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
            `}
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={!selectedSlot}
            className={`
              w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent
              ${
                errors.email
                  ? "border-red-300"
                  : "border-gray-200"
              }
              ${!selectedSlot ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
            `}
            placeholder="your.email@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={!selectedSlot}
            className={`
              w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent
              ${
                errors.phone
                  ? "border-red-300"
                  : "border-gray-200"
              }
              ${!selectedSlot ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
            `}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

       <div className="flex justify-end">
       <button
          type="submit"
          disabled={isDisabled}
          className={`
            w-[25%] py-3 px-4 flex items-center justify-center rounded-md font-medium text-white transition-all cursor-pointer
            ${
              isDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600"
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

