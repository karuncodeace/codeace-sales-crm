"use client";

import { useTheme } from "../../context/themeContext";
import { useState, useRef, useEffect } from "react";
import { X, Paperclip, Send, Loader2 } from "lucide-react";

export default function EmailModal({ open, onClose, recipientEmail = "", recipientName = "", leadId = null }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [formData, setFormData] = useState({
    to: recipientEmail,
    subject: "",
    content: "",
    attachments: [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // Reset form when modal opens/closes or recipient changes
  useEffect(() => {
    if (open) {
      setFormData({
        to: recipientEmail,
        subject: "",
        content: "",
        attachments: [],
      });
      setErrors({});
    }
  }, [open, recipientEmail]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
    }));
    
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== id)
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.to.trim()) {
      newErrors.to = "Recipient email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.to)) {
      newErrors.to = "Invalid email format";
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }
    
    if (!formData.content.trim()) {
      newErrors.content = "Message content is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare form data for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("to", formData.to);
      formDataToSend.append("subject", formData.subject);
      formDataToSend.append("message", formData.content);
      
      // Append attachments if any
      formData.attachments.forEach((att, index) => {
        formDataToSend.append(`attachment_${index}`, att.file);
      });
      
      // Convert plain text to HTML (preserve line breaks)
      const htmlMessage = formData.content
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '<br>')
        .join('');

      // Send email
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: formData.to,
          subject: formData.subject,
          message: htmlMessage || formData.content,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }
      
      // Log email activity if leadId is provided
      if (leadId) {
        try {
          await fetch('/api/task-activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: leadId,
              activity: `Email sent: ${formData.subject}`,
              type: "email",
              comments: `Email sent to ${formData.to}\n\nSubject: ${formData.subject}\n\n${formData.content}`,
              connect_through: "email",
            }),
          });
        } catch (activityError) {
          // Don't fail the whole operation if activity logging fails
        }
      }
      
      // Reset form and close modal
      setFormData({
        to: recipientEmail,
        subject: "",
        content: "",
        attachments: [],
      });
      onClose();
      
      // Show success message (you can replace with a toast notification)
      alert("Email sent successfully!");
      
    } catch (error) {
      alert(error.message || "Failed to send email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        to: recipientEmail,
        subject: "",
        content: "",
        attachments: [],
      });
      setErrors({});
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-2xl mx-4 rounded-2xl shadow-2xl transform transition-all max-h-[90vh] flex flex-col ${
          isDark ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
        }`}
        onClick={(e) => e.stopPropagation()}
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
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Send Email</h2>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {recipientName ? `To: ${recipientName}` : "Compose and send an email"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* To Field */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              To <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => handleInputChange("to", e.target.value)}
              placeholder="recipient@example.com"
              className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${
                errors.to
                  ? "border-red-500"
                  : isDark
                    ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              }`}
            />
            {errors.to && (
              <p className="mt-1 text-xs text-red-500">{errors.to}</p>
            )}
          </div>

          {/* Subject Field */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              placeholder="Email subject"
              className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${
                errors.subject
                  ? "border-red-500"
                  : isDark
                    ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              }`}
            />
            {errors.subject && (
              <p className="mt-1 text-xs text-red-500">{errors.subject}</p>
            )}
          </div>

          {/* Content Field */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange("content", e.target.value)}
              placeholder="Write your message here..."
              rows={8}
              className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                errors.content
                  ? "border-red-500"
                  : isDark
                    ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              }`}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-500">{errors.content}</p>
            )}
          </div>

          {/* File Attachments */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Attachments
            </label>
            
            {/* File Input Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-3 rounded-xl border-2 border-dashed transition-colors flex items-center justify-center gap-2 ${
                isDark
                  ? "border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300 bg-gray-800/30"
                  : "border-gray-300 hover:border-gray-400 text-gray-500 hover:text-gray-700 bg-gray-50"
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-sm font-medium">Add Attachment</span>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attachments List */}
            {formData.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isDark
                        ? "bg-gray-800/50 border-gray-700"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-lg ${
                        isDark ? "bg-orange-500/20" : "bg-orange-100"
                      }`}>
                        <Paperclip className={`w-3.5 h-3.5 ${
                          isDark ? "text-orange-400" : "text-orange-600"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isDark ? "text-gray-200" : "text-gray-900"
                        }`}>
                          {attachment.name}
                        </p>
                        <p className={`text-xs ${
                          isDark ? "text-gray-500" : "text-gray-500"
                        }`}>
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDark
                          ? "hover:bg-gray-700 text-gray-400 hover:text-red-400"
                          : "hover:bg-gray-200 text-gray-500 hover:text-red-600"
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
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
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

