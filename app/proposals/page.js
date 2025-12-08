"use client";

import { useState } from "react";
import { useTheme } from "../context/themeContext";
import { FileText, Download, Plus, Trash2, Save } from "lucide-react";
import jsPDF from "jspdf";

export default function ProposalPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [formData, setFormData] = useState({
    companyName: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    proposalTitle: "",
    proposalDate: new Date().toISOString().split("T")[0],
    proposalNumber: "",
    overview: "",
    terms: "",
    notes: "",
    items: [
      { description: "", quantity: 1, unitPrice: 0, total: 0 },
    ],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === "quantity" || field === "unitPrice" ? parseFloat(value) || 0 : value;
    
    // Calculate total
    newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    
    setFormData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Helper function to add text with word wrap
    const addText = (text, x, y, maxWidth, fontSize = 10, fontStyle = "normal") => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      const lines = doc.splitTextToSize(text || "", maxWidth);
      doc.text(lines, x, y);
      return lines.length * (fontSize * 0.4);
    };

    // Header
    doc.setFillColor(255, 140, 0); // Orange color
    doc.rect(0, 0, pageWidth, 50, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSAL", margin, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formData.proposalDate || "N/A"}`, pageWidth - margin - 40, 20);
    if (formData.proposalNumber) {
      doc.text(`Proposal #: ${formData.proposalNumber}`, pageWidth - margin - 40, 28);
    }

    yPosition = 60;

    // Client Information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Client Information", margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (formData.companyName) {
      yPosition += addText(`Company: ${formData.companyName}`, margin, yPosition, pageWidth - 2 * margin);
    }
    if (formData.clientName) {
      yPosition += addText(`Name: ${formData.clientName}`, margin, yPosition, pageWidth - 2 * margin);
    }
    if (formData.clientEmail) {
      yPosition += addText(`Email: ${formData.clientEmail}`, margin, yPosition, pageWidth - 2 * margin);
    }
    if (formData.clientPhone) {
      yPosition += addText(`Phone: ${formData.clientPhone}`, margin, yPosition, pageWidth - 2 * margin);
    }

    yPosition += 10;

    // Proposal Title
    if (formData.proposalTitle) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      yPosition += addText(formData.proposalTitle, margin, yPosition, pageWidth - 2 * margin, 16, "bold");
      yPosition += 5;
    }

    // Overview
    if (formData.overview) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      yPosition += addText("Overview", margin, yPosition, pageWidth - 2 * margin, 12, "bold");
      yPosition += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPosition += addText(formData.overview, margin, yPosition, pageWidth - 2 * margin);
      yPosition += 10;
    }

    // Items/Services Table
    const hasItems = formData.items.some(item => item.description);
    if (hasItems) {
      // Check if we need a new page
      if (yPosition > 200) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      yPosition += addText("Services / Items", margin, yPosition, pageWidth - 2 * margin, 12, "bold");
      yPosition += 8;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, "F");
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Description", margin + 2, yPosition);
      doc.text("Qty", pageWidth - 120, yPosition);
      doc.text("Unit Price", pageWidth - 90, yPosition);
      doc.text("Total", pageWidth - 50, yPosition);
      yPosition += 10;

      // Table rows
      doc.setFont("helvetica", "normal");
      formData.items.forEach((item) => {
        if (item.description) {
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = margin;
          }

          const descLines = doc.splitTextToSize(item.description, pageWidth - 150);
          const itemHeight = Math.max(descLines.length * 5, 8);
          
          doc.setFontSize(9);
          doc.text(descLines, margin + 2, yPosition);
          doc.text(item.quantity.toString(), pageWidth - 120, yPosition);
          doc.text(`$${item.unitPrice.toFixed(2)}`, pageWidth - 90, yPosition);
          doc.text(`$${item.total.toFixed(2)}`, pageWidth - 50, yPosition);
          
          yPosition += itemHeight + 2;
        }
      });

      yPosition += 5;

      // Subtotal
      const subtotal = calculateSubtotal();
      if (subtotal > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Subtotal:", pageWidth - 90, yPosition);
        doc.text(`$${subtotal.toFixed(2)}`, pageWidth - 50, yPosition);
        yPosition += 10;
      }
    }

    // Terms and Conditions
    if (formData.terms) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      yPosition += addText("Terms and Conditions", margin, yPosition, pageWidth - 2 * margin, 12, "bold");
      yPosition += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPosition += addText(formData.terms, margin, yPosition, pageWidth - 2 * margin);
      yPosition += 10;
    }

    // Notes
    if (formData.notes) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      yPosition += addText("Notes", margin, yPosition, pageWidth - 2 * margin, 12, "bold");
      yPosition += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPosition += addText(formData.notes, margin, yPosition, pageWidth - 2 * margin);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    // Download PDF
    const fileName = formData.proposalTitle
      ? `${formData.proposalTitle.replace(/[^a-z0-9]/gi, "_")}_${formData.proposalDate}.pdf`
      : `Proposal_${formData.proposalDate}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
      <div className="pl-5 md:pl-0 2xl:pl-0 w-full mt-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Create Proposal
          </h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Fill in the required fields and download your proposal as PDF
          </p>
        </div>

        {/* Form */}
        <div className={`rounded-lg border ${isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Company Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="Enter company name"
                  />
                </div>

                {/* Client Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="Enter client name"
                  />
                </div>

                {/* Client Email */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Client Email
                  </label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="client@example.com"
                  />
                </div>

                {/* Client Phone */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Proposal Title */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Proposal Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="proposalTitle"
                    value={formData.proposalTitle}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="e.g., Website Development Proposal"
                  />
                </div>

                {/* Proposal Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Proposal Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="proposalDate"
                    value={formData.proposalDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  />
                </div>

                {/* Proposal Number */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Proposal Number
                  </label>
                  <input
                    type="text"
                    name="proposalNumber"
                    value={formData.proposalNumber}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="PROP-2024-001"
                  />
                </div>
              </div>
            </div>

            {/* Overview */}
            <div className="mt-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Overview / Description
              </label>
              <textarea
                name="overview"
                value={formData.overview}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Describe the proposal, project scope, or services being offered..."
              />
            </div>

            {/* Items/Services */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <label className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Services / Items
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    isDark
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-12 md:col-span-5">
                        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            isDark
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                              : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                          } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                          placeholder="Service or item description"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            isDark
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                              : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                          } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Unit Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            isDark
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                              : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                          } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Total
                        </label>
                        <input
                          type="text"
                          value={`$${item.total.toFixed(2)}`}
                          readOnly
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            isDark
                              ? "bg-gray-700 border-gray-600 text-gray-400"
                              : "bg-gray-100 border-gray-300 text-gray-600"
                          }`}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={formData.items.length === 1}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark
                              ? "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              : "bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal */}
              {calculateSubtotal() > 0 && (
                <div className="mt-4 flex justify-end">
                  <div className={`px-4 py-2 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                    <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Subtotal: <span className="text-lg font-bold">${calculateSubtotal().toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="mt-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Terms and Conditions
              </label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Payment terms, delivery timeline, warranty, etc..."
              />
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Any additional information or special notes..."
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex items-center justify-end gap-4 pt-6 border-t border-gray-700">
              <button
                onClick={generatePDF}
                disabled={!formData.companyName || !formData.clientName || !formData.proposalTitle || !formData.proposalDate}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  isDark
                    ? "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

