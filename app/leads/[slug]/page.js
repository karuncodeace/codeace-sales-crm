"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { Phone, Mail, MessageSquare, MoreHorizontal, ArrowLeft, MapPin, User, Target, IndianRupee, Flame, Calendar, Clock, CheckCircle2, Circle, FileText, TrendingUp, Building2, Loader2 } from "lucide-react";
import { useTheme } from "../../context/themeContext";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function LeadDetailPage() {
    const router = useRouter();
    const params = useParams();
    const leadId = params.slug;
    
    const { data: lead, error, isLoading } = useSWR(
        leadId ? `/api/leads/${leadId}` : null,
        fetcher
    );
    
    const { theme } = useTheme();
    const [tab, setTab] = useState("overview");

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "activity", label: "Activity" },
        { id: "tasks", label: "Tasks" },
        { id: "notes", label: "Notes" },
        { id: "details", label: "Details" },
    ];

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
            light: "bg-blue-100 text-blue-600",
            dark: "bg-blue-900/40 text-blue-400 ring-1 ring-inset ring-blue-800",
        },
    };

    // Status badge styles
    const statusStyles = {
        New: {
            light: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100",
            dark: "text-blue-100 bg-blue-900/40 ring-1 ring-inset ring-blue-700",
        },
        Contacted: {
            light: "text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-100",
            dark: "text-amber-500 bg-amber-900/40 ring-1 ring-inset ring-amber-700",
        },
        "Follow-Up": {
            light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
            dark: "text-purple-500 bg-purple-900/40 ring-1 ring-inset ring-purple-700",
        },
        Qualified: {
            light: "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100",
            dark: "text-emerald-500 bg-emerald-900/40 ring-1 ring-inset ring-emerald-700",
        },
        Proposal: {
            light: "text-yellow-700 bg-yellow-50 ring-1 ring-inset ring-yellow-100",
            dark: "text-yellow-500 bg-yellow-900/40 ring-1 ring-inset ring-yellow-700",
        },
    };

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

    const priorityStyle = priorityStyles[lead.priority] || priorityStyles.Warm;
    const statusStyle = statusStyles[lead.status] || statusStyles.New;

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
                    <span className={`text-3xl font-bold ml-3 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{lead.id}</span>
                   </div>
                    <div className={`flex items-center gap-3 mt-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${theme === "dark" ? priorityStyle.dark : priorityStyle.light}`}>
                            {lead.priority}
                        </span>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${theme === "dark" ? statusStyle.dark : statusStyle.light}`}>
                            {lead.status}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow transition-colors font-medium">
                        Edit
                    </button>

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

            {/* TAB CONTENT */}
            {tab === "overview" && (
                <div className="space-y-6">
                    {/* Top Row - Contact Info & Lead Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Contact & Lead Information */}
                        <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                            <h3 className={`text-lg font-semibold mb-5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                Contact Information
                            </h3>
                            <div className="space-y-4">
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
                                    <div>
                                        <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Email</p>
                                        <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.email || "—"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                        <User className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                    </div>
                                    <div>
                                        <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Contact Name</p>
                                        <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.contactName || "—"}</p>
                                    </div>
                                </div>
                                {lead.location && (
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                            <MapPin className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        </div>
                                        <div>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Location</p>
                                            <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.location}</p>
                                        </div>
                                    </div>
                                )}
                                {lead.company && (
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                            <Building2 className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        </div>
                                        <div>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Company</p>
                                            <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.company}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Lead Information */}
                            <div className="mt-8">
                                <h3 className={`text-lg font-semibold mb-5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                    Lead Information
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Lead Source</span>
                                        <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.source || "—"}</span>
                                    </div>
                                    {lead.assignedTo && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Assigned To</span>
                                            <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.assignedTo}</span>
                                        </div>
                                    )}
                                    {lead.campaign && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Campaign</span>
                                            <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.campaign}</span>
                                        </div>
                                    )}
                                    {lead.budget && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Budget</span>
                                            <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.budget}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Priority</span>
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${theme === "dark" ? priorityStyle.dark : priorityStyle.light}`}>
                                            {lead.priority}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Tasks & Activity */}
                        <div className="space-y-6">
                            {/* Upcoming Tasks */}
                            <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                        Upcoming Tasks
                                    </h3>
                                    <button 
                                        onClick={() => setTab("tasks")}
                                        className={`text-sm font-medium ${theme === "dark" ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}`}
                                    >
                                        View All
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div className={`flex items-start gap-3 p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                        <Circle className={`w-4 h-4 mt-0.5 ${theme === "dark" ? "text-orange-400" : "text-orange-500"}`} />
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Follow up call</p>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Today, 3:00 PM</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${theme === "dark" ? "bg-yellow-900/40 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>High</span>
                                    </div>
                                    <div className={`flex items-start gap-3 p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                        <Circle className={`w-4 h-4 mt-0.5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Send proposal document</p>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Tomorrow, 10:00 AM</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${theme === "dark" ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-700"}`}>Medium</span>
                                    </div>
                                    <div className={`flex items-start gap-3 p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 ${theme === "dark" ? "text-green-400" : "text-green-500"}`} />
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium line-through ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Initial discovery call</p>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`}>Completed yesterday</p>
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
                                    <button 
                                        onClick={() => setTab("activity")}
                                        className={`text-sm font-medium ${theme === "dark" ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}`}
                                    >
                                        View All
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className={`p-2 rounded-full h-fit ${theme === "dark" ? "bg-blue-900/40" : "bg-blue-100"}`}>
                                            <Phone className={`w-3 h-3 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                                        </div>
                                        <div>
                                            <p className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                                <span className="font-medium">Phone call</span> with John - 15 mins
                                            </p>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>2 hours ago</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className={`p-2 rounded-full h-fit ${theme === "dark" ? "bg-green-900/40" : "bg-green-100"}`}>
                                            <Mail className={`w-3 h-3 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                                        </div>
                                        <div>
                                            <p className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                                <span className="font-medium">Email sent</span> - Product pricing details
                                            </p>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Yesterday, 4:30 PM</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className={`p-2 rounded-full h-fit ${theme === "dark" ? "bg-purple-900/40" : "bg-purple-100"}`}>
                                            <FileText className={`w-3 h-3 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                                        </div>
                                        <div>
                                            <p className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                                <span className="font-medium">Note added</span> - Client requirements
                                            </p>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Nov 25, 2025</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className={`p-2 rounded-full h-fit ${theme === "dark" ? "bg-orange-900/40" : "bg-orange-100"}`}>
                                            <TrendingUp className={`w-3 h-3 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                                        </div>
                                        <div>
                                            <p className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                                <span className="font-medium">Lead status</span> changed to Hot
                                            </p>
                                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Nov 24, 2025</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row - Key Dates & Notes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Key Dates */}
                        <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                            <h3 className={`text-lg font-semibold mb-5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                Key Dates
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Created</span>
                                    </div>
                                    <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.createdAt || "—"}</p>
                                </div>
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Last Activity</span>
                                    </div>
                                    <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.lastActivity || "—"}</p>
                                </div>
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Status</span>
                                    </div>
                                    <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>{lead.status}</p>
                                </div>
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Lead ID</span>
                                    </div>
                                    <p className={`font-medium ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>{lead.id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Latest Note */}
                        <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                    Latest Note
                                </h3>
                                <button 
                                    onClick={() => setTab("notes")}
                                    className={`text-sm font-medium ${theme === "dark" ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}`}
                                >
                                    Add Note
                                </button>
                            </div>
                            <div className={`p-4 rounded-lg ${theme === "dark" ? "" : "bg-gray-50"}`}>
                                <li>
                                <ul>
                                <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                    Client is interested in our enterprise plan. They need integration with their existing Salesforce CRM. 
                                    Budget approved by their finance team. Decision maker is the CTO - schedule a demo call next week.
                                </p>
                                <div className={`flex items-center gap-2 mt-3 pt-3 border-t ${theme === "dark" ? "border-gray-600" : "border-gray-200"}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${theme === "dark" ? "bg-orange-900/40 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                                        AK
                                    </div>
                                    <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Arun Kumar • Nov 25, 2025</span>
                                </div>
                                </ul>
                                </li>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}