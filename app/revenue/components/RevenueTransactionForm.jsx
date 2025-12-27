"use client";

import { useState, useEffect } from "react";
import { useTheme } from "../../context/themeContext";
import { Save, Loader2, X } from "lucide-react";

export default function RevenueTransactionForm({ onSuccess, onCancel, leadId: initialLeadId }) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [leads, setLeads] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    lead_id: initialLeadId || "",
    sales_person_id: "",
    amount: "",
    status: "pending",
    closed_date: "",
  });

  // Load leads and sales persons on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [leadsRes, salesPersonsRes] = await Promise.all([
          fetch("/api/leads"),
          fetch("/api/sales-persons"),
        ]);

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setLeads(leadsData || []);
        }

        if (salesPersonsRes.ok) {
          const salesPersonsData = await salesPersonsRes.json();
          setSalesPersons(salesPersonsData || []);
        }
      } catch (err) {
        // Silently handle error
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear closed_date if status is not "closed"
    if (field === "status" && value !== "closed") {
      setFormData((prev) => ({
        ...prev,
        closed_date: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      // Remove closed_date if status is not closed
      if (payload.status !== "closed") {
        delete payload.closed_date;
      }

      const response = await fetch("/api/admin/revenue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create revenue transaction");
      }

      setSuccess("Revenue transaction created successfully!");
      if (onSuccess) {
        onSuccess(data.data);
      }

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          lead_id: "",
          sales_person_id: "",
          amount: "",
          status: "pending",
          closed_date: "",
        });
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Lead Selection */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
          Lead *
        </label>
        <select
          value={formData.lead_id}
          onChange={(e) => handleInputChange("lead_id", e.target.value)}
          required
          className={`w-full px-3 py-2 rounded-lg border ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
          } focus:outline-none focus:ring-2 focus:ring-orange-500`}
        >
          <option value="">Select a lead</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.lead_name || lead.name} - {lead.email}
            </option>
          ))}
        </select>
      </div>

      {/* Sales Person */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
          Sales Person *
        </label>
        <select
          value={formData.sales_person_id}
          onChange={(e) => handleInputChange("sales_person_id", e.target.value)}
          required
          className={`w-full px-3 py-2 rounded-lg border ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
          } focus:outline-none focus:ring-2 focus:ring-orange-500`}
        >
          <option value="">Select a sales person</option>
          {salesPersons.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name || sp.full_name || sp.email} {sp.id ? `(${sp.id})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
          Amount (₹) *
        </label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={formData.amount}
          onChange={(e) => handleInputChange("amount", e.target.value)}
          required
          className={`w-full px-3 py-2 rounded-lg border ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
          } focus:outline-none focus:ring-2 focus:ring-orange-500`}
          placeholder="0.00"
        />
      </div>

      {/* Status */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
          Status *
        </label>
        <select
          value={formData.status}
          onChange={(e) => handleInputChange("status", e.target.value)}
          required
          className={`w-full px-3 py-2 rounded-lg border ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
          } focus:outline-none focus:ring-2 focus:ring-orange-500`}
        >
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Closed Date (only if status is closed) */}
      {formData.status === "closed" && (
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            Closed Date *
          </label>
          <input
            type="date"
            value={formData.closed_date}
            onChange={(e) => handleInputChange("closed_date", e.target.value)}
            required={formData.status === "closed"}
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === "dark"
                ? "bg-[#1a1a1a] border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            } focus:outline-none focus:ring-2 focus:ring-orange-500`}
          />
        </div>
      )}

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
              Creating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Create Transaction
            </>
          )}
        </button>
      </div>
    </form>
  );
}

