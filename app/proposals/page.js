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
    companyWebsite: "",
    companyEmail: "",
    companyPhone: "",
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
    milestones: [],
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
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const accent = { r: 249, g: 115, b: 22 };
    const lightGrey = { r: 240, g: 240, b: 240 };

    const addWrappedText = (text, x, y, maxWidth, fontSize = 10, fontStyle = "normal", color = { r: 0, g: 0, b: 0 }) => {
      doc.setTextColor(color.r, color.g, color.b);
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      const lines = doc.splitTextToSize(text || "", maxWidth);
      doc.text(lines, x, y);
      return lines.length * (fontSize * 0.45);
    };

    const addFooter = () => {
      const count = doc.internal.getNumberOfPages();
      for (let i = 1; i <= count; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        const a = formData.companyName || "Company";
        const w = formData.companyWebsite || "";
        const e = formData.companyEmail || "";
        const p = formData.companyPhone || "";
        const footerLeft = [a, w, e, p].filter(Boolean).join(" | ");
        doc.text(footerLeft, margin, pageHeight - 10);
        doc.text(`Page ${i} of ${count}`, pageWidth - margin, pageHeight - 10, { align: "right" });
      }
    };

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("PROPOSAL", margin, 40);
    doc.setFontSize(16);
    addWrappedText(formData.proposalTitle || "", margin, 60, pageWidth - 2 * margin, 16, "bold", accent);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Prepared for: ${formData.clientName || ""}`, margin, 80);
    doc.text(`Prepared by: ${formData.companyName || ""}`, margin, 88);
    doc.text(`Date: ${formData.proposalDate || ""}`, margin, 96);

    doc.addPage();
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text("Client Details", margin, 30);
    doc.text("Company Details", pageWidth / 2 + 10, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let y = 40;
    y += addWrappedText(`Name: ${formData.clientName || ""}`, margin, y, pageWidth / 2 - margin);
    y += addWrappedText(`Email: ${formData.clientEmail || ""}`, margin, y, pageWidth / 2 - margin);
    y += addWrappedText(`Phone: ${formData.clientPhone || ""}`, margin, y, pageWidth / 2 - margin);
    let y2 = 40;
    y2 += addWrappedText(`Company: ${formData.companyName || ""}`, pageWidth / 2 + 10, y2, pageWidth / 2 - margin);
    y2 += addWrappedText(`Website: ${formData.companyWebsite || ""}`, pageWidth / 2 + 10, y2, pageWidth / 2 - margin);
    y2 += addWrappedText(`Email: ${formData.companyEmail || ""}`, pageWidth / 2 + 10, y2, pageWidth / 2 - margin);
    y2 += addWrappedText(`Phone: ${formData.companyPhone || ""}`, pageWidth / 2 + 10, y2, pageWidth / 2 - margin);
    const introTop = Math.max(y, y2) + 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text("Introduction", margin, introTop);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    addWrappedText(`Dear Sir,\n\n${formData.overview || ""}`, margin, introTop + 8, pageWidth - 2 * margin);

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text("Scope of Work", margin, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const sections = (formData.overview || "").split(/\n\n+/).filter(Boolean);
    let sy = 40;
    sections.forEach((s, idx) => {
      const title = `Section ${idx + 1}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      sy += addWrappedText(title, margin, sy, pageWidth - 2 * margin, 11, "bold");
      doc.setFont("helvetica", "normal");
      sy += addWrappedText(s, margin, sy, pageWidth - 2 * margin);
      sy += 6;
      if (sy > pageHeight - 30) {
        doc.addPage();
        sy = 30;
      }
    });

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text("Pricing & Payment Terms", margin, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setFillColor(lightGrey.r, lightGrey.g, lightGrey.b);
    doc.rect(margin, 40, pageWidth - 2 * margin, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Description", margin + 2, 46);
    doc.text("Qty", pageWidth - 120, 46);
    doc.text("Unit Price", pageWidth - 90, 46);
    doc.text("Total", pageWidth - 50, 46);
    let ty = 56;
    doc.setFont("helvetica", "normal");
    formData.items.forEach((item) => {
      if (item.description) {
        const descLines = doc.splitTextToSize(item.description, pageWidth - 150);
        doc.text(descLines, margin + 2, ty);
        doc.text(String(item.quantity || 0), pageWidth - 120, ty);
        doc.text(`$${Number(item.unitPrice || 0).toFixed(2)}`, pageWidth - 90, ty, { align: "left" });
        doc.text(`$${Number(item.total || 0).toFixed(2)}`, pageWidth - 50, ty, { align: "left" });
        ty += Math.max(descLines.length * 5, 8) + 2;
      }
    });
    const subtotal = calculateSubtotal();
    if (subtotal > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setDrawColor(accent.r, accent.g, accent.b);
      doc.rect(pageWidth - margin - 70, ty + 6, 70, 12);
      doc.text("Estimated Project Cost", pageWidth - margin - 68, ty + 12);
      doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 68, ty + 18);
    }
    let my = ty + 30;
    if (formData.milestones && formData.milestones.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(accent.r, accent.g, accent.b);
      doc.text("Payment Milestones", margin, my);
      doc.setTextColor(0, 0, 0);
      my += 8;
      formData.milestones.forEach((m) => {
        doc.rect(margin, my, pageWidth - 2 * margin, 10);
        doc.text(`${m.label || "Milestone"} - ${m.amount || ""}`, margin + 2, my + 6);
        my += 14;
      });
    }

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text("Terms, SRS & Notes", margin, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let py = 40;
    doc.setFont("helvetica", "bold");
    doc.text("Project Objective", margin, py);
    doc.setFont("helvetica", "normal");
    py += addWrappedText(formData.overview || "", margin, py + 4, pageWidth - 2 * margin);
    py += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Scope", margin, py);
    doc.setFont("helvetica", "normal");
    py += addWrappedText((formData.overview || "").split(/\n\n+/).join("\n• "), margin, py + 4, pageWidth - 2 * margin);
    py += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Deliverables", margin, py);
    doc.setFont("helvetica", "normal");
    py += addWrappedText("As per scope sections.", margin, py + 4, pageWidth - 2 * margin);
    py += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Terms", margin, py);
    doc.setFont("helvetica", "normal");
    py += addWrappedText(formData.terms || "", margin, py + 4, pageWidth - 2 * margin);
    py += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, py);
    doc.setFont("helvetica", "normal");
    addWrappedText(formData.notes || "", margin, py + 4, pageWidth - 2 * margin);

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text("Acceptance & Signature", margin, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    addWrappedText("We hereby accept the terms and conditions outlined in this proposal.", margin, 42, pageWidth - 2 * margin);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, 70, pageWidth / 2, 70);
    doc.text("Signature", margin, 75);
    doc.line(pageWidth / 2 + 10, 70, pageWidth - margin, 70);
    doc.text("Date", pageWidth / 2 + 10, 75);

    addFooter();

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
                    Company Website
                  </label>
                  <input
                    type="text"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="https://www.example.com"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Company Email
                  </label>
                  <input
                    type="email"
                    name="companyEmail"
                    value={formData.companyEmail}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="sales@example.com"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Company Phone
                  </label>
                  <input
                    type="tel"
                    name="companyPhone"
                    value={formData.companyPhone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    placeholder="+91 0000000000"
                  />
                </div>
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

