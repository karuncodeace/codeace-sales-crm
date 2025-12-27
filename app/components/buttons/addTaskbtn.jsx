"use client";

import { useTheme } from "../../context/themeContext";
import toast from "react-hot-toast";
import { useState, useEffect, useMemo } from "react";
import { generateTaskTitle, canCreateTaskForStage, getDemoCount } from "../../../lib/utils/taskTitleGenerator";

export default function AddTaskModal({ open, onClose, onAdd, leads = [], salesPersons = [], isSubmitting = false }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [formData, setFormData] = useState({
    title: "",
    type: "Call",
    lead_id: "",
    sales_person_id: "",
    due_datetime: "",
    priority: "Warm",
    status: "Pending",
    comments: "",
  });

  const [errors, setErrors] = useState({});
  const [existingTasks, setExistingTasks] = useState([]);
  
  // Fetch existing tasks for selected lead
  useEffect(() => {
    if (formData.lead_id) {
      fetch(`/api/tasks?lead_id=${formData.lead_id}`)
        .then((res) => res.json())
        .then((data) => {
          setExistingTasks(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          setExistingTasks([]);
        });
    } else {
      setExistingTasks([]);
    }
  }, [formData.lead_id]);
  
  // Get selected lead data
  const selectedLead = useMemo(() => {
    return leads.find((lead) => lead.id === formData.lead_id) || null;
  }, [leads, formData.lead_id]);
  
  // Generate task title based on selected lead's stage
  const generatedTitle = useMemo(() => {
    if (!selectedLead || !formData.lead_id) return "";
    
    const currentStage = selectedLead.status || "New";
    
    if (!canCreateTaskForStage(currentStage)) {
      return "";
    }
    
    try {
      const options = {};
      if (currentStage === "Demo") {
        options.demoCount = getDemoCount(existingTasks);
      }
      const leadName = selectedLead.name || selectedLead.lead_name || "";
      return generateTaskTitle(currentStage, leadName, options);
    } catch (error) {
      return "";
    }
  }, [selectedLead, existingTasks]);

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.lead_id) {
      newErrors.lead_id = "Lead is required";
    } else if (selectedLead) {
      const currentStage = selectedLead.status || "New";
      if (!canCreateTaskForStage(currentStage)) {
        newErrors.lead_id = "Cannot create tasks for leads in 'Won' stage";
      }
    }
    
    if (!generatedTitle) {
      newErrors.title = "Task title could not be generated. Please check lead selection.";
    }
    
    if (!formData.sales_person_id) newErrors.sales_person_id = "Sales person is required";
    if (!formData.due_datetime) newErrors.due_datetime = "Due date and time is required";
    if (!formData.priority) newErrors.priority = "Priority is required";
    
    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, activeTasks: existingTasks.filter(
      (t) => String(t.status || "").toLowerCase() !== "completed"
    ) };
  };

  const handleSubmit = async () => {
    const validation = validateForm();
    if (!validation.isValid) return;
    
    // Check for existing active tasks and show confirmation if needed
    if (validation.activeTasks.length > 0) {
      const confirmMessage = `This lead already has ${validation.activeTasks.length} active task(s). Do you want to create another task?`;
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{confirmMessage}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  proceedWithSubmit();
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: "top-center",
        }
      );
      return;
    }
    
    proceedWithSubmit();
  };
  
  const proceedWithSubmit = async () => {
    // Use generated title instead of formData.title
    const finalTitle = generatedTitle || formData.title;
    
    if (!finalTitle) {
      toast.error("Task title could not be generated. Please check lead selection.");
      return;
    }

    // Get current stage from selected lead
    const selectedLead = leads.find(l => l.id === formData.lead_id);
    const currentStage = selectedLead?.status || selectedLead?.current_stage || "New";
    
    // Call the onAdd function with the form data
    await onAdd({
      title: finalTitle,
      type: formData.type,
      lead_id: formData.lead_id,
      stage: currentStage, // CRITICAL: Always include stage
      sales_person_id: formData.sales_person_id,
      due_datetime: new Date(formData.due_datetime).toISOString(),
      priority: formData.priority,
      status: formData.status,
      comments: formData.comments || null,
    });
    
    // Reset form
    setFormData({
      title: "",
      type: "Call",
      lead_id: "",
      sales_person_id: "",
      due_datetime: "",
      priority: "Warm",
      status: "Pending",
      comments: "",
    });
    setErrors({});
    setExistingTasks([]);
  };

  const handleClose = () => {
    setErrors({});
    setFormData({
      title: "",
      type: "Call",
      lead_id: "",
      sales_person_id: "",
      due_datetime: "",
      priority: "Warm",
      status: "Pending",
      comments: "",
    });
    setExistingTasks([]);
    onClose();
  };
  
  // Handle lead selection change
  const handleLeadChange = (leadId) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      const currentStage = lead.status || "New";
      if (!canCreateTaskForStage(currentStage)) {
        toast.error("Cannot create tasks for leads in 'Won' stage");
        return;
      }
    }
    updateField("lead_id", leadId);
  };

  const inputClass = (field) =>
    `mt-1 w-full p-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
      isDark
        ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
        : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
    } ${errors[field] ? "border-red-500 ring-1 ring-red-500/50" : ""}`;

  const selectClass = (field) =>
    `mt-1 w-full p-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
      isDark
        ? "bg-[#262626] border-gray-700 text-gray-200"
        : "bg-white border-gray-300 text-gray-900"
    } ${errors[field] ? "border-red-500 ring-1 ring-red-500/50" : ""}`;

  const labelClass = `text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-xl mx-4 rounded-2xl shadow-2xl transform transition-all ${
          isDark ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
        }`}
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
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Add New Task</h2>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Create a new task for your team
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Task Title - Auto-generated */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                Task Title <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">(Auto-generated based on stage)</span>
              </label>
              <input
                type="text"
                placeholder="Select a lead to generate title..."
                className={`${inputClass("title")} ${!generatedTitle ? "bg-gray-100 cursor-not-allowed" : ""}`}
                value={generatedTitle}
                disabled
                readOnly
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
              {generatedTitle && (
                <p className="mt-1 text-xs text-gray-500">
                  Task title is automatically generated based on the lead's current stage.
                </p>
              )}
            </div>

            {/* Task Type */}
            <div>
              <label className={labelClass}>Task Type</label>
              <select
                className={selectClass("type")}
                value={formData.type}
                onChange={(e) => updateField("type", e.target.value)}
              >
                <option value="Call">Call</option>
                <option value="Meeting">Meeting</option>
                <option value="Follow-Up">Follow-Up</option>
                <option value="Proposal">Proposal</option>
                <option value="Email">Email</option>
              </select>
            </div>

            {/* Lead Selection */}
            <div>
              <label className={labelClass}>
                Lead <span className="text-red-500">*</span>
              </label>
              <select
                className={selectClass("lead_id")}
                value={formData.lead_id}
                onChange={(e) => handleLeadChange(e.target.value)}
              >
                <option value="">Select a lead</option>
                {leads.map((lead) => {
                  const leadStage = lead.status || "New";
                  const canCreate = canCreateTaskForStage(leadStage);
                  return (
                    <option 
                      key={lead.id} 
                      value={lead.id}
                      disabled={!canCreate}
                    >
                      {lead.name || lead.lead_name} {!canCreate ? "(Won - cannot create tasks)" : ""}
                    </option>
                  );
                })}
              </select>
              {errors.lead_id && <p className="mt-1 text-xs text-red-500">{errors.lead_id}</p>}
              {selectedLead && existingTasks.length > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  This lead has {existingTasks.filter(t => String(t.status || "").toLowerCase() !== "completed").length} active task(s).
                </p>
              )}
            </div>

            {/* Sales Person */}
            <div>
              <label className={labelClass}>
                Assigned To <span className="text-red-500">*</span>
              </label>
              <select
                className={selectClass("sales_person_id")}
                value={formData.sales_person_id}
                onChange={(e) => updateField("sales_person_id", e.target.value)}
              >
                <option value="">Select sales person</option>
                {salesPersons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name || person.sales_person_name || person.full_name || person.id}
                  </option>
                ))}
              </select>
              {errors.sales_person_id && <p className="mt-1 text-xs text-red-500">{errors.sales_person_id}</p>}
            </div>

            {/* Due Date & Time */}
            <div>
              <label className={labelClass}>
                Due Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={inputClass("due_datetime")}
                value={formData.due_datetime}
                onChange={(e) => updateField("due_datetime", e.target.value)}
              />
              {errors.due_datetime && <p className="mt-1 text-xs text-red-500">{errors.due_datetime}</p>}
            </div>

            {/* Priority */}
            <div>
              <label className={labelClass}>
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                className={selectClass("priority")}
                value={formData.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              >
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
              {errors.priority && <p className="mt-1 text-xs text-red-500">{errors.priority}</p>}
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={selectClass("status")}
                value={formData.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Comments */}
            <div className="md:col-span-2">
              <label className={labelClass}>Comments</label>
              <textarea
                placeholder="Add any notes or comments..."
                className={`${inputClass("comments")} resize-none`}
                rows={3}
                value={formData.comments}
                onChange={(e) => updateField("comments", e.target.value)}
              />
            </div>
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
            } disabled:opacity-50`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Add Task
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
