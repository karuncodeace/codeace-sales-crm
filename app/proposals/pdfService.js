import jsPDF from "jspdf";

// -------- Helpers shared by both PDF generators --------
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

const hexToRgb = (hex) => {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const drawHorizontalGradientLine = ({ docInstance, x1, x2, y, height = 2.5 }) => {
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
};

// -------- Shared render function --------
const renderProposal = ({
  doc,
  formData,
  parseCurrencyValue,
  addHeader,
  addFooter,
  addWatermark,
  footerHeight,
  headerHeight,
}) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
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

  // PAGE 1: Cover Page
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
    doc.text(line, pageWidth / 2, y + idx * 6, { align: "center" });
  });
  y += titleLines.length * 6 + 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = checkNewPage(y, 8);
  doc.text(`Date : ${formatDate(formData.proposalDate)}`, marginX, y);
  y += 8;

  y = checkNewPage(y, 15);
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
  const para1 =
    "We appreciate the opportunity to partner with you in digitizing and streamlining Medical Care operations.";
  const para1Lines = doc.splitTextToSize(para1, maxContentWidth);
  para1Lines.forEach((line) => {
    y = checkNewPage(y, 5);
    doc.text(line, marginX, y);
    y += 5;
  });
  y += 3;

  y = checkNewPage(y, 15);
  const para2 = `Based on the detailed RFP requirements, we are pleased to present a comprehensive quotation and technical proposal for the development and implementation of a custom-built solution using the ${
    formData.technology || "Frappe ERPNext Framework"
  }. Leveraging its modular architecture, extensive customization capabilities, and proven reliability, our team will design a system tailored specifically to your organizational workflows. The objective is to streamline operations, enhance data visibility, support cross-department collaboration, and create a scalable digital ecosystem that can evolve with your future business needs.`;
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
    height: 3,
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
    height: 3,
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

  // Payment Terms Section (Milestones)
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
    height: 3,
  });
  y += 18;

  if (formData.milestones?.length) {
    const colAmount = 50;
    const colMilestone = maxContentWidth - colAmount;

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
    height: 3,
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
    formData.timelinePhases.forEach((phase) => {
      y = checkNewPage(y, 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${phase.week || ""}: ${phase.phase || ""}`, marginX + 5, y);
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
    height: 3,
  });
  y += 18;

  y = checkNewPage(y, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const srsIntro =
    "A comprehensive SRS document will be shared before development begins. This will serve as the legal and binding agreement. It will include:";
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
    "Timelines & Milestones - Delivery plan with date",
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
    height: 3,
  });
  y += 18;

  y = checkNewPage(y, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const notesItems = [
    "The quotation is valid for 15 days from the date of issue.",
    "Annual hosting and technical support charges for Year 2 will be quoted separately.",
    "6 months of post-implementation service support (bug fixes and minor updates) is included in this package. Remaining timeline details will be shared after project confirmation.",
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
  const conclusionText =
    "We look forward to delivering a high-performing ERP, CRM & HRMS that aligns with your operational goals. Please don't hesitate to get in touch for any clarification or customization in scope.";
  const conclusionLines = doc.splitTextToSize(conclusionText, maxContentWidth);
  conclusionLines.forEach((line) => {
    y = checkNewPage(y, 5);
    doc.text(line, marginX, y);
    y += 5;
  });

  // Custom conclusion notes if provided
  if (formData.conclusionNotes) {
    y = checkNewPage(y, 10);
    y += 3; // gap above notes
    let customNotesItems = parseHtmlToText(formData.conclusionNotes);
    const hasContent =
      customNotesItems && customNotesItems.some((i) => (i.text || "").replace(/[\s\u00A0]+/g, "").length > 0);
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
  y += 10;
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
};

// -------- Public API --------
export const generatePDF = async ({ formData, supabase, setPdfList, parseCurrencyValue }) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerHeight = 15;
  const headerHeight = 20;

  const addHeader = (d, pageW, headerH) => {
    try {
      const headerImg = "/pdf/header.png";
      d.addImage(headerImg, "PNG", 0, 0, pageW, headerH);
    } catch (err) {
      console.error("Error loading header:", err);
    }
  };

  const addFooter = (d, pageW, pageH, footerH) => {
    try {
      const footerImg = "/pdf/footer.png";
      d.addImage(footerImg, "PNG", 0, pageH - footerH, pageW, footerH);
    } catch (err) {
      console.error("Error loading footer:", err);
    }
  };

  const addWatermark = (d, pageW, pageH) => {
    try {
      const watermarkImg = "/pdf/watermark.png";
      const watermarkSize = 80;
      const x = (pageW - watermarkSize) / 2;
      const y = (pageH - watermarkSize) / 2;
      d.addImage(watermarkImg, "PNG", x, y, watermarkSize, watermarkSize, undefined, "FAST");
    } catch (err) {
      console.error("Error loading watermark:", err);
    }
  };

  renderProposal({
    doc,
    formData,
    parseCurrencyValue,
    addHeader,
    addFooter,
    addWatermark,
    footerHeight,
    headerHeight,
  });

  const fileName = `${(formData.clientOrganization || "proposal").replace(/[^a-z0-9]/gi, "_")}_${formData.proposalDate || ""}.pdf`;
  const pdfBlob = doc.output("blob");

  if (supabase) {
    try {
      const path = `proposals/${fileName}`;
      const { error } = await supabase.storage.from("proposal_pdf").upload(path, pdfBlob, {
        cacheControl: "3600",
        contentType: "application/pdf",
        upsert: true,
      });
      if (error) {
        console.error("Supabase upload error:", error.message);
      } else if (setPdfList) {
        const { data } = await supabase.storage
          .from("proposal_pdf")
          .list("proposals", { limit: 100, offset: 0, sortBy: { column: "created_at", order: "desc" } });
        if (data) {
          const pdfs = (data || [])
            .filter((file) => file.name.endsWith(".pdf"))
            .map((file) => ({ name: file.name, created_at: file.created_at, id: file.id }));
          setPdfList(pdfs);
        }
      }
    } catch (err) {
      console.error("Supabase upload failed:", err);
    }
  }

  doc.save(fileName);
};

export const generatePreviewPDF = async ({ formData, parseCurrencyValue }) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerHeight = 13;
  const headerHeight = 20;

  const addHeader = (d, pageW, headerH) => {
    try {
      const headerImg = "/pdf/header.png";
      d.addImage(headerImg, "PNG", 0, 0, pageW, headerH);
    } catch (err) {
      console.error("Error loading header:", err);
    }
  };

  const addFooter = (d, pageW, pageH, footerH) => {
    try {
      const footerImg = "/pdf/footer.png";
      d.addImage(footerImg, "PNG", 0, pageH - footerH, pageW, footerH);
    } catch (err) {
      console.error("Error loading footer:", err);
    }
  };

  const addWatermark = (d, pageW, pageH) => {
    try {
      const watermarkImg = "/pdf/watermark.png";
      const watermarkSize = 80;
      const x = (pageW - watermarkSize) / 2;
      const y = (pageH - watermarkSize) / 2;
      d.addImage(watermarkImg, "PNG", x, y, watermarkSize, watermarkSize, undefined, "FAST");
    } catch (err) {
      console.error("Error loading watermark:", err);
    }
  };

  renderProposal({
    doc,
    formData,
    parseCurrencyValue,
    addHeader,
    addFooter,
    addWatermark,
    footerHeight,
    headerHeight,
  });

  const pdfBlob = doc.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  return url;
};

