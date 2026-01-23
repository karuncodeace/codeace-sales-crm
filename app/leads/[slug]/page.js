"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Phone, Mail, MessageSquare, MoreHorizontal, ArrowLeft, MapPin, User, Target, IndianRupee, Flame, Calendar, Clock, CheckCircle2, Circle, FileText, TrendingUp, Building2, Loader2, Copy, Check, Plus, Edit2, Trash2, StickyNote, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/themeContext";
import EmailModal from "../../components/ui/email-modal";
import OverveiwTab from "./components/overveiwTab";
import ActivityTab from "./components/activityTab";
import TasksTab from "./components/taskstab";
import NotesTab from "./components/notesTab";
import ObjectionTab from "./components/objectionTab";
import BookMeetingButton from "../../components/buttons/bookMeetingbtn";
import EditLeadScoreModal from "../../components/buttons/editLeadScorebtn";
import PriorityDropdown from "../../components/buttons/priorityTooglebtn";
import StatusDropdown from "../../components/buttons/statusTooglebtn";
import CallBtn from "../../components/buttons/callbtn";
import toast from "react-hot-toast";
const fetcher = (url) => fetch(url).then((res) => res.json());

// Notes Tab Component

export default function LeadDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const leadId = params.slug;
    
    const { data: lead, error, isLoading, mutate } = useSWR(
        leadId ? `/api/leads/${leadId}` : null,
        fetcher
    );
    
    // Fetch tasks for this lead
    const { data: tasksData } = useSWR(
        leadId ? `/api/tasks?lead_id=${leadId}` : null,
        fetcher
    );
    
    // Fetch activities for this lead
    const { data: activitiesData } = useSWR(
        leadId ? `/api/task-activities?lead_id=${leadId}` : null,
        fetcher
    );
    
    const { theme } = useTheme();
    const [tab, setTab] = useState("overview");
    const [isConnectMenuOpen, setIsConnectMenuOpen] = useState(false);
    const connectMenuRef = useRef(null);
    
    // Handle scroll to demo section
    useEffect(() => {
        if (!searchParams) return;
        const scrollToDemo = searchParams.get("scrollToDemo");
        if (scrollToDemo === "true") {
            // Switch to tasks tab and scroll to demo booking section
            setTab("tasks");
            // Remove the query parameter
            router.replace(`/leads/${leadId}`, { scroll: false });
            // Scroll after a short delay to ensure tab is rendered
            setTimeout(() => {
                // Try to find the BookMeetingButton or scroll to top of tasks section
                const tasksSection = document.querySelector('[data-tasks-section]');
                if (tasksSection) {
                    tasksSection.scrollIntoView({ behavior: "smooth", block: "start" });
                } else {
                    // Fallback: scroll to top of page
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
            }, 300);
        }
    }, [searchParams, leadId, router]);

    // Close connect menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (connectMenuRef.current && !connectMenuRef.current.contains(event.target)) {
                setIsConnectMenuOpen(false);
            }
        };

        if (isConnectMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isConnectMenuOpen]);
    const [emailModal, setEmailModal] = useState({
        isOpen: false,
        recipientEmail: "",
        recipientName: "",
    });
 
    const [isEditScoreModalOpen, setIsEditScoreModalOpen] = useState(false);
    
    // Status change modal state - UPDATED: Status changes now require explicit user action with modal
    // Current stage comment → saves to task_activities as note (general category)
    // Next task → creates a task in tasks_table
    const [statusChangeModal, setStatusChangeModal] = useState({
        isOpen: false,
        newStatus: null,
        comment: "", // Current stage comment - saves to task_activities as note
        nextTask: "", // Next task description - creates task in tasks_table
        connectThrough: "",
        dueDate: "", // Due date for next task
        outcome: "Success",
        isSubmitting: false,
        showCalendar: false,
    });

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "tasks", label: "Tasks" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
        { id : "objections", label: "Objections" },

    ];

   

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className={`w-8 h-8 animate-spin ${theme === "dark" ? "text-orange-400" : "text-orange-500"}`} />
            </div>
        );
    }

    if (error || !lead) {
        return (
            <div className="p-6 space-y-6 pl-0 pt-10">
                <button
                    onClick={() => router.back()}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${theme === "dark" ? "text-gray-400 hover:text-orange-400" : "text-gray-600 hover:text-orange-600"}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Leads
                </button>
                <div className={`text-center py-12 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    <p className="text-lg">Lead not found</p>
                </div>
            </div>
        );
    }



    const handlePriorityUpdate = async (newPriority) => {
        if (!leadId) return;
        const optimistic = { ...lead, priority: newPriority };
        mutate(optimistic, false);
        try {
            const res = await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: leadId, priority: newPriority }),
            });
            if (!res.ok) throw new Error("Failed to update priority");
            await mutate();
        } catch (err) {
            await mutate(); // revert to server state
        }
    };

    // UPDATED: Status changes now open a modal to collect notes and optional follow-up task info
    const handleStatusUpdate = (newStatus) => {
        if (!leadId) return;
        // Open modal instead of directly updating
        setStatusChangeModal({
            isOpen: true,
            newStatus: newStatus,
            comment: "",
            nextTask: "",
            connectThrough: "",
            dueDate: "",
            outcome: "Success",
            isSubmitting: false,
            showCalendar: false,
        });
    };
    
    // Handle status change modal cancellation
    const handleCancelStatusChange = () => {
        setStatusChangeModal({
            isOpen: false,
            newStatus: null,
            comment: "",
            nextTask: "",
            connectThrough: "",
            dueDate: "",
            outcome: "Success",
            isSubmitting: false,
            showCalendar: false,
        });
    };
    
    // Confirm status change - UPDATED: Current comment saves as note, next task creates task
    const handleConfirmStatusChange = async () => {
        const { newStatus, comment, nextTask, connectThrough, dueDate } = statusChangeModal;
        
        if (!comment.trim()) {
            toast.error("Please add a comment before changing status");
            return;
        }
        
        setStatusChangeModal((prev) => ({ ...prev, isSubmitting: true }));
        
        try {
            // STEP 1: Save current stage comment as a NOTE in task_activities (general category)
            // This will be visible in the Notes tab under "General Notes"
            // Get lead's assigned salesperson for note assignment
            const assignedSalespersonId = lead?.assigned_to || lead?.assignedTo;
            
            const noteRes = await fetch("/api/task-activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lead_id: leadId,
                    activity: `Status changed to ${newStatus}`,
                    type: "note", // Save as note type - will appear in Notes tab
                    comments: comment, // Current stage comment
                    notes_type: "general", // General category for notes tab
                    connect_through: connectThrough || null,
                    source: "ui",
                    assigned_to: assignedSalespersonId, // Assign to lead's salesperson
                }),
            });
            
            if (!noteRes.ok) {
                throw new Error("Failed to save note");
            }

            // STEP 1b: Also save to lead_notes table
            try {
                const leadNotesRes = await fetch("/api/lead-notes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lead_id: leadId,
                        notes: comment, // Current stage comment
                        notes_type: "general", // Default to "general"
                    }),
                });

                if (!leadNotesRes.ok) {
                    // Don't fail if lead_notes save fails, but log it
                    console.warn("Failed to save to lead_notes table, but note was saved to task_activities");
                }
            } catch (leadNotesError) {
                // Don't fail if lead_notes save fails
                console.warn("Error saving to lead_notes table:", leadNotesError);
            }
            
            // STEP 2: Save activity log entry (separate from note)
            const activityRes = await fetch("/api/task-activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lead_id: leadId,
                    activity: `Status changed to ${newStatus}`,
                    type: "status",
                    comments: comment,
                    connect_through: connectThrough || null,
                    source: "ui",
                }),
            });
            
            if (!activityRes.ok) {
                // Don't fail if activity log fails, but log it
                console.warn("Failed to save activity log, but note was saved");
            }
            
            // STEP 3: Update lead status
            const res = await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id: leadId, 
                    status: newStatus,
                    current_stage: newStatus,
                }),
            });
            
            if (!res.ok) {
                throw new Error("Failed to update status");
            }
            
            // STEP 4: Create next task if nextTask description is provided
            // This creates a task in tasks_table that can be completed without changing lead status
            if (nextTask && nextTask.trim()) {
                try {
                    const taskTitle = nextTask.trim();
                    
                    // Get lead's assigned salesperson for task assignment
                    const assignedSalespersonId = lead?.assigned_to || lead?.assignedTo;
                    
                    const taskRes = await fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lead_id: leadId,
                            title: taskTitle,
                            type: "Follow-Up",
                            stage: newStatus, // Task stage matches new lead status
                            due_date: dueDate || null,
                            priority: "Medium",
                            sales_person_id: assignedSalespersonId, // Assign to lead's salesperson
                        }),
                    });
                    
                    if (!taskRes.ok) {
                        const errorData = await taskRes.json().catch(() => ({}));
                        console.warn("Failed to create next task:", errorData.error || "Unknown error");
                        // Don't fail status update if task creation fails
                    } else {
                        // Log task creation activity
                        try {
                            await fetch("/api/task-activities", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    lead_id: leadId,
                                    activity: `Task Created: ${taskTitle}`,
                                    type: "task",
                                    comments: `Next task created: ${taskTitle}`,
                                    source: "ui",
                                    assigned_to: assignedSalespersonId,
                                }),
                            });
                        } catch (activityError) {
                            // Don't fail if activity log fails
                            console.warn("Failed to log task creation activity:", activityError);
                        }
                    }
                } catch (taskError) {
                    // Don't fail status update if task creation fails
                    console.warn("Error creating next task:", taskError);
                }
            }
            
            // Refresh data
            await mutate();
            
            // Close modal
            setStatusChangeModal({
                isOpen: false,
                newStatus: null,
                comment: "",
                nextTask: "",
                connectThrough: "",
                dueDate: "",
                outcome: "Success",
                isSubmitting: false,
                showCalendar: false,
            });
            
            toast.success("Status updated successfully");
        } catch (error) {
            toast.error(error.message || "Failed to update status");
            setStatusChangeModal((prev) => ({ ...prev, isSubmitting: false }));
        }
    };

    

    

    // Helper to get due_date from task (supporting both due_date and due_datetime for backward compatibility)
    const getTaskDueDate = (task) => {
        return task.due_date || task.due_datetime;
    };

   

   
    const typeIcons = {
        Call: Phone,
        Email: Mail,
        Meeting: Calendar,
        "Follow Up": Clock,
    };

    // Process tasks data
    const tasksList = Array.isArray(tasksData) ? tasksData : [];
    const upcomingTasks = tasksList
        .filter(t => t.status !== "Completed")
        .sort((a, b) => {
            const dateA = getTaskDueDate(a) ? new Date(getTaskDueDate(a)) : new Date(0);
            const dateB = getTaskDueDate(b) ? new Date(getTaskDueDate(b)) : new Date(0);
            return dateA - dateB; // Sort by due date ascending
        })
        .slice(0, 3); // Show only top 3

    const completedTasks = tasksList
        .filter(t => t.status === "Completed")
        .sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA; // Most recent first
        })
        .slice(0, 1); // Show only 1 completed task

    // Process activities data
    const activitiesList = Array.isArray(activitiesData) ? activitiesData : [];
    const recentActivities = activitiesList
        .sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA; // Most recent first
        })
        .slice(0, 4); // Show only top 4

    return (
        <div className="p-6 space-y-6  pl-0 pt-10">
            {/* BACK BUTTON */}
            <button
                onClick={() => router.back()}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${theme === "dark"
                        ? "text-gray-400 hover:text-orange-400"
                        : "text-gray-600 hover:text-orange-600"
                    }`}
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Leads
            </button>

            {/* TOP HEADER */}
            <div className="flex justify-between">
                <div>
                   <div className="flex items-center gap-2 ">
                   <h1 className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {lead.name}  
                    </h1>
                   </div>
                    <div className="flex items-center gap-3 mt-4">
                        <PriorityDropdown
                            value={lead.priority}
                            theme={theme}
                            onChange={handlePriorityUpdate}
                        />
                        <StatusDropdown
                            value={lead.status}
                            theme={theme}
                            onChange={handleStatusUpdate}
                        />
                    </div>
                </div>
                

                {/* Connect Through Dropdown */}
                <div ref={connectMenuRef} className="relative">
                    <button
                        onClick={() => setIsConnectMenuOpen(!isConnectMenuOpen)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 shadow-md hover:shadow-lg ${
                            isConnectMenuOpen ? "bg-orange-600" : ""
                        }`}
                    >
                        <span>Connect</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isConnectMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isConnectMenuOpen && (
                        <div
                            className={`absolute right-0 mt-2 w-64 rounded-xl shadow-2xl py-3 z-50 transition-all duration-200 ${
                                theme === "dark"
                                    ? "bg-[#262626] border border-gray-700"
                                    : "bg-white border border-gray-200"
                            }`}
                        >
                            <div className="px-3 space-y-2">
                                <div className="w-full [&>button]:w-full [&>button]:justify-center">
                                    <CallBtn 
                                        leadId={lead.id || lead.lead_id}
                                        phone={lead.phone || lead.lead_phone}
                                        name={lead.name || lead.lead_name}
                                        email={lead.email || lead.lead_email}
                                    />
                                </div>
                                <div className={`h-px ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}></div>
                                <div className="w-full [&>button]:w-full [&>button]:justify-center">
                                    <BookMeetingButton lead={lead} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* tabs */}
            <div className={`flex items-center gap-1 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-3 text-sm font-medium transition-colors relative
                            ${tab === t.id
                                ? theme === "dark"
                                    ? "text-orange-400"
                                    : "text-orange-600"
                                : theme === "dark"
                                    ? "text-gray-400 hover:text-gray-200"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {t.label}
                        {tab === t.id && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>
            {tab === "overview" && (
                <OverveiwTab 
                    lead={lead} 
                    leadId={leadId} 
                    setTab={setTab} 
                    onEditScores={() => setIsEditScoreModalOpen(true)}
                    onUpdateLead={(updatedLead) => {
                        mutate(updatedLead, false); // Optimistically update
                        mutate(); // Refresh from server
                    }}
                />
            )}
      
            {/* ACTIVITY TAB */}
            {tab === "activity" && (
                <ActivityTab leadId={leadId} />
            )}
             {/* TASKS TAB */}
            {tab === "tasks" && (
                <div data-tasks-section>
                    <TasksTab theme={theme} leadId={leadId} leadName={lead.name} />
                </div>
            )}

        

            {/* NOTES TAB */}
            {tab === "notes" && (
                <NotesTab theme={theme} leadId={leadId} leadName={lead.name} />
            )}
            {tab === "objections" && (
                <ObjectionTab theme={theme} leadId={leadId} leadName={lead.name} />
            )}

            {/* Email Modal */}
            <EmailModal
                open={emailModal.isOpen}
                onClose={() => setEmailModal({ isOpen: false, recipientEmail: "", recipientName: "" })}
                recipientEmail={emailModal.recipientEmail}
                recipientName={emailModal.recipientName}
                leadId={leadId}
            />

            {/* Edit Lead Score Modal */}
            <EditLeadScoreModal
                isOpen={isEditScoreModalOpen}
                onClose={() => setIsEditScoreModalOpen(false)}
                lead={lead}
                leadId={leadId}
                onSave={() => {
                    mutate(); // Refresh lead data
                }}
            />
            
            {/* Status Change Modal - UPDATED: Status changes now require explicit user action with notes */}
            {statusChangeModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div
                        className={`w-full max-w-md mx-auto rounded-2xl shadow-2xl transform transition-all ${
                            theme === "dark" ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
                        }`}
                    >
                        {/* Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
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
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Change Status</h2>
                                    <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                        Changing to: <span className="font-medium text-orange-500">{statusChangeModal.newStatus}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCancelStatusChange}
                                className={`p-2 rounded-lg transition-colors ${
                                    theme === "dark" ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
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

                        {/* Body */}
                        <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {/* Connect Through */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Connect Through (Optional)
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: "call", label: "Call", icon: "📞" },
                                        { id: "email", label: "Email", icon: "✉️" },
                                        { id: "meeting", label: "Meeting", icon: "🤝" },
                                        { id: "whatsapp", label: "WhatsApp", icon: "💬" },
                                    ].map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setStatusChangeModal((prev) => ({ ...prev, connectThrough: option.id }))}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                                                statusChangeModal.connectThrough === option.id
                                                    ? "border-orange-500 bg-orange-500/10 text-orange-500"
                                                    : theme === "dark"
                                                        ? "border-gray-700 hover:border-gray-600 text-gray-400"
                                                        : "border-gray-200 hover:border-gray-300 text-gray-500"
                                            }`}
                                        >
                                            <span className="text-lg">{option.icon}</span>
                                            <span className="text-xs font-medium">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Current Stage Comment (Required) - UPDATED: Saves as note in task_activities */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Current Stage Comment <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    placeholder="Add a comment about this status change..."
                                    className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                                        theme === "dark"
                                            ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                    }`}
                                    rows={3}
                                    value={statusChangeModal.comment}
                                    onChange={(e) => setStatusChangeModal((prev) => ({ ...prev, comment: e.target.value }))}
                                    autoFocus
                                />
                                <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                    This will be saved as a note in the Notes tab (General category).
                                </p>
                            </div>

                            {/* Next Task (Optional) - UPDATED: Creates a task in tasks_table */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Next Task (Optional)
                                </label>
                                <textarea
                                    placeholder="Describe the next task to be done (e.g., 'Schedule demo call with client')..."
                                    className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                                        theme === "dark"
                                            ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                    }`}
                                    rows={2}
                                    value={statusChangeModal.nextTask}
                                    onChange={(e) => setStatusChangeModal((prev) => ({ ...prev, nextTask: e.target.value }))}
                                />
                                <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                    If provided, a task will be created in the Tasks tab. Completing this task will NOT change lead status.
                                </p>
                            </div>

                            {/* Next Due Date (Optional) */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Next Task Due Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${
                                        theme === "dark"
                                            ? "bg-[#262626] border-gray-700 text-gray-200"
                                            : "bg-white border-gray-200 text-gray-900"
                                    }`}
                                    value={statusChangeModal.dueDate}
                                    onChange={(e) => setStatusChangeModal((prev) => ({ ...prev, dueDate: e.target.value }))}
                                />
                                <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                    Set due date for the follow-up task (if created).
                                </p>
                            </div>
                            
                            {/* Warning if no next task */}
                            {!statusChangeModal.nextTask && !statusChangeModal.dueDate && (
                                <div className={`p-3 rounded-xl border ${theme === "dark" ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
                                    <p className={`text-xs ${theme === "dark" ? "text-amber-300" : "text-amber-700"}`}>
                                        ⚠️ No next task added. This lead may go cold without a next action.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                            <button
                                onClick={handleCancelStatusChange}
                                disabled={statusChangeModal.isSubmitting}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    theme === "dark"
                                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                } disabled:opacity-50`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmStatusChange}
                                disabled={statusChangeModal.isSubmitting || !statusChangeModal.comment.trim()}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {statusChangeModal.isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Update Status
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
