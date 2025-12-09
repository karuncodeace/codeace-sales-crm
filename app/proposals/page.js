"use client";

import { useState, useRef, useMemo } from "react";
import { useTheme } from "../context/themeContext";
import { FileText, Download, Plus, Trash2, Save, Bold, Italic, Underline, List } from "lucide-react";
import jsPDF from "jspdf";

export const dynamic = "force-dynamic";

export default function ProposalPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const scopeEditorRef = useRef(null);
  const conclusionEditorRef = useRef(null);

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
    mainTitle: "",
    subTitle: "",
    technology: "",
    clientOrganization: "",
    organizationCategory: "",
    scopeDescription: "",
    pricingRows: [{ description: "", amount: "" }],
    timelineMonths: "",
    timelineWeeks: "",
    timelinePhases: [{ week: "", phase: "" }],
    conclusionNotes: "",
    creatorName: "",
    creatorPhone: "",
    creatorDesignation: "",
  });

  const [activeTab, setActiveTab] = useState("Details");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatCurrencyInput = (value) => {
    if (!value && value !== 0) return '';
    // Remove all non-digit characters except decimal point
    let cleaned = value.toString().replace(/[^\d.]/g, '');
    // Remove leading zeros (but keep single zero or zero before decimal)
    cleaned = cleaned.replace(/^0+(?=\d)/, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const parseCurrencyValue = (value) => {
    const cleaned = formatCurrencyInput(value);
    return parseFloat(cleaned) || 0;
  };

  const calculateSubtotal = () => {
    if (Array.isArray(formData.pricingRows) && formData.pricingRows.length) {
      return formData.pricingRows.reduce((sum, r) => sum + parseCurrencyValue(r.amount || 0), 0);
    }
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const addPricingRow = () => {
    setFormData((prev) => ({ ...prev, pricingRows: [...(prev.pricingRows || []), { description: "", amount: "" }] }));
  };

  const updatePricingRow = (idx, field, value) => {
    const rows = [...(formData.pricingRows || [])];
    if (field === "amount") {
      const cleaned = formatCurrencyInput(value);
      rows[idx] = { ...rows[idx], [field]: cleaned };
    } else {
      rows[idx] = { ...rows[idx], [field]: value };
    }
    setFormData((prev) => ({ ...prev, pricingRows: rows }));
  };

    const removePricingRow = (idx) => {
      const rows = [...(formData.pricingRows || [])];
      rows.splice(idx, 1);
      setFormData((prev) => ({ ...prev, pricingRows: rows.length ? rows : [{ description: "", amount: "" }] }));
    };

  const addTimelinePhase = () => {
    setFormData((prev) => ({ ...prev, timelinePhases: [...(prev.timelinePhases || []), { week: "", phase: "" }] }));
  };

  const updateTimelinePhase = (idx, field, value) => {
    const rows = [...(formData.timelinePhases || [])];
    rows[idx] = { ...rows[idx], [field]: value };
    setFormData((prev) => ({ ...prev, timelinePhases: rows }));
  };

  const removeTimelinePhase = (idx) => {
    const rows = [...(formData.timelinePhases || [])];
    rows.splice(idx, 1);
    setFormData((prev) => ({ ...prev, timelinePhases: rows.length ? rows : [{ week: "", phase: "" }] }));
  };

  // Rich text editor component
  const RichTextEditor = ({ value, onChange, placeholder, editorRef }) => {
    const execCommand = (command, value = null) => {
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand(command, false, value);
      }
    };

    const handleInput = () => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        onChange(html);
      }
    };

    const handleKeyDown = (e) => {
      // Allow Ctrl+B, Ctrl+I, Ctrl+U for formatting
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') {
          e.preventDefault();
          execCommand('bold');
        } else if (e.key === 'i') {
          e.preventDefault();
          execCommand('italic');
        } else if (e.key === 'u') {
          e.preventDefault();
          execCommand('underline');
        }
      }
    };

    return (
      <div className={`border rounded-lg overflow-hidden ${isDark ? "border-gray-700" : "border-gray-300"}`}>
        {/* Toolbar */}
        <div className={`flex gap-1 p-2 border-b ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              execCommand('bold');
            }}
            className={`p-2 rounded hover:bg-opacity-80 ${isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-700"}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              execCommand('italic');
            }}
            className={`p-2 rounded hover:bg-opacity-80 ${isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-700"}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              execCommand('underline');
            }}
            className={`p-2 rounded hover:bg-opacity-80 ${isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-700"}`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <div className={`w-px mx-1 ${isDark ? "bg-gray-700" : "bg-gray-300"}`} />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              execCommand('insertUnorderedList');
            }}
            className={`p-2 rounded hover:bg-opacity-80 ${isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-700"}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              execCommand('insertOrderedList');
            }}
            className={`p-2 rounded hover:bg-opacity-80 ${isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-700"}`}
            title="Numbered List"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={`min-h-[300px] w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
            isDark 
              ? "bg-gray-800 text-white placeholder-gray-500" 
              : "bg-white text-gray-900 placeholder-gray-400"
          }`}
          dangerouslySetInnerHTML={{ __html: value || "" }}
          data-placeholder={placeholder}
        />
      </div>
    );
  };

  const isDetailsValid = () => {
    const f = formData;
    return f.mainTitle && f.proposalDate && f.subTitle && f.technology && f.clientName && f.clientOrganization && f.organizationCategory;
  };

  const isTimelineValid = () => {
    return formData.timelineMonths && formData.timelineWeeks;
  };

  const isConclusionValid = () => {
    const f = formData;
    return f.creatorName && f.creatorPhone && f.creatorDesignation;
  };

  const isFormValid = () => isDetailsValid() && isTimelineValid() && isConclusionValid();

  const addHeader = (doc, pageWidth, headerHeight) => {
    try {
      const headerImg = "/pdf/header.png";
      doc.addImage(headerImg, "PNG", 0, 0, pageWidth, headerHeight);
    } catch (err) {
      console.error("Error loading header:", err);
    }
  };

  const addFooter = (doc, pageWidth, pageHeight, footerHeight) => {
    try {
      const footerImg = "/pdf/footer.png";
      doc.addImage(footerImg, "PNG", 0, pageHeight - footerHeight, pageWidth, footerHeight);
    } catch (err) {
      console.error("Error loading footer:", err);
    }
  };

  const addWatermark = (doc, pageWidth, pageHeight) => {
    try {
      const watermarkImg = "/pdf/watermark.png";
      const watermarkSize = 80;
      const x = (pageWidth - watermarkSize) / 2;
      const y = (pageHeight - watermarkSize) / 2;
      // Add watermark with fast rendering mode
      doc.addImage(watermarkImg, "PNG", x, y, watermarkSize, watermarkSize, undefined, "FAST");
    } catch (err) {
      // Silently fail - watermark is optional
      console.error("Error loading watermark:", err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const stripHtml = (html) => {
    if (!html) return "";
    if (typeof document === "undefined") {
      return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    }
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const parseHtmlToText = (html) => {
    if (!html) return [];
    if (typeof document === "undefined") {
      // Fallback for server-side: simple regex to remove HTML tags
      const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
      return text ? [{ text, isListItem: false, isBold: false }] : [];
    }
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    
    // Extract text and preserve list structure and bold formatting
    const items = [];
    const processNode = (node, isBold = false, isListItem = false) => {
      if (node.nodeType === 3) { // Text node
        const text = node.textContent.trim();
        if (text) items.push({ text, isListItem, isBold });
      } else if (node.nodeType === 1) { // Element node
        const tagName = node.tagName.toLowerCase();
        const currentIsBold = isBold || tagName === "b" || tagName === "strong" || (node.style && node.style.fontWeight && (node.style.fontWeight === "bold" || parseInt(node.style.fontWeight) >= 700));
        
        if (tagName === "li") {
          Array.from(node.childNodes).forEach(child => processNode(child, currentIsBold, true));
        } else if (tagName === "ul" || tagName === "ol") {
          Array.from(node.childNodes).forEach(child => processNode(child, currentIsBold, false));
        } else if (tagName === "p" || tagName === "div") {
          const hasChildren = Array.from(node.childNodes).some(child => child.nodeType === 1);
          if (hasChildren) {
            Array.from(node.childNodes).forEach(child => processNode(child, currentIsBold, false));
          } else {
            const text = node.textContent.trim();
            if (text) items.push({ text, isListItem: false, isBold: currentIsBold });
          }
        } else {
          Array.from(node.childNodes).forEach(child => processNode(child, currentIsBold, isListItem));
        }
      }
    };
    
    Array.from(tmp.childNodes).forEach(node => processNode(node, false, false));
    return items.length > 0 ? items : [{ text: tmp.textContent || tmp.innerText || "", isListItem: false, isBold: false }];
  };

  const splitText = (doc, text, maxWidth, x, y) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    return { lines, y };
  };

  const generatePDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const headerHeight = 25; // Changed to 20mm as requested
    const footerHeight = 30;
    const contentStartY = headerHeight + 10;
    const contentEndY = pageHeight - footerHeight - 10;
    const maxContentWidth = pageWidth - 2 * marginX;

    // Helper function to add a new page with header/footer/watermark
    const addPage = () => {
      doc.addPage();
      addHeader(doc, pageWidth, headerHeight);
      addFooter(doc, pageWidth, pageHeight, footerHeight);
      addWatermark(doc, pageWidth, pageHeight);
      return contentStartY;
    };

    // Helper function to check if we need a new page
    const checkNewPage = (currentY, requiredSpace = 10) => {
      if (currentY + requiredSpace > contentEndY) {
        return addPage();
      }
      return currentY;
    };

    // PAGE 1: Cover Page
    addHeader(doc, pageWidth, headerHeight);
    addFooter(doc, pageWidth, pageHeight, footerHeight);
    addWatermark(doc, pageWidth, pageHeight);

    let y = contentStartY;

    // Main Title (centered, bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const mainTitle = formData.mainTitle || "";
    const titleLines = doc.splitTextToSize(mainTitle, maxContentWidth);
    titleLines.forEach((line, idx) => {
      doc.text(line, pageWidth / 2, y + (idx * 6), { align: "center" });
    });
    y += titleLines.length * 6 + 12; // Added more spacing after title

    // Date - with margin top
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = checkNewPage(y, 8);
    doc.text(`Date : ${formatDate(formData.proposalDate)}`, marginX, y);
    y += 8;

    // To section
    y = checkNewPage(y, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("To:", marginX, y);
    y += 5;
    doc.text(formData.clientOrganization || "", marginX, y);
    y += 5;
    if (formData.clientPhone) {
      doc.text(formData.clientPhone, marginX, y);
      y += 5;
    }
    y += 5;

    // From section
    y = checkNewPage(y, 20);
    doc.text("From:", marginX, y);
    y += 5;
    doc.text("CodeAce IT Solutions LLP", marginX, y);
    y += 5;
    doc.text("Sahya Building, Govt. Cyberpark,", marginX, y);
    y += 5;
    doc.text("Calicut, Kerala, India", marginX, y);
    y += 5;
    doc.text("Email: hello@axilume.com", marginX, y);
    y += 5;
    doc.text("Phone: +91 8089360215", marginX, y);
    y += 8;

    // Subject
    y = checkNewPage(y, 10);
    doc.setFont("helvetica", "bold");
    doc.text("Subject:", marginX, y);
    doc.setFont("helvetica", "normal");
    const subjectText = formData.subTitle || "";
    const subjectLines = doc.splitTextToSize(subjectText, maxContentWidth - 20);
    subjectLines.forEach((line, idx) => {
      doc.text(line, marginX + 20, y + (idx * 5));
    });
    y += subjectLines.length * 5 + 8;

    // Salutation
    y = checkNewPage(y, 10);
    doc.text("Dear Sir,", marginX, y);
    y += 8;

    // Body paragraphs
    y = checkNewPage(y, 15);
    const para1 = "We appreciate the opportunity to partner with you in digitizing and streamlining Medical Care operations.";
    const para1Lines = doc.splitTextToSize(para1, maxContentWidth);
    para1Lines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });
    y += 3;

    y = checkNewPage(y, 15);
    const para2 = `Based on the detailed RFP requirements, please find below our comprehensive quotation and proposal for the development and deployment of a custom solution using the ${formData.technology || "Frappe ERPNext Framework"} - the world's most agile open-source ERP platform.`;
    const para2Lines = doc.splitTextToSize(para2, maxContentWidth);
    para2Lines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });

    // PAGE 2: Scope of Work
    y = addPage();

    // Scope of Work Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Scope Of Work", marginX, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
    y += 10;

    // Introduction
    y = checkNewPage(y, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const introText = `Implementation of a fully functional ${formData.organizationCategory || "Medical Care"} ERP, CRM & HRMS tailored for ${formData.clientOrganization || ""}, featuring:`;
    const introLines = doc.splitTextToSize(introText, maxContentWidth);
    introLines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });
    y += 5;

    // Scope Description (parse HTML and convert to text with bullet points and bold formatting)
    if (formData.scopeDescription) {
      const scopeItems = parseHtmlToText(formData.scopeDescription);
      scopeItems.forEach((item) => {
        const prefix = item.isListItem ? "• " : "";
        const text = prefix + item.text;
        const textLines = doc.splitTextToSize(text, maxContentWidth - 5);
        textLines.forEach((line) => {
          y = checkNewPage(y, 5);
          // Set font style based on bold flag
          doc.setFont("helvetica", item.isBold ? "bold" : "normal");
          doc.text(line, marginX + 3, y);
          // Reset to normal font
          doc.setFont("helvetica", "normal");
          y += 5;
        });
        y += 2; // Add spacing between items
      });
    }

    // PAGE 3: Pricing Summary
    y = addPage();

    // Pricing Summary Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Pricing Summary", marginX, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
    y += 10;

    // Pricing rows table
    if (formData.pricingRows && formData.pricingRows.length > 0) {
      y = checkNewPage(y, 20);
      const tableStartY = y;
      const rowHeight = 8;
      const col1Width = 15; // No
      const col2Width = maxContentWidth - col1Width - 40; // Description
      const col3Width = 25; // Amount

      // Table header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("No", marginX, y);
      doc.text("Description", marginX + col1Width, y);
      doc.text("Amount", pageWidth - marginX - col3Width, y, { align: "right" });
      y += rowHeight;
      doc.setLineWidth(0.3);
      doc.line(marginX, y - 2, pageWidth - marginX, y - 2);

      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      formData.pricingRows.forEach((row, idx) => {
        y = checkNewPage(y, rowHeight);
        const rowStartY = y;
        doc.text(String(idx + 1), marginX, y);
        const descLines = doc.splitTextToSize(row.description || "", col2Width);
        let maxDescHeight = 0;
        descLines.forEach((line, lineIdx) => {
          if (lineIdx === 0) {
            doc.text(line, marginX + col1Width, y);
            maxDescHeight = Math.max(maxDescHeight, 5);
          } else {
            y = checkNewPage(y, rowHeight);
            doc.text(line, marginX + col1Width, y);
            maxDescHeight = Math.max(maxDescHeight, (lineIdx + 1) * 5);
          }
        });
        // Format amount properly
        const amountValue = parseCurrencyValue(row.amount || 0);
        const formattedAmount = amountValue.toLocaleString('en-IN', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 2 
        });
        const amount = `₹ ${formattedAmount}`;
        doc.text(amount, pageWidth - marginX, rowStartY, { align: "right" });
        y = Math.max(rowStartY + maxDescHeight, y) + 2;
      });

      // Total
      y = checkNewPage(y, 10);
      doc.setLineWidth(0.3);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      const total = formData.pricingRows.reduce((sum, r) => sum + parseCurrencyValue(r.amount || 0), 0);
      const formattedTotal = total.toLocaleString('en-IN', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
      });
      doc.text(`Total: ₹ ${formattedTotal}`, pageWidth - marginX, y, { align: "right" });
      y += 10;
    }

    // Payment Terms Section
    y = checkNewPage(y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Payment Terms (3 Milestone-Based Installments)", marginX, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
    y += 10;

    // Milestones
    if (formData.milestones && formData.milestones.length > 0) {
      formData.milestones.forEach((milestone, idx) => {
        y = checkNewPage(y, 15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const milestoneAmount = parseCurrencyValue(milestone.amount || 0);
        const formattedMilestoneAmount = milestoneAmount.toLocaleString('en-IN', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 2 
        });
        const milestoneText = `${milestone.title || `Milestone ${idx + 1}`} - ₹${formattedMilestoneAmount}`;
        doc.text(milestoneText, marginX + 5, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        // Add condition text based on milestone index
        let condition = "";
        if (idx === 0) condition = "Due before project initiation";
        else if (idx === 1) condition = "After 50% completion of the project";
        else condition = "Due on project completion and user acceptance";
        doc.text(`Condition: ${condition}`, marginX + 10, y);
        y += 8;
      });
    }

    // Project Timeline Section
    y = checkNewPage(y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Project Timeline", marginX, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
    y += 10;

    y = checkNewPage(y, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const timelineText = `Total Duration: ${formData.timelineWeeks || ""} Weeks`;
    doc.text(timelineText, marginX, y);
    y += 5;
    if (formData.timelineMonths) {
      doc.text(`Approximately ${formData.timelineMonths} Months`, marginX, y);
      y += 8;
    }

    // Timeline Phases
    if (formData.timelinePhases && formData.timelinePhases.length > 0) {
      y = checkNewPage(y, 10);
      formData.timelinePhases.forEach((phase, idx) => {
        y = checkNewPage(y, 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Week ${phase.week || ""}: ${phase.phase || ""}`, marginX + 5, y);
        y += 6;
      });
    }

    // PAGE 4: SRS/Conclusion
    y = addPage();

    // SRS Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Software Requirements Specification (SRS)", marginX, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
    y += 10;

    // Introduction
    y = checkNewPage(y, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const srsIntro = "A comprehensive SRS document will be shared before development begins. This will serve as the legal and binding agreement. It will include:";
    const srsIntroLines = doc.splitTextToSize(srsIntro, maxContentWidth);
    srsIntroLines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });
    y += 5;

    // SRS Items (numbered list)
    const srsItems = [
      "Project Objective - Summary of the Medical Care purpose and business impact",
      "About the Client - Business overview and relevant background",
      "Client Requirements - Functional and non-functional needs",
      "Scope of Work - Features, configurations, and limitations",
      "Expected Integrations - External APIs or third-party tools",
      "Out of Scope Items - Clearly defined exclusions",
      "Project Deliverables - Modules, codebase, hosting, training, etc.",
      "Assumptions - Infrastructure, inputs, availability, etc.",
      "Resources - Team members involved in execution",
      "Timelines & Milestones - Delivery plan with date"
    ];

    srsItems.forEach((item, idx) => {
      y = checkNewPage(y, 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const itemText = `${idx + 1}. ${item}`;
      const itemLines = doc.splitTextToSize(itemText, maxContentWidth - 5);
      itemLines.forEach((line) => {
        y = checkNewPage(y, 5);
        doc.text(line, marginX + 5, y);
        y += 5;
      });
      y += 3; // Consistent spacing like other sections
    });

    // Additional Notes Section
    y = checkNewPage(y, 40); // Increased margin top for Additional Notes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Additional Notes", marginX, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
    y += 10;

    // Additional Notes Items
    y = checkNewPage(y, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const notesItems = [
      "The quotation is valid for 15 days from the date of issue.",
      "Annual hosting and technical support charges for Year 2 will be quoted separately.",
      "6 months of post-implementation service support (bug fixes and minor updates) is included in this package. Remaining timeline details will be shared after project confirmation."
    ];

    notesItems.forEach((note) => {
      y = checkNewPage(y, 8);
      doc.text(`• ${note}`, marginX + 5, y);
      y += 5; // Consistent spacing with SRS section
    });

    // Conclusion paragraph
    y = checkNewPage(y, 15);
    const conclusionText = "We look forward to delivering a high-performing ERP, CRM & HRMS that aligns with your operational goals. Please don't hesitate to get in touch for any clarification or customization in scope.";
    const conclusionLines = doc.splitTextToSize(conclusionText, maxContentWidth);
    conclusionLines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });

    // Custom conclusion notes if provided
    if (formData.conclusionNotes) {
      y = checkNewPage(y, 10);
      // Parse HTML to preserve bold formatting
      const customNotesItems = parseHtmlToText(formData.conclusionNotes);
      customNotesItems.forEach((item) => {
        const textLines = doc.splitTextToSize(item.text, maxContentWidth);
        textLines.forEach((line) => {
          y = checkNewPage(y, 5);
          doc.setFont("helvetica", item.isBold ? "bold" : "normal");
          doc.text(line, marginX, y);
          doc.setFont("helvetica", "normal");
          y += 5;
        });
        y += 2;
      });
    }

    // Closing
    y = checkNewPage(y, 20);
    doc.text("Warm Regards,", marginX, y);
    y += 8;
    if (formData.creatorName) {
      doc.setFont("helvetica", "bold");
      doc.text(formData.creatorName, marginX, y);
      y += 5;
    }
    doc.setFont("helvetica", "normal");
    if (formData.creatorDesignation) {
      doc.text(formData.creatorDesignation, marginX, y);
      y += 5;
    }
    doc.text("CodeAce IT Solutions LLP", marginX, y);
    y += 5;
    doc.setFontSize(8);
    doc.text("(Issued with approval of the Founder)", marginX, y);

    // Save PDF
    const fileName = `${(formData.mainTitle || "proposal").replace(/[^a-z0-9]/gi, "_")}_${formData.proposalDate || ""}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
      <div className="w-full mt-10 ">
        <div className="mx-auto">
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
            <div className="flex gap-2 mb-6">
              {[
                "Details",
                "Scope of Work",
                "Pricing Summary",
                "Milestone",
                "Timeline",
                "Conclusion",
              ].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === t
                      ? isDark
                        ? "border-b-2 border-orange-500 text-white bg-orange-500/10"
                        : "border-b-2 border-orange-500 text-black bg-orange-500/10"
                      : isDark
                        ? "text-gray-300 hover:bg-gray-800/50"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {activeTab === "Details" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Main Title *</label>
                    <input type="text" name="mainTitle" value={formData.mainTitle} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Sub Title *</label>
                    <input type="text" name="subTitle" value={formData.subTitle} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Technology *</label>
                    <input type="text" name="technology" value={formData.technology} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Client Name *</label>
                    <input type="text" name="clientName" value={formData.clientName} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Client Organization *</label>
                    <input type="text" name="clientOrganization" value={formData.clientOrganization} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Proposal Date *</label>
                    <input type="date" name="proposalDate" value={formData.proposalDate} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Client Phone</label>
                    <input type="tel" name="clientPhone" value={formData.clientPhone} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Organization Category *</label>
                    <input type="text" name="organizationCategory" value={formData.organizationCategory} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Scope of Work" && (
              <div className="space-y-3 mb-6">
                <RichTextEditor
                  value={formData.scopeDescription || ""}
                  onChange={(value) => setFormData((prev) => ({ ...prev, scopeDescription: value }))}
                  placeholder="Enter scope of work details..."
                  editorRef={scopeEditorRef}
                />
              </div>
            )}

            {activeTab === "Pricing Summary" && (
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Add Row</span>
                  <button onClick={addPricingRow} className={`${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white px-3 py-1.5 rounded flex items-center gap-2`}><Plus className="w-4 h-4" />Add</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        <th className="text-left px-2 py-2">No</th>
                        <th className="text-left px-2 py-2">Description *</th>
                        <th className="text-left px-2 py-2">Amount *</th>
                        <th className="text-right px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.pricingRows || []).map((r, idx) => (
                        <tr key={idx} className={`${isDark ? "text-gray-200" : "text-gray-900"}`}>
                          <td className="px-2 py-2">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <input type="text" value={r.description} onChange={(e) => updatePricingRow(idx, "description", e.target.value)} className={`w-full px-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
                          </td>
                          <td className="px-2 py-2">
                            <div className="relative">
                              <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>₹</span>
                              <input type="text" value={r.amount || ""} onChange={(e) => updatePricingRow(idx, "amount", e.target.value)} className={`w-full pl-8 pr-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`} placeholder="0" />
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => removePricingRow(idx)} className={`${isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"} text-white px-2 py-1 rounded flex items-center gap-1`}><Trash2 className="w-4 h-4" />Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <div className={`px-4 py-2 rounded ${isDark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>Total: ₹ {calculateSubtotal().toLocaleString("en-IN")}</div>
                </div>
              </div>
            )}

            {activeTab === "Milestone" && (
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Add Milestone</span>
                  <button onClick={() => setFormData((prev) => ({ ...prev, milestones: [...(prev.milestones || []), { title: "", amount: "" }] }))} className={`${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white px-3 py-1.5 rounded flex items-center gap-2`}><Plus className="w-4 h-4" />Add</button>
                </div>
                <div className="space-y-3">
                  {(formData.milestones || []).map((m, idx) => (
                    <div key={idx} className={`grid grid-cols-7 gap-3 ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                      <div className="col-span-4">
                        <input type="text" value={m.title} onChange={(e) => {
                          const arr = [...(formData.milestones || [])]; arr[idx] = { ...arr[idx], title: e.target.value }; setFormData((prev) => ({ ...prev, milestones: arr }));
                        }} className={`w-full px-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`} placeholder="Milestone *" />
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>₹</span>
                          <input type="text" value={m.amount || ""} onChange={(e) => {
                            const cleaned = formatCurrencyInput(e.target.value);
                            const arr = [...(formData.milestones || [])]; arr[idx] = { ...arr[idx], amount: cleaned }; setFormData((prev) => ({ ...prev, milestones: arr }));
                          }} className={`w-full pl-8 pr-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`} placeholder="Amount *" />
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button onClick={() => {
                          const arr = [...(formData.milestones || [])]; arr.splice(idx, 1); setFormData((prev) => ({ ...prev, milestones: arr.length ? arr : [{ title: "", amount: "" }] }));
                        }} className={`${isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"} text-white px-2 py-1 rounded flex items-center gap-1`}><Trash2 className="w-4 h-4" />Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "Timeline" && (
              <div className="space-y-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Months *</label>
                    <input type="number" min="0" name="timelineMonths" value={formData.timelineMonths} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Weeks *</label>
                    <input type="number" min="0" name="timelineWeeks" value={formData.timelineWeeks} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Timeline Phases</span>
                  <button onClick={addTimelinePhase} className={`${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white px-3 py-1.5 rounded flex items-center gap-2`}><Plus className="w-4 h-4" />Add</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        <th className="text-left px-2 py-2">No</th>
                        <th className="text-left px-2 py-2">Week *</th>
                        <th className="text-left px-2 py-2">Phase *</th>
                        <th className="text-right px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.timelinePhases || []).map((r, idx) => (
                        <tr key={idx} className={`${isDark ? "text-gray-200" : "text-gray-900"}`}>
                          <td className="px-2 py-2">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <input type="text" value={r.week} onChange={(e) => updateTimelinePhase(idx, "week", e.target.value)} className={`w-full px-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="text" value={r.phase} onChange={(e) => updateTimelinePhase(idx, "phase", e.target.value)} className={`w-full px-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => removeTimelinePhase(idx)} className={`${isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"} text-white px-2 py-1 rounded flex items-center gap-1`}><Trash2 className="w-4 h-4" />Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "Conclusion" && (
              <div className="space-y-6 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Additional Notes</label>
                  <RichTextEditor
                    value={formData.conclusionNotes || ""}
                    onChange={(value) => setFormData((prev) => ({ ...prev, conclusionNotes: value }))}
                    placeholder="Enter additional notes..."
                    editorRef={conclusionEditorRef}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Creator Name *</label>
                    <input type="text" name="creatorName" value={formData.creatorName} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Creator Phone Number *</label>
                    <input type="tel" name="creatorPhone" value={formData.creatorPhone} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Designation *</label>
                    <input type="text" name="creatorDesignation" value={formData.creatorDesignation} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                  </div>
                </div>
              </div>
            )}
            

            {/* Action Buttons */}
            <div className={`mt-8 flex items-center justify-end gap-4 pt-6 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <button
                onClick={generatePDF}
                disabled={!isFormValid()}
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
    </div>
  );
  
}
