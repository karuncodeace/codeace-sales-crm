"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Phone, Mail, MapPin, User, Calendar, Clock, CheckCircle2, Circle, FileText, TrendingUp, Building2, Copy, Check, Target, MessageSquare, Zap, Edit2 } from "lucide-react";
import { useTheme } from "../../../context/themeContext";
import EmailModal from "../../../components/ui/email-modal";
import EditLeadModal from "../../../components/buttons/editLeadModal";


const fetcher = (url) => fetch(url).then((res) => res.json());

export default function OverveiwTab({ lead, leadId, setTab, onEditScores, onUpdateLead }) {
    const { theme } = useTheme();
    const [emailModal, setEmailModal] = useState({
        isOpen: false,
        recipientEmail: "",
        recipientName: "",
    });
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);

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

    // Priority badge styles
    const priorityStyles = {
        Hot: {
            light: "bg-red-100 text-red-600",
            dark: "bg-red-900/40 text-red-400 ring-1 ring-inset ring-red-800",
        },
        Warm: {
            light: "bg-orange-100 text-orange-600",
            dark: "bg-orange-900/40 text-orange-400 ring-1 ring-inset ring-orange-800",
        },
        Cold: {
            light: "bg-orange-100 text-orange-600",
            dark: "bg-orange-900/40 text-orange-400 ring-1 ring-inset ring-orange-800",
        },
    };

    // Status badge styles
    const statusStyles = {
        New: {
            light: "text-orange-700 bg-orange-50 ring-1 ring-inset ring-orange-100",
            dark: "text-orange-100 bg-orange-900/40 ring-1 ring-inset ring-orange-700",
        },
        Responded: {
            light: "text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-100",
            dark: "text-amber-500 bg-amber-900/40 ring-1 ring-inset ring-amber-700",
        },
        "Not Responded": {
            light: "text-gray-700 bg-gray-50 ring-1 ring-inset ring-gray-100",
            dark: "text-gray-300 bg-gray-900/20 ring-1 ring-inset ring-gray-700",
        },
        "Demo Scheduled": {
            light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
            dark: "text-purple-500 bg-purple-900/40 ring-1 ring-inset ring-purple-700",
        },
        "Demo Completed": {
            light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
            dark: "text-purple-500 bg-purple-900/40 ring-1 ring-inset ring-purple-700",
        },
        SRS: {
            light: "text-yellow-700 bg-yellow-50 ring-1 ring-inset ring-yellow-100",
            dark: "text-yellow-500 bg-yellow-900/40 ring-1 ring-inset ring-yellow-700",
        },
        "Lost Lead": {
            light: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-100",
            dark: "text-red-500 bg-red-900/40 ring-1 ring-inset ring-red-700",
        },
        "Junk Lead": {
            light: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-100",
            dark: "text-red-500 bg-red-900/40 ring-1 ring-inset ring-red-700",
        },
    };

    if (!lead) {
        return null;
    }

    const priorityStyle = priorityStyles[lead.priority] || priorityStyles.Warm;
    const statusStyle = statusStyles[lead.status] || statusStyles.New;

    // Helper to get due_date from task (supporting both due_date and due_datetime for backward compatibility)
    const getTaskDueDate = (task) => {
        return task.due_date || task.due_datetime;
    };

    // Format turnover in INR (₹ with lakh/crore separators if numeric)
    const formatTurnover = (turnoverValue) => {
        if (!turnoverValue && turnoverValue !== 0) return "—";
        const asString = String(turnoverValue).trim();
        // If already starts with ₹, return as-is
        if (asString.startsWith("₹")) return asString;
        const numeric = Number(asString.replace(/[^0-9.-]/g, ""));
        if (Number.isNaN(numeric)) return `₹ ${asString}`;
        return numeric.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
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

    // Helper functions for formatting dates in Asia/Calcutta timezone
    const formatToCalcuttaTime = (dateString) => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            const options = {
                timeZone: 'Asia/Calcutta',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            return date.toLocaleString('en-IN', options);
        } catch (error) {
            return dateString;
        }
    };

    const formatRelativeTime = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffMins = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const timeOptions = {
            timeZone: 'Asia/Calcutta',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };

        if (diffMins < 60) {
            return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
            return `Yesterday, ${date.toLocaleTimeString('en-IN', timeOptions)}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            const dateOptions = {
                timeZone: 'Asia/Calcutta',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            };
            return date.toLocaleDateString('en-IN', dateOptions);
        }
    };

    const formatTaskDueDate = (dateStr) => {
        if (!dateStr) return "No due date";
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const timeOptions = {
            timeZone: 'Asia/Calcutta',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };

        if (dateOnly.getTime() === today.getTime()) {
            return `Today, ${date.toLocaleTimeString('en-IN', timeOptions)}`;
        }
        if (dateOnly.getTime() === tomorrow.getTime()) {
            return `Tomorrow, ${date.toLocaleTimeString('en-IN', timeOptions)}`;
        }
        if (dateOnly < today) return "Overdue";

        const dateOptions = {
            timeZone: 'Asia/Calcutta',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleString('en-IN', dateOptions);
    };

    // Get activity icon and color based on type
    const getActivityIcon = (type) => {
        const icons = {
            call: { icon: Phone, bg: theme === "dark" ? "bg-orange-900/40" : "bg-orange-100", color: theme === "dark" ? "text-orange-400" : "text-orange-600" },
            email: { icon: Mail, bg: theme === "dark" ? "bg-green-900/40" : "bg-green-100", color: theme === "dark" ? "text-green-400" : "text-green-600" },
            note: { icon: FileText, bg: theme === "dark" ? "bg-purple-900/40" : "bg-purple-100", color: theme === "dark" ? "text-purple-400" : "text-purple-600" },
            status: { icon: TrendingUp, bg: theme === "dark" ? "bg-orange-900/40" : "bg-orange-100", color: theme === "dark" ? "text-orange-400" : "text-orange-600" },
            meeting: { icon: Calendar, bg: theme === "dark" ? "bg-indigo-900/40" : "bg-indigo-100", color: theme === "dark" ? "text-indigo-400" : "text-indigo-600" },
        };
        return icons[type] || icons.note;
    };

    const getActivityTitle = (activity) => {
        if (activity.activity) return activity.activity;
        const titles = {
            call: "Phone call",
            email: "Email sent",
            note: "Note added",
            status: "Status changed",
            meeting: "Meeting",
        };
        return titles[activity.type] || "Activity";
    };

    const getPriorityStyle = (priority) => {
        const styles = {
            High: theme === "dark" ? "bg-yellow-900/40 text-yellow-400" : "bg-yellow-100 text-yellow-700",
            Medium: theme === "dark" ? "bg-orange-900/40 text-orange-400" : "bg-orange-100 text-orange-700",
            Low: theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600",
        };
        return styles[priority] || styles.Medium;
    };

    const typeIcons = {
        Call: Phone,
        Email: Mail,
        Meeting: Calendar,
        "Follow Up": Clock,
    };



    return (
        <div className="">
            <div className="space-y-6">
                {/* Top Row - Contact Info & Lead Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Contact & Lead Information */}
                    <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                Contact Information
                            </h3>
                            <button
                                data-action="edit"
                                onClick={() => setIsEditLeadModalOpen(true)}
                                className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-gray-700 text-gray-400 hover:text-orange-400" : "hover:bg-gray-100 text-gray-600 hover:text-orange-600"}`}
                                title="Edit Lead"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4 grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                    <User className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                </div>
                                <div>
                                    <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Contact Name</p>
                                    <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.contactName || "—"}</p>
                                </div>
                            </div>
                            <div>
                                {lead.company && (
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                            <Building2 className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        </div>
                                        <div>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Company</p>
                                            <p className={`font-medium truncate max-w-xs ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`} title={lead.company}>
                                                {(() => {
                                                    if (!lead.company) return '—';
                                                    const words = lead.company.trim().split(/\s+/);
                                                    if (words.length > 1) {
                                                        return words.slice(0, 2).join(' ') + '...';
                                                    }
                                                    return lead.company;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                    <Phone className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                </div>
                                <div>
                                    <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Phone</p>
                                    <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.phone || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                    <Mail className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                </div>
                                <div className="flex-1">
                                    <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Email</p>
                                    {lead.email ? (
                                        <div className="flex items-center gap-2 group">
                                            <span className={`font-medium truncate max-w-xs ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`} title={lead.email}>
                                                {(() => {
                                                    if (!lead.email) return '';
                                                    // For email, truncate by characters (emails can be long)
                                                    if (lead.email.length > 30) {
                                                        return lead.email.substring(0, 30) + '...';
                                                    }
                                                    return lead.email;
                                                })()}
                                            </span>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await navigator.clipboard.writeText(lead.email);
                                                        setCopiedEmail(true);
                                                        setTimeout(() => setCopiedEmail(false), 2000);
                                                    } catch (err) {
                                                        // Silently handle copy error
                                                    }
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded  ${theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
                                                title="Copy email"
                                            >
                                                {copiedEmail ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>—</p>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Lead Information */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                    Additional Information
                                </h3>
                               
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Lead ID", value: lead.id || "—", icon: FileText },
                                    { label: "Assigned To", value: lead.assignedTo || "—", icon: User, hide: !lead.assignedTo },
                                    { label: "Company Size", value: lead.company_size || lead.companySize || "—", icon: Building2 },
                                    { label: "Industry", value: lead.industry_type || lead.industryType || "—", icon: FileText, pill: true },
                                    { label: "Turnover", value: formatTurnover(lead.turnover), icon: TrendingUp },
                                    { label: "Created Date", value: lead.createdAt || "—", icon: Calendar },
                                ]
                                    .filter((item) => !item.hide)
                                    .map(({ label, value, icon: Icon, pill }) => (
                                        <div
                                            key={label}
                                            className={`flex items-center justify-between p-3   pl-0  rounded-lg`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700 text-gray-200 border border-gray-600" : "bg-white text-gray-700 border border-gray-200"}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
                                                    {pill ? (
                                                        <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${theme === "dark" ? "bg-orange-500/10 text-orange-300 border border-orange-500/30" : "bg-orange-50 text-orange-700 border border-orange-100"}`}>
                                                            {value}
                                                        </span>
                                                    ) : (
                                                        <span className={`text-sm font-medium pt-1 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                                                            {value}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Scoring & Activity */}
                    <div className="space-y-6">
                        {/* Lead Scoring Card */}
                        <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                    Lead Scoring
                                </h3>
                                {onEditScores && (
                                    <button
                                        data-action="edit-scores"
                                        onClick={onEditScores}
                                        className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-gray-700 text-gray-400 hover:text-orange-400" : "hover:bg-gray-100 text-gray-600 hover:text-orange-600"}`}
                                        title="Edit Scores"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                {/* Lead Score */}
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target className={`w-4 h-4 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                                        <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                            Lead Score
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                            {Number(lead?.lead_score) || 0}
                                        </span>
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                                            / 5
                                        </span>
                                    </div>
                                </div>

                                {/* Responsiveness Score */}
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className={`w-4 h-4 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                                        <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                            Responsiveness
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                            {Number(lead?.responsiveness_score) || 0}
                                        </span>
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                                            / 10
                                        </span>
                                    </div>
                                </div>

                                {/* Conversion Probability Score */}
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className={`w-4 h-4 ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`} />
                                        <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                            Conversion Probability
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                            {Number(lead?.conversion_probability_score) || 0}
                                        </span>
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                                            / 10
                                        </span>
                                    </div>
                                </div>

                                {/* Total Score */}
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/50" : "bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className={`w-4 h-4 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                                        <span className={`text-xs font-medium ${theme === "dark" ? "text-orange-300" : "text-orange-700"}`}>
                                            Total Score
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-bold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>
                                            {Number(lead?.lead_score || 0) + Number(lead?.responsiveness_score || 0) + Number(lead?.conversion_probability_score || 0)}
                                        </span>
                                        <span className={`text-xs ${theme === "dark" ? "text-orange-400/70" : "text-orange-600/70"}`}>
                                            / 25
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                    Recent Activity
                                </h3>
                                {setTab && (
                                    <button
                                        onClick={() => setTab("activity")}
                                        className={`text-sm font-medium ${theme === "dark" ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}`}
                                    >
                                        View All
                                    </button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {recentActivities.length > 0 ? (
                                    recentActivities.map((activity) => {
                                        const iconConfig = getActivityIcon(activity.type);
                                        const Icon = iconConfig.icon;
                                        const activityTitle = getActivityTitle(activity);
                                        const activityDesc = activity.comments || activity.activity || "";

                                        return (
                                            <div key={activity.id} className="flex gap-3">
                                                <div className={`p-2 rounded-full h-fit ${iconConfig.bg}`}>
                                                    <Icon className={`w-3 h-3 ${iconConfig.color}`} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                                        <span className="font-medium">{activityTitle}</span>
                                                        {activityDesc && ` - ${activityDesc.length > 50 ? activityDesc.substring(0, 50) + '...' : activityDesc}`}
                                                    </p>
                                                    <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                                        {formatRelativeTime(activity.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className={`text-sm text-center py-4 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                        No recent activity
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


            </div>



            {/* Email Modal */}
            <EmailModal
                open={emailModal.isOpen}
                onClose={() => setEmailModal({ isOpen: false, recipientEmail: "", recipientName: "" })}
                recipientEmail={emailModal.recipientEmail}
                recipientName={emailModal.recipientName}
                leadId={leadId}
            />

            {/* Edit Lead Modal */}
            <EditLeadModal
                open={isEditLeadModalOpen}
                onClose={() => setIsEditLeadModalOpen(false)}
                lead={lead}
                onUpdate={(updatedLead) => {
                    if (onUpdateLead) {
                        onUpdateLead(updatedLead);
                    }
                    setIsEditLeadModalOpen(false);
                }}
            />
        </div>
    );
}