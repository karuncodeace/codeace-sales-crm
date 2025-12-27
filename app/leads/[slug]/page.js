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

    const handleStatusUpdate = async (newStatus) => {
        if (!leadId) return;
        const optimistic = { ...lead, status: newStatus };
        mutate(optimistic, false);
        try {
            const res = await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: leadId, status: newStatus }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            await mutate();
        } catch (err) {
            await mutate(); // revert to server state
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
            <div className="flex items-center justify-between">
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
                        <span>Reach Out</span>
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
        </div>
    );
}
