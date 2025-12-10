"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useTheme } from "../context/themeContext";
import { Download, Plus, Trash2, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, X, ChevronRight, ChevronLeft, FileText, Check } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import { generatePDF as generatePDFService, generatePreviewPDF as generatePreviewPDFService } from "./pdfService";

export const dynamic = "force-dynamic";

export const cleanEditorHtml = (html = "") => {
  // Normalize user HTML so jsPDF receives predictable tags
  const temp = document.createElement("div");
  temp.innerHTML = html || "";

  // Draft/execCommand can emit <div>/<b>/<i>; normalize to semantic tags
  temp.querySelectorAll("b").forEach((node) => {
    const strong = document.createElement("strong");
    strong.innerHTML = node.innerHTML;
    node.replaceWith(strong);
  });
  temp.querySelectorAll("i").forEach((node) => {
    const em = document.createElement("em");
    em.innerHTML = node.innerHTML;
    node.replaceWith(em);
  });

  // Convert block-level divs to paragraphs for cleaner PDF parsing
  temp.querySelectorAll("div").forEach((div) => {
    const p = document.createElement("p");
    p.innerHTML = div.innerHTML || "<br>";
    div.replaceWith(p);
  });

  // Ensure empty paragraphs still preserve spacing
  temp.querySelectorAll("p").forEach((p) => {
    const text = p.textContent.replace(/\u00a0/g, " ").trim();
    if (!text && !p.querySelector("br")) {
      p.innerHTML = "<br>";
    }
  });

  return temp.innerHTML;
};

// Lightweight, cursor-safe rich text editor built on contenteditable
export const CustomRichTextEditor = ({
  value,
  onChange,
  placeholder,
  isDark = false,
}) => {
  const editorRef = useRef(null);
  const lastValueRef = useRef(value || "");

  // Sync incoming value safely
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || "";
    if (next !== lastValueRef.current && next !== el.innerHTML) {
      el.innerHTML = next;
      lastValueRef.current = next;
    }
  }, [value]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const cleaned = cleanEditorHtml(el.innerHTML);
    lastValueRef.current = cleaned;
    onChange?.(cleaned);
  };

  const exec = (command) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    emitChange();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${isDark ? "border-gray-700" : "border-gray-300"}`}>
      {/* Toolbar */}
      <div className={`flex gap-1 p-2 border-b ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
        {[
          { icon: Bold, cmd: "bold" },
          { icon: Italic, cmd: "italic" },
          { icon: UnderlineIcon, cmd: "underline" },
          { icon: List, cmd: "insertUnorderedList" },
          { icon: ListOrdered, cmd: "insertOrderedList" },
        ].map(({ icon: Icon, cmd }) => (
          <button
            key={cmd}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(cmd);
            }}
            className={`p-2 rounded ${isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-700"}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className={`${isDark ? "bg-gray-900" : "bg-white"}`}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className={`min-h-[160px] px-3 py-2 outline-none
            ${isDark ? "text-gray-100" : "text-gray-900"}`}
          style={{
            lineHeight: "1.2",
            fontSize: "14px",
            whiteSpace: "pre-wrap",
          }}
        />
      </div>

      {/* Placeholder */}
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: ${isDark ? "#6b7280" : "#9ca3af"};
          pointer-events: none;
        }

        /* REMOVE DEFAULT BLOCK MARGINS */
        [contenteditable] p {
          margin: 0 0 6px;
          padding: 0;
          line-height: 1.3;
        }

        [contenteditable] ul,
        [contenteditable] ol {
          margin: 0 0 6px;
          padding-left: 18px;
          line-height: 1.3;
        }

        [contenteditable] li {
          margin: 0 0 4px;
          padding: 0;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
};



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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [pdfList, setPdfList] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [pdfUrls, setPdfUrls] = useState({});
  const defaultMilestones = useMemo(
    () => [
      { title: "Advance Payment on Contract Signing", amount: "" },
      { title: "Progress Payment at 50% Completion", amount: "" },
      { title: "Final Settlement upon Delivery", amount: "" },
    ],
    []
  );

  const steps = ["Details", "Scope of Work", "Pricing Summary", "Timeline Phases", "Milestones", "Additional Notes", "Preview"];

  // Supabase client (browser) - Initialize before useEffect
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
  }, [supabaseUrl, supabaseKey]);

  // Fetch PDFs from Supabase
  useEffect(() => {
    const fetchPdfs = async () => {
      if (!supabase) {
        setLoadingPdfs(false);
        return;
      }
      try {
        const { data, error } = await supabase.storage
          .from("proposal_pdf")
          .list("proposals", {
            limit: 100,
            offset: 0,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (error) {
          console.error("Error fetching PDFs:", error);
          setPdfList([]);
        } else {
          const pdfs = (data || [])
            .filter((file) => file.name.endsWith(".pdf"))
            .map((file) => ({
              name: file.name,
              created_at: file.created_at,
              id: file.id,
            }));
          setPdfList(pdfs);
        }
      } catch (err) {
        console.error("Error fetching PDFs:", err);
        setPdfList([]);
      } finally {
        setLoadingPdfs(false);
      }
    };

    fetchPdfs();
  }, [supabase]);

  // Resolve public/signed URLs for PDFs so view/download/share work reliably
  useEffect(() => {
    const resolveUrls = async () => {
      if (!supabase || !pdfList?.length) {
        setPdfUrls({});
        return;
      }
      const entries = await Promise.all(
        pdfList.map(async (file) => {
          const path = `proposals/${file.name}`;
          // Try public URL first
          const { data } = supabase.storage.from("proposal_pdf").getPublicUrl(path);
          if (data?.publicUrl) return [file.name, data.publicUrl];

          // Fallback to signed URL
          const { data: signed } = await supabase.storage.from("proposal_pdf").createSignedUrl(path, 3600);
          if (signed?.signedUrl) return [file.name, signed.signedUrl];
          return [file.name, null];
        })
      );
      setPdfUrls(Object.fromEntries(entries.filter(([, url]) => url)));
    };
    resolveUrls();
  }, [pdfList, supabase]);

  // Ensure default milestones are present when entering milestones step
  useEffect(() => {
    if (currentStep === 4 && (!formData.milestones || formData.milestones.length === 0)) {
      setFormData((prev) => ({ ...prev, milestones: defaultMilestones }));
    }
  }, [currentStep, formData.milestones, defaultMilestones]);

  const getPdfUrl = (fileName) => {
    if (!supabase) return null;
    const { data } = supabase.storage
      .from("proposal_pdf")
      .getPublicUrl(`proposals/${fileName}`);
    return data?.publicUrl || null;
  };

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

  const updateMilestoneAmount = (idx, value) => {
    const total = calculateSubtotal();
    const cleaned = formatCurrencyInput(value);
    const amountNum = parseCurrencyValue(cleaned);

    const currentMilestones = [...(formData.milestones || [])];
    const othersSum = currentMilestones.reduce((sum, m, i) => {
      if (i === idx) return sum;
      return sum + parseCurrencyValue(m.amount || 0);
    }, 0);

    const remaining = Math.max(total - othersSum, 0);
    const finalAmount = Math.min(amountNum, remaining);

    currentMilestones[idx] = { ...currentMilestones[idx], amount: finalAmount ? String(finalAmount) : "" };
    setFormData((prev) => ({ ...prev, milestones: currentMilestones }));
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
      const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
      return text ? [{ text, isListItem: false, isBold: false, addSpacing: true }] : [];
    }

    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;

    const items = [];

    const markBlockSpacing = (startIdx) => {
      if (startIdx === null || startIdx === undefined) return;
      const endIdx = items.length - 1;
      if (endIdx >= startIdx && items[endIdx]) {
        items[endIdx].addSpacing = true;
      }
    };

    const processNode = (node, isBold = false, isListItem = false, parentIsList = false) => {
      if (node.nodeType === 3) {
        const text = node.textContent.replace(/\s+\n/g, "\n");
        if (text) {
          items.push({ text, isListItem: isListItem || parentIsList, isBold, addSpacing: false });
        }
        return;
      }

      if (node.nodeType !== 1) return;

      const tagName = node.tagName.toLowerCase();
      const currentIsBold =
        isBold ||
        tagName === "b" ||
        tagName === "strong" ||
        (node.style &&
          node.style.fontWeight &&
          (node.style.fontWeight === "bold" || parseInt(node.style.fontWeight, 10) >= 700));

      if (tagName === "br") {
        items.push({ text: "", isListItem: isListItem || parentIsList, isBold: currentIsBold, isBreak: true, addSpacing: false });
        return;
      }

      if (tagName === "ul" || tagName === "ol") {
        Array.from(node.childNodes).forEach((child) => {
          if (child.tagName && child.tagName.toLowerCase() === "li") {
            processNode(child, currentIsBold, true, true);
          }
        });
        return;
      }

      if (tagName === "li") {
        const startIdx = items.length;
        Array.from(node.childNodes).forEach((child) => processNode(child, currentIsBold, true, true));
        markBlockSpacing(startIdx);
        return;
      }

      if (tagName === "p" || tagName === "div") {
        const startIdx = items.length;
        Array.from(node.childNodes).forEach((child) => processNode(child, currentIsBold, isListItem, parentIsList));
        markBlockSpacing(startIdx);
        return;
      }

      Array.from(node.childNodes).forEach((child) => processNode(child, currentIsBold, isListItem, parentIsList));
    };

    Array.from(tmp.childNodes).forEach((node) => processNode(node, false, false, false));
    return items.length > 0
      ? items
      : [{ text: tmp.textContent || tmp.innerText || "", isListItem: false, isBold: false, addSpacing: true }];
  };

  const splitText = (doc, text, maxWidth, x, y) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    return { lines, y };
  };
  /* function to convert hex color to rgb color */
  function hexToRgb(hex) {
    const bigint = parseInt(hex.replace("#", ""), 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  /** function to use the gradient  */

  function drawHorizontalGradientLine({
    docInstance,
    x1,
    x2,
    y,
    height = 2.5, // 👈 stroke thickness control
  }) {
    const steps = 40;

    const left = hexToRgb("#0B1E63");
    const mid = hexToRgb("#0B1E63");
    const right = hexToRgb("#FFFFFF");

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);

      let color;
      if (t <= 0.49) {
        color = left;
      } else {
        const nt = (t - 0.49) / (1 - 0.49);
        color = {
          r: Math.round(mid.r + (right.r - mid.r) * nt),
          g: Math.round(mid.g + (right.g - mid.g) * nt),
          b: Math.round(mid.b + (right.b - mid.b) * nt),
        };
      }

      docInstance.setDrawColor(color.r, color.g, color.b);
      docInstance.setLineWidth((height / steps) * 6);

      const x = x1 + (x2 - x1) * t;
      docInstance.line(x, y, x + (x2 - x1) / steps + 0.6, y);
    }
  }
  
  
  const generatePDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const headerHeight = 20; // Changed to 20mm as requested
    const footerHeight = 15;
    const contentStartY = headerHeight + 10;
    const contentEndY = pageHeight - footerHeight - 10;
    const maxContentWidth = pageWidth - 2 * marginX;

    // Helper function to add a new page with header/footer/watermark
  const addPage = () => {
    doc.addPage();
    // Only footer and watermark on subsequent pages (no header)
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

    // Helper function to draw a table cell
    const drawCell = (x, y, width, height) => {
      doc.setLineWidth(0.1);
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, width, height);
    };

    // PAGE 1: Cover Page
    addHeader(doc, pageWidth, headerHeight);
    addFooter(doc, pageWidth, pageHeight, footerHeight);
    addWatermark(doc, pageWidth, pageHeight);

    let y = contentStartY;
    y+=5;
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
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("From:", marginX, y);
    y += 5;
    doc.text("CodeAce IT Solutions LLP", marginX, y);
    y += 5;
    doc.text("Sahya Building, Govt. Cyberpark,", marginX, y);
    y += 5;
    doc.text("Calicut, Kerala, India", marginX, y);
    y += 5;


    // Subject
    y = checkNewPage(y, 12);
    y+=5;
    const label = "Subject:";
    const labelWidth = 16; // fixed alignment width
    const lineHeight = 5;

    doc.setFont("helvetica", "bold");
    doc.text(label, marginX, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const subjectText = formData.mainTitle || "";
    const subjectLines = doc.splitTextToSize(
      subjectText,
      maxContentWidth - labelWidth
    );

    // First line (same baseline as "Subject:")
    doc.text(subjectLines[0] || "", marginX + labelWidth, y);

    // Wrapped lines (aligned exactly under content start)
    for (let i = 1; i < subjectLines.length; i++) {
      doc.text(
        subjectLines[i],
        marginX + labelWidth,
        y + i * lineHeight
      );
    }

    y += subjectLines.length * lineHeight + 6;

    // Salutation
    y = checkNewPage(y, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Dear Sir,", marginX, y);
    y += 8;

    // Body paragraphs
    y = checkNewPage(y, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const para1 = "We appreciate the opportunity to partner with you in digitizing and streamlining Medical Care operations.";
    const para1Lines = doc.splitTextToSize(para1, maxContentWidth);
    para1Lines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });
    y += 3;

    y = checkNewPage(y, 15);
    const para2 = `Based on the detailed RFP requirements, we are pleased to present a comprehensive quotation and technical proposal for the development and implementation of a custom-built solution using the ${formData.technology || "Frappe ERPNext Framework"}. Leveraging its modular architecture, extensive customization capabilities, and proven reliability, our team will design a system tailored specifically to your organizational workflows. The objective is to streamline operations, enhance data visibility, support cross-department collaboration, and create a scalable digital ecosystem that can evolve with your future business needs.`;
    const para2Lines = doc.splitTextToSize(para2, maxContentWidth);
    para2Lines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });

    // PAGE 2: Scope of Work
    y = addPage();
    y -= 10;  // reduce top space (you can change 10)
    // Scope of Work Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Scope Of Work", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3 
    });
    y += 18;

    // Scope Description (render as-is from editor, preserving bullets/bold/spacing)
    if (formData.scopeDescription) {
      let scopeItems = parseHtmlToText(formData.scopeDescription);
      // Fallback if parsing yields nothing or only blanks
      const hasContent =
        scopeItems &&
        scopeItems.some((i) => (i.text || "").replace(/[\s\u00A0]+/g, "").length > 0);
      if (!hasContent) {
        const plain = stripHtml(formData.scopeDescription).replace(/\u00A0/g, " ");
        if (plain) {
          scopeItems = [{ text: plain, isListItem: false, isBold: false }];
        }
      }
      // Final safety: if still empty, bail
      if (!scopeItems || scopeItems.length === 0) {
        const fallback = stripHtml(formData.scopeDescription).replace(/\u00A0/g, " ");
        if (fallback) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(fallback, maxContentWidth);
          lines.forEach((line) => {
            y = checkNewPage(y, 6);
            doc.text(line, marginX, y);
            y += 2.5;
          });
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const splitWithFirstWidth = (text, firstWidth, restWidth) => {
          const words = text.split(/\s+/).filter(Boolean);
          const lines = [];
          let current = "";
          let remainingWidth = firstWidth;
          let isFirstLine = true;

          words.forEach((word) => {
            const candidate = current ? `${current} ${word}` : word;
            if (doc.getTextWidth(candidate) <= remainingWidth) {
              current = candidate;
              return;
            }
            if (current) {
              lines.push({ text: current, first: isFirstLine });
            }
            current = word;
            isFirstLine = false;
            remainingWidth = restWidth;
          });

          if (current) {
            lines.push({ text: current, first: isFirstLine });
          }

          return lines.length ? lines : [{ text: "", first: true }];
        };

        let pendingX = null;
        let pendingY = null;
        let pendingListItem = null;

        scopeItems.forEach((item, idx) => {
          // Skip empty items unless they're breaks or list items that need bullets
          // Also allow items with only whitespace if they're list items
          const hasContent = item.text && item.text.trim().length > 0;
          if (!hasContent && !item.isBreak && !item.isListItem) {
            return;
          }

          const next = scopeItems[idx + 1];
          const inlineContinuation =
            pendingX !== null &&
            pendingY !== null &&
            pendingListItem === item.isListItem &&
            !item.isBold &&
            !item.isBreak;

          // Handle breaks
          if (item.isBreak) {
            pendingX = null;
            pendingY = null;
            pendingListItem = null;
            y += 5; // Match SRS line height
            return;
          }

          // For list items, always show bullet on first non-empty item, even if text is empty
          const itemText = item.text || "";
          const isListStart = item.isListItem && !inlineContinuation;
          
          // Skip if no text and not a list item that needs a bullet
          if (!itemText.trim() && !item.isListItem) {
            return;
          }

          const baseWidth = maxContentWidth - (item.isListItem ? 8 : 5);
          const firstLineIndent = inlineContinuation ? 0 : item.isListItem ? 3 : 0;
          const subsequentIndent = item.isListItem ? 8 : 0;

          const startX = inlineContinuation ? pendingX : marginX + firstLineIndent;
          
          // Calculate bullet width for consistent alignment - always use normal font
          doc.setFont("helvetica", "normal");
          const bulletWidth = item.isListItem ? doc.getTextWidth("• ") : 0;
          // Text always starts at the same position after bullet, regardless of font
          const textStartX = isListStart ? marginX + firstLineIndent + bulletWidth : startX;
          // Available width for text (accounting for bullet if present)
          const availableWidth = inlineContinuation
            ? marginX + maxContentWidth - textStartX
            : (item.isListItem ? baseWidth - bulletWidth : baseWidth);

          // Handle empty list items (just bullet)
          let lines;
          if (item.isListItem && !itemText.trim() && !inlineContinuation) {
            // Empty list item - just bullet
            lines = [{ text: "", first: true }];
          } else {
            // Split text content (without bullet prefix)
            doc.setFont("helvetica", item.isBold ? "bold" : "normal");
            // Use consistent width for wrapped lines
            const wrappedWidth = isListStart ? baseWidth - bulletWidth : baseWidth;
            lines = splitWithFirstWidth(itemText, availableWidth, wrappedWidth);
          }

          lines.forEach((lineObj, lineIdx) => {
            // Calculate X positions
            const isFirstLine = lineIdx === 0;
            const bulletX = isListStart && isFirstLine ? marginX + firstLineIndent : null;
            
            let textX;
            if (inlineContinuation && isFirstLine) {
              textX = startX;
            } else if (isListStart && isFirstLine) {
              textX = textStartX;
            } else if (item.isListItem) {
              // Wrapped lines of list item - align with text after bullet (not bullet position)
              // Use the same calculation as first line to ensure consistent alignment
              textX = marginX + firstLineIndent + bulletWidth; // Same as textStartX
            } else {
              // Regular paragraph
              textX = marginX + (isFirstLine ? firstLineIndent : subsequentIndent);
            }

            y = pendingY !== null ? pendingY : y;
            y = checkNewPage(y, 5); // Match SRS spacing (was 2.5)
            
            // Render bullet first (if this is the start of a list item)
            if (bulletX !== null && isFirstLine) {
              doc.setFont("helvetica", "normal");
              doc.text("• ", bulletX, y);
            }
            
            // Render text content with appropriate font
            if (lineObj.text) {
              doc.setFont("helvetica", item.isBold ? "bold" : "normal");
              doc.text(lineObj.text, textX, y);
            }

            const isLastLine = lineIdx === lines.length - 1;
            const willInlineWithNext =
              isLastLine &&
              item.isBold &&
              next &&
              !next.isBold &&
              !next.isBreak &&
              next.isListItem === item.isListItem &&
              next.text &&
              next.text.trim();

            if (willInlineWithNext) {
              // Measure with current font (bold) to get accurate width
              // Ensure font is set correctly before measuring
              doc.setFont("helvetica", item.isBold ? "bold" : "normal");
              const measuredWidth = doc.getTextWidth(lineObj.text || "");
              pendingX = textX + measuredWidth;
              pendingY = y;
              pendingListItem = item.isListItem;
            } else {
              pendingX = null;
              pendingY = null;
              pendingListItem = null;
              y += 5; // Match SRS line height (was 2.5)
            }
          });

          doc.setFont("helvetica", "normal");
          if (item.addSpacing !== false && pendingX === null) {
            y += 3; // Match SRS item spacing
          }
        });
      }
    }

    // PAGE 3: Pricing Summary
    y = addPage();
    y -= 10;  // reduce top space (you can change 10)

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Pricing Summary", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3 // 👈 increase for thicker stroke
    });
    y += 18;

    if (formData.pricingRows?.length) {
      const colNo = 15;
      const colAmt = 50;
      const colDesc = maxContentWidth - colNo - colAmt; // fill remaining space
      const rowPadding = 4;

      // Header
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");

      drawCell(marginX, y, colNo, 8);
      drawCell(marginX + colNo, y, colDesc, 8);
      drawCell(pageWidth - marginX - colAmt, y, colAmt, 8);

      doc.text("No", marginX + 4, y + 5);
      doc.text("Description", marginX + colNo + 4, y + 5);
      doc.text("Amount", pageWidth - marginX - colAmt + colAmt - 6, y + 5, { align: "right" });

      y += 8;

      // Rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      let total = 0;

      formData.pricingRows.forEach((row, idx) => {
        const descLines = doc.splitTextToSize(row.description || "", colDesc - 8);
        const rowHeight = Math.max(10, descLines.length * 5 + rowPadding);

        y = checkNewPage(y, rowHeight);

        drawCell(marginX, y, colNo, rowHeight);
        drawCell(marginX + colNo, y, colDesc, rowHeight);
        drawCell(pageWidth - marginX - colAmt, y, colAmt, rowHeight);

        doc.text(String(idx + 1), marginX + 4, y + 7);
        descLines.forEach((line, lineIdx) => {
          doc.text(line, marginX + colNo + 4, y + 7 + lineIdx * 5);
        });

        const amt = parseCurrencyValue(row.amount || 0);
        total += amt;
        const amountText = `INR ${amt.toLocaleString("en-IN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`;
        // Place amount aligned to the right inside its cell
        doc.text(amountText, pageWidth - marginX - 6, y + 7, { align: "right" });

        y += rowHeight;
      });

      // Total Row
      y = checkNewPage(y, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      drawCell(marginX, y, colNo + colDesc, 10);
      drawCell(pageWidth - marginX - colAmt, y, colAmt, 10);

      doc.text("Total", marginX + colNo + 4, y + 7);
      doc.text(
        `INR ${total.toLocaleString("en-IN")}`,
        pageWidth - marginX - 6,
        y + 7,
        { align: "right" }
      );

      y += 16;
    }


    // Payment Terms Section
    y = checkNewPage(y, 20);
    y+=5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Payment Terms", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3 // 👈 increase for thicker stroke
    });
    y += 18;

    if (formData.milestones?.length) {
      const colAmount = 50;
      const colMilestone = maxContentWidth - colAmount; // two columns: Milestone, Amount

      // Header
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      drawCell(marginX, y, colMilestone, 8);
      drawCell(pageWidth - marginX - colAmount, y, colAmount, 8);

      doc.text("Milestone", marginX + 4, y + 5);
      doc.text("Amount", pageWidth - marginX - 6, y + 5, { align: "right" });

      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      formData.milestones.forEach((m, i) => {
        const milestoneText = m.title || `Milestone ${i + 1}`;
        const descLines = doc.splitTextToSize(milestoneText, colMilestone - 8);
        const rowHeight = Math.max(10, descLines.length * 5 + 4);

        y = checkNewPage(y, rowHeight);

        drawCell(marginX, y, colMilestone, rowHeight);
        drawCell(pageWidth - marginX - colAmount, y, colAmount, rowHeight);

        descLines.forEach((line, lineIdx) => {
          doc.text(line, marginX + 4, y + 7 + lineIdx * 5);
        });

        const amt = parseCurrencyValue(m.amount || 0);
        const amountText = `INR ${amt.toLocaleString("en-IN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`;
        doc.text(amountText, pageWidth - marginX - 6, y + 7, { align: "right" });

        y += rowHeight;
      });

      y += 12;
    }


    // Project Timeline Section
    y = checkNewPage(y, 20);
    y+=5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Project Timeline", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3 // 👈 increase for thicker stroke
    });
    y += 18;

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
        doc.text(`${phase.week || ""}: ${phase.phase || ""}`, marginX + 5, y);
        y += 6;
      });
    }

    // PAGE 4: SRS/Conclusion
    y = addPage();
    
    // SRS Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Software Requirements Specification (SRS)", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3 
    });
    y += 18;

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
      doc.setFontSize(10);
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
    y = addPage();
    y -= 10;  // reduce top space (you can change 10)

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Additional Notes", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3 // 👈 increase for thicker stroke
    });
    y += 18;

    // Additional Notes Items
    y = checkNewPage(y, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const notesItems = [
      "The quotation is valid for 15 days from the date of issue.",
      "Annual hosting and technical support charges for Year 2 will be quoted separately.",
      "6 months of post-implementation service support (bug fixes and minor updates) is included in this package. Remaining timeline details will be shared after project confirmation."
    ];

    notesItems.forEach((note) => {
      y = checkNewPage(y, 8);
      doc.setFont("helvetica", "normal");
      const bulletWidth = doc.getTextWidth("• ");
      const noteLines = doc.splitTextToSize(note, maxContentWidth - 5 - bulletWidth);
      noteLines.forEach((line, lineIdx) => {
        y = checkNewPage(y, 5);
        const bulletX = marginX + 3;
        const textX = marginX + 3 + bulletWidth;
        if (lineIdx === 0) {
          doc.text("• ", bulletX, y);
        }
        // Wrapped lines align with text start position
        const lineX = lineIdx === 0 ? textX : marginX + 8;
        doc.text(line, lineX, y);
        y += 5;
      });
      y += 3; // Match SRS item spacing
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
      y += 10; // Add gap above additional notes
      let customNotesItems = parseHtmlToText(formData.conclusionNotes);
      const hasContent =
        customNotesItems &&
        customNotesItems.some((i) => (i.text || "").replace(/[\s\u00A0]+/g, "").length > 0);
      if (!hasContent) {
        const plain = stripHtml(formData.conclusionNotes).replace(/\u00A0/g, " ");
        if (plain) {
          customNotesItems = [{ text: plain, isBold: false, isListItem: false }];
        }
      }
      // Final safety: if still empty, bail
      if (!customNotesItems || customNotesItems.length === 0) {
        const fallback = stripHtml(formData.conclusionNotes).replace(/\u00A0/g, " ");
        if (fallback) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(fallback, maxContentWidth);
          lines.forEach((line) => {
            y = checkNewPage(y, 5);
            doc.text(line, marginX, y);
            y += 5;
          });
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const splitWithFirstWidth = (text, firstWidth, restWidth) => {
          const words = text.split(/\s+/).filter(Boolean);
          const lines = [];
          let current = "";
          let remainingWidth = firstWidth;
          let isFirstLine = true;

          words.forEach((word) => {
            const candidate = current ? `${current} ${word}` : word;
            if (doc.getTextWidth(candidate) <= remainingWidth) {
              current = candidate;
              return;
            }
            if (current) {
              lines.push({ text: current, first: isFirstLine });
            }
            current = word;
            isFirstLine = false;
            remainingWidth = restWidth;
          });

          if (current) {
            lines.push({ text: current, first: isFirstLine });
          }

          return lines.length ? lines : [{ text: "", first: true }];
        };

        let pendingX = null;
        let pendingY = null;
        let pendingListItem = null;

        customNotesItems.forEach((item, idx) => {
          // Skip empty items unless they're breaks or list items that need bullets
          const hasContent = item.text && item.text.trim().length > 0;
          if (!hasContent && !item.isBreak && !item.isListItem) {
            return;
          }

          const next = customNotesItems[idx + 1];
          const inlineContinuation =
            pendingX !== null &&
            pendingY !== null &&  
            pendingListItem === item.isListItem &&
            !item.isBold &&
            !item.isBreak;

          // Handle breaks
          if (item.isBreak) {
            pendingX = null;
            pendingY = null;
            pendingListItem = null;
            y += 5; // Match SRS line height
            return;
          }

          // For list items, always show bullet on first non-empty item, even if text is empty
          const itemText = item.text || "";
          const isListStart = item.isListItem && !inlineContinuation;
          
          // Skip if no text and not a list item that needs a bullet
          if (!itemText.trim() && !item.isListItem) {
            return;
          }

          const baseWidth = maxContentWidth - (item.isListItem ? 8 : 5);
          const firstLineIndent = inlineContinuation ? 0 : item.isListItem ? 3 : 0;
          const subsequentIndent = item.isListItem ? 8 : 0;

          const startX = inlineContinuation ? pendingX : marginX + firstLineIndent;
          
          // Calculate bullet width for consistent alignment - always use normal font
          doc.setFont("helvetica", "normal");
          const bulletWidth = item.isListItem ? doc.getTextWidth("• ") : 0;
          // Text always starts at the same position after bullet, regardless of font
          const textStartX = isListStart ? marginX + firstLineIndent + bulletWidth : startX;
          // Available width for text (accounting for bullet if present)
          const availableWidth = inlineContinuation
            ? marginX + maxContentWidth - textStartX
            : (item.isListItem ? baseWidth - bulletWidth : baseWidth);

          // Handle empty list items (just bullet)
          let lines;
          if (item.isListItem && !itemText.trim() && !inlineContinuation) {
            // Empty list item - just bullet
            lines = [{ text: "", first: true }];
          } else {
            // Split text content (without bullet prefix)
            doc.setFont("helvetica", item.isBold ? "bold" : "normal");
            // Use consistent width for wrapped lines
            const wrappedWidth = isListStart ? baseWidth - bulletWidth : baseWidth;
            lines = splitWithFirstWidth(itemText, availableWidth, wrappedWidth);
          }

          lines.forEach((lineObj, lineIdx) => {
            // Calculate X positions
            const isFirstLine = lineIdx === 0;
            const bulletX = isListStart && isFirstLine ? marginX + firstLineIndent : null;
            
            let textX;
            if (inlineContinuation && isFirstLine) {
              textX = startX;
            } else if (isListStart && isFirstLine) {
              textX = textStartX;
            } else if (item.isListItem) {
              // Wrapped lines of list item - align with text after bullet (not bullet position)
              // Use the same calculation as first line to ensure consistent alignment
              textX = marginX + firstLineIndent + bulletWidth; // Same as textStartX
            } else {
              // Regular paragraph
              textX = marginX + (isFirstLine ? firstLineIndent : subsequentIndent);
            }

            y = pendingY !== null ? pendingY : y;
            y = checkNewPage(y, 5); // Match SRS spacing
            
            // Render bullet first (if this is the start of a list item)
            if (bulletX !== null && isFirstLine) {
              doc.setFont("helvetica", "normal");
              doc.text("• ", bulletX, y);
            }
            
            // Render text content with appropriate font
            if (lineObj.text) {
              doc.setFont("helvetica", item.isBold ? "bold" : "normal");
              doc.text(lineObj.text, textX, y);
            }

            const isLastLine = lineIdx === lines.length - 1;
            const willInlineWithNext =
              isLastLine &&
              item.isBold &&
              next &&
              !next.isBold &&
              !next.isBreak &&
              next.isListItem === item.isListItem &&
              next.text &&
              next.text.trim();

            if (willInlineWithNext) {
              // Measure with current font (bold) to get accurate width
              // Ensure font is set correctly before measuring
              doc.setFont("helvetica", item.isBold ? "bold" : "normal");
              const measuredWidth = doc.getTextWidth(lineObj.text || "");
              pendingX = textX + measuredWidth;
              pendingY = y;
              pendingListItem = item.isListItem;
            } else {
              pendingX = null;
              pendingY = null;
              pendingListItem = null;
              y += 5; // Match SRS line height
            }
          });

          doc.setFont("helvetica", "normal");
          if (item.addSpacing !== false && pendingX === null) {
            y += 3; // Match SRS item spacing
          }
        });
      }
    }

    // Closing
    y = checkNewPage(y, 20);
    y += 10; // Add gap above Warm Regards
    doc.text("Warm Regards,", marginX, y);
    y += 5;
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
    y += 5;

    // Save PDF locally and upload to Supabase if available
    const fileName = `${(formData.clientOrganization || "proposal").replace(/[^a-z0-9]/gi, "_")}_${formData.proposalDate || ""}.pdf`;
    const pdfBlob = doc.output("blob");

    // Upload to Supabase bucket if keys are configured
    if (supabase) {
      try {
        const path = `proposals/${fileName}`;
        const { error } = await supabase.storage
          .from("proposal_pdf")
          .upload(path, pdfBlob, {
            cacheControl: "3600",
            contentType: "application/pdf",
            upsert: true,
          });
        if (error) {
          console.error("Supabase upload error:", error.message);
        }
      } catch (err) {
        console.error("Supabase upload failed:", err);
      }
    }

    // Trigger browser download
    doc.save(fileName);
    
    // Refresh PDF list after upload
    if (supabase) {
      const { data } = await supabase.storage
        .from("proposal_pdf")
        .list("proposals", {
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });
      if (data) {
        const pdfs = (data || [])
          .filter((file) => file.name.endsWith(".pdf"))
          .map((file) => ({
            name: file.name,
            created_at: file.created_at,
            id: file.id,
          }));
        setPdfList(pdfs);
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      if (currentStep === steps.length - 2) {
        // Generate preview PDF when moving to preview step (step 5)
        generatePreviewPDF();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generatePreviewPDF = async () => {
    // Use the same generatePDF logic but create a blob URL instead of downloading
    // We'll create a temporary version that generates the full PDF
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const headerHeight = 20;
    const footerHeight = 13;
    const contentStartY = headerHeight + 10;
    const contentEndY = pageHeight - footerHeight - 10; 
    const maxContentWidth = pageWidth - 2 * marginX;

    const addPage = () => {
      doc.addPage();
      addFooter(doc, pageWidth, pageHeight, footerHeight);
      addWatermark(doc, pageWidth, pageHeight);
      return contentStartY;
    };

    const checkNewPage = (currentY, requiredSpace = 10) => {
      if (currentY + requiredSpace > contentEndY) {
        return addPage();
      }
      return currentY;
    };

    const drawCell = (x, y, width, height) => {
      doc.setLineWidth(0.1);
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, width, height);
    };

    // PAGE 1: Cover Page (same as generatePDF)
    addHeader(doc, pageWidth, headerHeight);
    addFooter(doc, pageWidth, pageHeight, footerHeight);
    addWatermark(doc, pageWidth, pageHeight);

    let y = contentStartY;
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const mainTitle = formData.mainTitle || "";
    const titleLines = doc.splitTextToSize(mainTitle, maxContentWidth);
    titleLines.forEach((line, idx) => {
      doc.text(line, pageWidth / 2, y + (idx * 6), { align: "center" });
    });
    y += titleLines.length * 6 + 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = checkNewPage(y, 8);
    doc.text(`Date : ${formatDate(formData.proposalDate)}`, marginX, y);
    y += 8;

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

    y = checkNewPage(y, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("From:", marginX, y);
    y += 5;
    doc.text("CodeAce IT Solutions LLP", marginX, y);
    y += 5;
    doc.text("Sahya Building, Govt. Cyberpark,", marginX, y);
    y += 5;
    doc.text("Calicut, Kerala, India", marginX, y);
    y += 5;

    y = checkNewPage(y, 12);
    y += 5;
    const label = "Subject:";
    const labelWidth = 16;
    const lineHeight = 5;

    doc.setFont("helvetica", "bold");
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const subjectText = formData.mainTitle || "";
    const subjectLines = doc.splitTextToSize(subjectText, maxContentWidth - labelWidth);
    doc.text(subjectLines[0] || "", marginX + labelWidth, y);
    for (let i = 1; i < subjectLines.length; i++) {
      doc.text(subjectLines[i], marginX + labelWidth, y + i * lineHeight);
    }
    y += subjectLines.length * lineHeight + 6;

    y = checkNewPage(y, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Dear Sir,", marginX, y);
    y += 8;

    y = checkNewPage(y, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const para1 = "We appreciate the opportunity to partner with you in digitizing and streamlining Medical Care operations.";
    const para1Lines = doc.splitTextToSize(para1, maxContentWidth);
    para1Lines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });
    y += 3;

    y = checkNewPage(y, 15);
    const para2 = `Based on the detailed RFP requirements, we are pleased to present a comprehensive quotation and technical proposal for the development and implementation of a custom-built solution using the ${formData.technology || "Frappe ERPNext Framework"}. Leveraging its modular architecture, extensive customization capabilities, and proven reliability, our team will design a system tailored specifically to your organizational workflows. The objective is to streamline operations, enhance data visibility, support cross-department collaboration, and create a scalable digital ecosystem that can evolve with your future business needs.`;
    const para2Lines = doc.splitTextToSize(para2, maxContentWidth);
    para2Lines.forEach((line) => {
      y = checkNewPage(y, 5);
      doc.text(line, marginX, y);
      y += 5;
    });

    // PAGE 2: Scope of Work
    y = addPage();
    y -= 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Scope Of Work", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3
    });
    y += 18;

    if (formData.scopeDescription) {
      let scopeItems = parseHtmlToText(formData.scopeDescription);
      const hasContent = scopeItems && scopeItems.some((i) => (i.text || "").replace(/[\s\u00A0]+/g, "").length > 0);
      if (!hasContent) {
        const plain = stripHtml(formData.scopeDescription).replace(/\u00A0/g, " ");
        if (plain) {
          scopeItems = [{ text: plain, isListItem: false, isBold: false }];
        }
      }
      if (scopeItems && scopeItems.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        scopeItems.forEach((item) => {
          if (item.isBreak) {
            y += 5;
            return;
          }
          const text = item.text || "";
          if (text.trim()) {
            doc.setFont("helvetica", item.isBold ? "bold" : "normal");
            const lines = doc.splitTextToSize(text, maxContentWidth - (item.isListItem ? 8 : 0));
            lines.forEach((line) => {
              y = checkNewPage(y, 5);
              const xPos = item.isListItem ? marginX + 8 : marginX;
              doc.text(line, xPos, y);
              y += 5;
            });
          }
        });
      }
    }

    // PAGE 3: Pricing Summary
    y = addPage();
    y -= 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Pricing Summary", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3
    });
    y += 18;

    if (formData.pricingRows?.length) {
      const colNo = 15;
      const colAmt = 50;
      const colDesc = maxContentWidth - colNo - colAmt;
      const rowPadding = 4;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      drawCell(marginX, y, colNo, 8);
      drawCell(marginX + colNo, y, colDesc, 8);
      drawCell(pageWidth - marginX - colAmt, y, colAmt, 8);
      doc.text("No", marginX + 4, y + 5);
      doc.text("Description", marginX + colNo + 4, y + 5);
      doc.text("Amount", pageWidth - marginX - colAmt + colAmt - 6, y + 5, { align: "right" });
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      let total = 0;

      formData.pricingRows.forEach((row, idx) => {
        const descLines = doc.splitTextToSize(row.description || "", colDesc - 8);
        const rowHeight = Math.max(10, descLines.length * 5 + rowPadding);
        y = checkNewPage(y, rowHeight);
        drawCell(marginX, y, colNo, rowHeight);
        drawCell(marginX + colNo, y, colDesc, rowHeight);
        drawCell(pageWidth - marginX - colAmt, y, colAmt, rowHeight);
        doc.text(String(idx + 1), marginX + 4, y + 7);
        descLines.forEach((line, lineIdx) => {
          doc.text(line, marginX + colNo + 4, y + 7 + lineIdx * 5);
        });
        const amt = parseCurrencyValue(row.amount || 0);
        total += amt;
        const amountText = `INR ${amt.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        doc.text(amountText, pageWidth - marginX - 6, y + 7, { align: "right" });
        y += rowHeight;
      });

      y = checkNewPage(y, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      drawCell(marginX, y, colNo + colDesc, 10);
      drawCell(pageWidth - marginX - colAmt, y, colAmt, 10);
      doc.text("Total", marginX + colNo + 4, y + 7);
      doc.text(`INR ${total.toLocaleString("en-IN")}`, pageWidth - marginX - 6, y + 7, { align: "right" });
      y += 16;
    }

    // Payment Terms Section
    y = checkNewPage(y, 20);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Payment Terms", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3
    });
    y += 18;

    if (formData.milestones?.length) {
      const colAmount = 50;
      const colMilestone = maxContentWidth - colAmount; // two columns: Milestone, Amount

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      drawCell(marginX, y, colMilestone, 8);
      drawCell(pageWidth - marginX - colAmount, y, colAmount, 8);
      doc.text("Milestone", marginX + 4, y + 5);
      doc.text("Amount", pageWidth - marginX - 6, y + 5, { align: "right" });
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      formData.milestones.forEach((m, i) => {
        const milestoneText = m.title || `Milestone ${i + 1}`;
        const descLines = doc.splitTextToSize(milestoneText, colMilestone - 8);
        const rowHeight = Math.max(10, descLines.length * 5 + 4);
        y = checkNewPage(y, rowHeight);
        drawCell(marginX, y, colMilestone, rowHeight);
        drawCell(pageWidth - marginX - colAmount, y, colAmount, rowHeight);
        descLines.forEach((line, lineIdx) => {
          doc.text(line, marginX + 4, y + 7 + lineIdx * 5);
        });
        const amt = parseCurrencyValue(m.amount || 0);
        const amountText = `INR ${amt.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        doc.text(amountText, pageWidth - marginX - 6, y + 7, { align: "right" });
        y += rowHeight;
      });
      y += 12;
    }

    // Project Timeline Section
    y = checkNewPage(y, 20);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Project Timeline", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3
    });
    y += 18;

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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Software Requirements Specification (SRS)", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3
    });
    y += 18;

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
      doc.setFontSize(10);
      const itemText = `${idx + 1}. ${item}`;
      const itemLines = doc.splitTextToSize(itemText, maxContentWidth - 5);
      itemLines.forEach((line) => {
        y = checkNewPage(y, 5);
        doc.text(line, marginX + 5, y);
        y += 5;
      });
      y += 3;
    });

    // Additional Notes Section
    y = addPage();
    y -= 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Additional Notes", marginX, y);
    drawHorizontalGradientLine({
      docInstance: doc,
      x1: marginX,
      x2: pageWidth - marginX,
      y: y + 6,
      height: 3
    });
    y += 18;

    y = checkNewPage(y, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const notesItems = [
      "The quotation is valid for 15 days from the date of issue.",
      "Annual hosting and technical support charges for Year 2 will be quoted separately.",
      "6 months of post-implementation service support (bug fixes and minor updates) is included in this package. Remaining timeline details will be shared after project confirmation."
    ];

    notesItems.forEach((note) => {
      y = checkNewPage(y, 8);
      doc.setFont("helvetica", "normal");
      const bulletWidth = doc.getTextWidth("• ");
      const noteLines = doc.splitTextToSize(note, maxContentWidth - 5 - bulletWidth);
      noteLines.forEach((line, lineIdx) => {
        y = checkNewPage(y, 5);
        const bulletX = marginX + 3;
        const textX = marginX + 3 + bulletWidth;
        if (lineIdx === 0) {
          doc.text("• ", bulletX, y);
        }
        const lineX = lineIdx === 0 ? textX : marginX + 8;
        doc.text(line, lineX, y);
        y += 5;
      });
      y += 3;
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
      y += 3; // Add gap above additional notes
      let customNotesItems = parseHtmlToText(formData.conclusionNotes);
      const hasContent = customNotesItems && customNotesItems.some((i) => (i.text || "").replace(/[\s\u00A0]+/g, "").length > 0);
      if (!hasContent) {
        const plain = stripHtml(formData.conclusionNotes).replace(/\u00A0/g, " ");
        if (plain) {
          customNotesItems = [{ text: plain, isBold: false, isListItem: false }];
        }
      }
      if (customNotesItems && customNotesItems.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        customNotesItems.forEach((item) => {
          if (item.isBreak) {
            y += 5;
            return;
          }
          const text = item.text || "";
          if (text.trim()) {
            doc.setFont("helvetica", item.isBold ? "bold" : "normal");
            const lines = doc.splitTextToSize(text, maxContentWidth - (item.isListItem ? 8 : 0));
            lines.forEach((line) => {
              y = checkNewPage(y, 5);
              const xPos = item.isListItem ? marginX + 8 : marginX;
              doc.text(line, xPos, y);
              y += 5;
            });
          }
        });
      }
    }

    // Closing
    y = checkNewPage(y, 20);
    y += 10; // Add gap above Warm Regards
    doc.text("Warm Regards,", marginX, y);
    y += 5;
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

    // Create blob URL for preview
    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    setPreviewPdfUrl(url);
  };

  const handlePreview = () => {
    if (previewPdfUrl) {
      window.open(previewPdfUrl, '_blank');
    }
  };

  const handleDownloadFromPreview = async () => {
    await generatePDF();
    setIsModalOpen(false);
    setCurrentStep(0);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };

  const canProceedToNext = () => {
    if (currentStep === 0) return isDetailsValid();
    if (currentStep === 1) return true; // Scope of Work is optional
    if (currentStep === 2) return formData.pricingRows?.length > 0 && formData.pricingRows.some(r => r.description && r.amount);
    if (currentStep === 3) return true; // Timeline Phases is optional
    if (currentStep === 4) return true; // Milestones is optional
    if (currentStep === 5) return true; // Additional Notes is optional
    return true;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
      <div className="w-full mt-10 ">
        <div className="mx-auto ">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Proposals
              </h1>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Manage and create your proposals
              </p>
            </div>
            <button
              onClick={() => {
                setIsModalOpen(true);
                setCurrentStep(0);
                setPreviewPdfUrl(null);
              }}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isDark
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              <Plus className="w-5 h-5" />
              Create Proposal
            </button>
          </div>

          {/* PDF List Section */}
          <div className={`rounded-lg border h-[78vh] ${isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"} mb-6`}>
            <div className="p-6">
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Downloaded PDFs
              </h2>
              {loadingPdfs ? (
                <div className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Loading PDFs...
                </div>
              ) : pdfList.length === 0 ? (
                <div className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  No PDFs found. Create your first proposal!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pdfList.map((pdf) => {
                    const pdfUrl = pdfUrls[pdf.name] || getPdfUrl(pdf.name);
                    const handleShare = async () => {
                      if (!pdfUrl) return;
                      try {
                        await navigator.clipboard.writeText(pdfUrl);
                        alert("Share link copied to clipboard");
                      } catch (err) {
                        alert("Unable to copy link");
                      }
                    };
                    return (
                      <div
                        key={pdf.id}
                        className={`p-4 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"} hover:shadow-lg transition-shadow`}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className={`w-8 h-8 ${isDark ? "text-orange-500" : "text-orange-600"} flex-shrink-0 mt-1`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                              {pdf.name.replace(/_/g, " ").replace(/\.pdf$/i, "")}
                            </p>
                            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {pdf.created_at ? new Date(pdf.created_at).toLocaleDateString() : "Unknown date"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => pdfUrl && window.open(pdfUrl, "_blank", "noopener,noreferrer")}
                            disabled={!pdfUrl}
                            className={`flex-1 text-center px-3 py-2 rounded text-sm font-medium transition-colors ${
                              pdfUrl
                                ? isDark
                                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            View
                          </button>
                          <a
                            href={pdfUrl || "#"}
                            download
                            onClick={(e) => {
                              if (!pdfUrl) e.preventDefault();
                            }}
                            className={`flex-1 text-center px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                              pdfUrl
                                ? isDark
                                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                                  : "bg-orange-500 hover:bg-orange-600 text-white"
                                : "bg-orange-200 text-orange-900 cursor-not-allowed"
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                          <button
                            onClick={handleShare}
                            disabled={!pdfUrl}
                            className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center ${
                              pdfUrl
                                ? isDark
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-blue-200 text-blue-900 cursor-not-allowed"
                            }`}
                          >
                            Share
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <div className={`w-full max-w-[1400px] max-h-[90vh] rounded-lg ${isDark ? "bg-[#262626]" : "bg-white"} shadow-xl flex flex-col`}>
                {/* Modal Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Create Proposal
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setCurrentStep(0);
                      if (previewPdfUrl) {
                        URL.revokeObjectURL(previewPdfUrl);
                        setPreviewPdfUrl(null);
                      }
                    }}
                    className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Stepper */}
                <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-4">
                    {steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${
                              index <= currentStep
                                ? isDark
                                  ? "bg-orange-600 text-white"
                                  : "bg-orange-500 text-white"
                                : isDark
                                  ? "bg-gray-700 text-gray-400"
                                  : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {index < currentStep ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <span
                            className={`text-sm font-medium whitespace-nowrap ${
                              index <= currentStep
                                ? isDark
                                  ? "text-white"
                                  : "text-gray-900"
                                : isDark
                                  ? "text-gray-400"
                                  : "text-gray-600"
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`h-0.5 w-8 flex-shrink-0 ${
                              index < currentStep
                                ? isDark
                                  ? "bg-orange-600"
                                  : "bg-orange-500"
                                : isDark
                                  ? "bg-gray-700"
                                  : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {currentStep === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Creator Name *</label>
                          <input type="text" name="creatorName" value={formData.creatorName} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Creator Phone *</label>
                          <input type="tel" name="creatorPhone" value={formData.creatorPhone} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Creator Designation  *</label>
                          <input type="text" name="creatorDesignation" value={formData.creatorDesignation} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                        </div>
                        
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-3">
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Scope of Work</label>
                      <CustomRichTextEditor
                        isDark={isDark}
                        value={formData.scopeDescription || ""}
                        onChange={(value) => setFormData((prev) => ({ ...prev, scopeDescription: value }))}
                        placeholder="Enter scope of work..."
                      />
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Pricing Summary</span>
                        <button onClick={addPricingRow} className={`${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white px-3 py-1.5 rounded flex items-center gap-2`}>
                          <Plus className="w-4 h-4" />Add Row
                        </button>
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
                                  <button onClick={() => removePricingRow(idx)} className={`${isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"} text-white px-2 py-1 rounded flex items-center gap-1`}>
                                    <Trash2 className="w-4 h-4" />Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end">
                        <div className={`px-4 py-2 rounded ${isDark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>
                          Total: ₹ {calculateSubtotal().toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Total Duration (Months) *</label>
                          <input type="number" min="0" name="timelineMonths" value={formData.timelineMonths} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Total Duration (Weeks) *</label>
                          <input type="number" min="0" name="timelineWeeks" value={formData.timelineWeeks} onChange={handleInputChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Timeline Phases</label>
                        <button onClick={addTimelinePhase} className={`${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white px-3 py-1.5 rounded flex items-center gap-2`}>
                          <Plus className="w-4 h-4" />Add Row
                        </button>
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
                                  <input type="text" value={r.week} onChange={(e) => updateTimelinePhase(idx, "week", e.target.value)} className={`w-full px-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`} placeholder="Week" />
                                </td>
                                <td className="px-2 py-2">
                                  <input type="text" value={r.phase} onChange={(e) => updateTimelinePhase(idx, "phase", e.target.value)} className={`w-full px-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`} placeholder="Phase" />
                                </td>
                                <td className="px-2 py-2 text-right">
                                  <button onClick={() => removeTimelinePhase(idx)} className={`${isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"} text-white px-2 py-1 rounded flex items-center gap-1`}>
                                    <Trash2 className="w-4 h-4" />Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {(!formData.timelinePhases || formData.timelinePhases.length === 0) && (
                              <tr>
                                <td colSpan="4" className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  No timeline phases added yet. Click "Add Row" to get started.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Milestones</label>
                          <button
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                milestones: [...(prev.milestones || []), { title: "", amount: "" }],
                              }))
                            }
                            className={`${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white px-3 py-1.5 rounded flex items-center gap-2`}
                          >
                            <Plus className="w-4 h-4" />Add Milestone
                          </button>
                        </div>
                      <div className="space-y-3">
                        {(formData.milestones || []).map((m, idx) => (
                          <div key={idx} className={`grid grid-cols-7 gap-3 ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={m.title}
                                onChange={(e) => {
                                  const arr = [...(formData.milestones || [])];
                                  arr[idx] = { ...arr[idx], title: e.target.value };
                                  setFormData((prev) => ({ ...prev, milestones: arr }));
                                }}
                                className={`w-full px-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                placeholder="Milestone"
                              />
                            </div>
                            <div className="col-span-2">
                              <div className="relative">
                                <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>₹</span>
                                <input
                                  type="text"
                                  value={m.amount || ""}
                                  onChange={(e) => updateMilestoneAmount(idx, e.target.value)}
                                  className={`w-full pl-8 pr-3 py-2 rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                  placeholder="Amount"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button onClick={() => {
                                const arr = [...(formData.milestones || [])]; arr.splice(idx, 1); setFormData((prev) => ({ ...prev, milestones: arr.length ? arr : [] }));
                              }} className={`${isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"} text-white px-2 py-1 rounded flex items-center gap-1`}>
                                <Trash2 className="w-4 h-4" />Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!formData.milestones || formData.milestones.length === 0) && (
                          <div className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            No milestones added yet. Click "Add Milestone" to get started.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 5 && (
                    <div className="space-y-3">
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Additional Notes</label>
                      <CustomRichTextEditor
                        isDark={isDark}
                        value={formData.conclusionNotes || ""}
                        onChange={(value) => setFormData((prev) => ({ ...prev, conclusionNotes: value }))}
                        placeholder="Enter additional notes..."
                      />
                    </div>
                  )}

                  {currentStep === 6 && (
                    <div className="space-y-4">
                      <div className={`p-8 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex flex-col items-center justify-center min-h-[400px]`}>
                        <h3 className={`text-2xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                          Ready to Download
                        </h3>
                        <p className={`text-sm mb-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Your proposal PDF is ready. Preview it in a new tab or download it directly.
                        </p>
                        {previewPdfUrl ? (
                          <div className="flex gap-4">
                            <button
                              onClick={handlePreview}
                              className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                isDark
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-blue-500 hover:bg-blue-600 text-white"
                              }`}
                            >
                              <FileText className="w-5 h-5" />
                              Preview
                            </button>
                            <button
                              onClick={handleDownloadFromPreview}
                              className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                isDark
                                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                                  : "bg-orange-500 hover:bg-orange-600 text-white"
                              }`}
                            >
                              <Download className="w-5 h-5" />
                              Download PDF
                            </button>
                          </div>
                        ) : (
                          <div className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                            Generating preview...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className={`flex items-center justify-between p-6 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <button
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      currentStep === 0
                        ? isDark
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : isDark
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex gap-2">
                    {currentStep === steps.length - 1 ? (
                      <div className="flex gap-2">
                        
                        
                      </div>
                    ) : (
                      <button
                        onClick={handleNext}
                        disabled={!canProceedToNext()}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          !canProceedToNext()
                            ? isDark
                              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : isDark
                              ? "bg-orange-600 hover:bg-orange-700 text-white"
                              : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

}
