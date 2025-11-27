"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, MessageSquare, MoreHorizontal, ArrowLeft, MapPin, User, Target, IndianRupee, Flame, Calendar, Clock, CheckCircle2, Circle, FileText, TrendingUp, Building2 } from "lucide-react";
import { useTheme } from "../../context/themeContext";

export default function LeadDetailPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const [tab, setTab] = useState("overview");

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "activity", label: "Activity" },
        { id: "tasks", label: "Tasks" },
        { id: "notes", label: "Notes" },
        { id: "details", label: "Details" },
    ];

    return (
        <div className="p-6 space-y-6">
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
                    Guideline Labs  
                    </h1>
                    <span className={`text-3xl font-bold ml-3 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>LD-1203</span>
                   </div>
                    <div className={`flex items-center gap-3 mt-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${theme === "dark"
                                ? "bg-red-900/40 text-red-400 ring-1 ring-inset ring-red-800"
                                : "bg-red-100 text-red-600"
                            }`}>
                            Hot
                        </span>
                        <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full
    ${theme === "dark"
                                    ? "text-blue-100 bg-blue-900/40 ring-1 ring-inset ring-blue-700"
                                    : "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100"
                                }`}
                        >
                            New
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
                                        <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>9876543210</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                        <Mail className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                    </div>
                                    <div>
                                        <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Email</p>
                                        <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>john@example.com</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                        <MapPin className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                    </div>
                                    <div>
                                        <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Location</p>
                                        <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Chennai</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                                        <Building2 className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                    </div>
                                    <div>
                                        <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Company</p>
                                        <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Guideline Labs Pvt Ltd</p>
                                    </div>
                                </div>
                            </div>

                           

                            {/* Lead Information */}
                            <div className="mt-8">
                                <h3 className={`text-lg font-semibold mb-5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                    Lead Information
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Lead Source</span>
                                        <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Meta Ads</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Assigned To</span>
                                        <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Arun Kumar</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Campaign</span>
                                        <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Winter Sales Campaign</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Budget</span>
                                        <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>₹1,50,000</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Lead Score</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${theme === "dark" ? "bg-red-900/40 text-red-400 ring-1 ring-inset ring-red-800" : "bg-red-100 text-red-600"}`}>
                                                Hot
                                            </span>
                                            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>(92%)</span>
                                        </div>
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
                                    <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Nov 20, 2025</p>
                                </div>
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Last Contact</span>
                                    </div>
                                    <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Nov 26, 2025</p>
                                </div>
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Expected Close</span>
                                    </div>
                                    <p className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Dec 15, 2025</p>
                                </div>
                                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Next Follow-up</span>
                                    </div>
                                    <p className={`font-medium ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>Today</p>
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
                            <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
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
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}