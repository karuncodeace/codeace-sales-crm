"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { Phone, Mail, MessageSquare, MoreHorizontal, ArrowLeft, MapPin, User, Target, IndianRupee, Flame, Calendar, Clock, CheckCircle2, Circle, FileText, TrendingUp, Building2, Loader2 } from "lucide-react";
import { useTheme } from "../../context/themeContext";

const fetcher = (url) => fetch(url).then((res) => res.json());

// Activity Tab Component
function ActivityTab({ theme, leadId }) {
    const [filter, setFilter] = useState("all");
    const [newActivity, setNewActivity] = useState("");
    const [activityType, setActivityType] = useState("call");
    const [activityDueDate, setActivityDueDate] = useState("");
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Fetch activities from API
    const { data: rawActivities, error: fetchError, isLoading, mutate } = useSWR(
        leadId ? `/api/task-activities?lead_id=${leadId}` : null,
        fetcher
    );

    // Format timestamp for display
    const formatTimestamp = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        } else if (diffDays === 1) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    // Get initials from source
    const getInitials = (source) => {
        if (!source) return "SY";
        if (source === "user") return "US";
        if (source === "system") return "SY";
        return source.slice(0, 2).toUpperCase();
    };

    // Get display name from source
    const getDisplayName = (source) => {
        if (!source) return "System";
        if (source === "user") return "User";
        if (source === "system") return "System";
        return source;
    };

    // Map activity type to title
    const getActivityTitle = (type) => {
        const titles = {
            call: "Phone Call",
            email: "Email",
            meeting: "Meeting",
            note: "Note Added",
            status: "Status Change",
            task: "Task Update",
        };
        return titles[type] || "Activity";
    };

    // Transform raw activities to display format
    // Handle both array response and object with activities property
    const activitiesArray = Array.isArray(rawActivities) ? rawActivities : (rawActivities?.activities || []);
    
    // Get contacted through display info
    const getContactedThroughInfo = (method) => {
        const methods = {
            call: { label: "Call", icon: "", color: "blue" },
            email: { label: "Email", icon: "", color: "green" },
            meeting: { label: "Meeting", icon: "", color: "purple" },
            whatsapp: { label: "WhatsApp", icon: "", color: "emerald" },
        };
        return methods[method?.toLowerCase()] || null;
    };

    const activities = activitiesArray.map(act => ({
        id: act.id,
        type: act.type || "note",
        title: act.activity || getActivityTitle(act.type || "note"),
        description: act.comments || "",
        user: getDisplayName(act.source),
        userInitials: getInitials(act.source),
        timestamp: formatTimestamp(act.created_at),
        rawDate: act.created_at,
        contactedThrough: act.connect_through,
        contactedThroughInfo: getContactedThroughInfo(act.connect_through),
        dueDate: act.due_date,
    }));

    const filterOptions = [
        { id: "all", label: "All Activities", icon: null },
        { id: "call", label: "Calls", icon: Phone, color: "blue" },
        { id: "email", label: "Emails", icon: Mail, color: "green" },
        { id: "meeting", label: "Meetings", icon: Calendar, color: "purple" },
        { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "emerald" },
    ];

    const filteredActivities = filter === "all" 
        ? activities 
        : activities.filter(a => a.contactedThrough?.toLowerCase() === filter);

    // Handle adding new activity
    const handleAddActivity = async () => {
        if (!newActivity.trim()) return;
        
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/task-activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    activity: getActivityTitle(activityType),
                    type: activityType,
                    comments: newActivity,
                    connect_through: activityType,
                    due_date: activityDueDate || null,
                }),
            });
            
            if (response.ok) {
                setNewActivity("");
                setActivityDueDate("");
                setActivityType("call");
                setShowAddForm(false);
                mutate(); // Refresh the activities list
            }
        } catch (error) {
            console.error("Error adding activity:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getActivityIcon = (type) => {
        const iconConfig = {
            call: { icon: Phone, bg: "bg-blue-100 dark:bg-blue-900/40", color: "text-blue-600 dark:text-blue-400" },
            email: { icon: Mail, bg: "bg-green-100 dark:bg-green-900/40", color: "text-green-600 dark:text-green-400" },
            meeting: { icon: Calendar, bg: "bg-purple-100 dark:bg-purple-900/40", color: "text-purple-600 dark:text-purple-400" },
            note: { icon: FileText, bg: "bg-amber-100 dark:bg-amber-900/40", color: "text-amber-600 dark:text-amber-400" },
            status: { icon: TrendingUp, bg: "bg-orange-100 dark:bg-orange-900/40", color: "text-orange-600 dark:text-orange-400" },
            task: { icon: CheckCircle2, bg: "bg-emerald-100 dark:bg-emerald-900/40", color: "text-emerald-600 dark:text-emerald-400" },
        };
        return iconConfig[type] || iconConfig.note;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className={`w-8 h-8 animate-spin ${theme === "dark" ? "text-orange-400" : "text-orange-500"}`} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Add Activity Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        Activity Timeline
                    </h2>
                    <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        Track all interactions and updates for this lead
                    </p>
                </div>
                <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all duration-200 font-medium text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Log Activity
                </button>
            </div>

            {/* Add Activity Form */}
            {showAddForm && (
                <div className={`p-5 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        Log New Activity
                    </h3>
                    
                    {/* Activity Type Selection */}
                    <div className="mb-4">
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                            Activity Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: "call", label: "Call", icon: Phone },
                                { id: "email", label: "Email", icon: Mail },
                                { id: "meeting", label: "Meeting", icon: Calendar },
                                { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
                            ].map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button 
                                        key={type.id}
                                        onClick={() => setActivityType(type.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                            ${activityType === type.id
                                                ? "bg-orange-500 text-white"
                                                : theme === "dark"
                                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {type.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="mb-4">
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                            Due Date
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowDueDatePicker(!showDueDatePicker)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                                    activityDueDate
                                        ? "border-orange-500 bg-orange-500/5"
                                        : theme === "dark"
                                            ? "border-gray-600 hover:border-gray-500"
                                            : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${activityDueDate ? "bg-orange-500/20 text-orange-500" : theme === "dark" ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <span className={`text-sm ${activityDueDate ? (theme === "dark" ? "text-gray-200" : "text-gray-900") : (theme === "dark" ? "text-gray-500" : "text-gray-400")}`}>
                                        {activityDueDate 
                                            ? new Date(activityDueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                            : "Select a due date (optional)"
                                        }
                                    </span>
                                </div>
                                <svg className={`w-4 h-4 transition-transform ${showDueDatePicker ? "rotate-180" : ""} ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Date Picker Dropdown */}
                            {showDueDatePicker && (
                                <div className={`absolute z-50 mt-2 w-full p-4 rounded-xl shadow-2xl border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                    {/* Quick Select */}
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                        Quick Select
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {[
                                            { label: "Today", days: 0 },
                                            { label: "Tomorrow", days: 1 },
                                            { label: "In 3 days", days: 3 },
                                            { label: "In a week", days: 7 },
                                        ].map((option) => {
                                            const date = new Date();
                                            date.setDate(date.getDate() + option.days);
                                            const dateStr = date.toISOString().split('T')[0];
                                            const isSelected = activityDueDate === dateStr;
                                            return (
                                                <button
                                                    key={option.label}
                                                    type="button"
                                                    onClick={() => { setActivityDueDate(dateStr); setShowDueDatePicker(false); }}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                                        isSelected
                                                            ? "bg-orange-500 text-white"
                                                            : theme === "dark"
                                                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Custom Date */}
                                    <div className={`p-3 rounded-lg border border-dashed ${theme === "dark" ? "border-gray-600 bg-gray-700/30" : "border-gray-200 bg-gray-50"}`}>
                                        <p className={`text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                            Custom Date
                                        </p>
                                        <input
                                            type="date"
                                            value={activityDueDate}
                                            onChange={(e) => { setActivityDueDate(e.target.value); setShowDueDatePicker(false); }}
                                            className={`w-full p-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                                                theme === "dark"
                                                    ? "bg-gray-700 border-gray-600 text-gray-200"
                                                    : "bg-white border-gray-200 text-gray-900"
                                            }`}
                                        />
                                    </div>
                                    
                                    {/* Clear */}
                                    {activityDueDate && (
                                        <button
                                            type="button"
                                            onClick={() => setActivityDueDate("")}
                                            className={`mt-3 w-full py-2 text-xs font-medium rounded-lg transition-colors ${
                                                theme === "dark"
                                                    ? "text-red-400 hover:bg-red-500/10"
                                                    : "text-red-500 hover:bg-red-50"
                                            }`}
                                        >
                                            Clear date
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activity Description */}
                    <div className="mb-4">
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                            Description
                        </label>
                        <textarea
                            value={newActivity}
                            onChange={(e) => setNewActivity(e.target.value)}
                            placeholder="Add details about this activity..."
                            rows={3}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors resize-none
                                ${theme === "dark"
                                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500"
                                } focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewActivity("");
                                setActivityDueDate("");
                                setActivityType("call");
                                setShowDueDatePicker(false);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                ${theme === "dark"
                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddActivity}
                            disabled={isSubmitting || !newActivity.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSubmitting ? "Saving..." : "Save Activity"}
                        </button>
                    </div>
                </div>
            )}

            {/* Filter Pills */}
            <div className={`flex flex-wrap gap-2 p-4 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                {filterOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = filter === option.id;
                    const count = option.id === "all" ? activities.length : activities.filter(a => a.contactedThrough?.toLowerCase() === option.id).length;
                    return (
                        <button
                            key={option.id}
                            onClick={() => setFilter(option.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                ${isActive 
                                    ? "bg-orange-500 text-white shadow-sm" 
                                    : theme === "dark"
                                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {Icon && <Icon className="w-4 h-4" />}
                            {option.label}
                            <span className={`px-1.5 py-0.5 rounded text-xs ${isActive ? "bg-white/20" : theme === "dark" ? "bg-gray-600" : "bg-gray-200"}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Activity Timeline */}
            <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                <div className="relative">
                    {/* Timeline Line */}
                    <div className={`absolute left-6 top-0 bottom-0 w-0.5 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />

                    {/* Activity Items */}
                    <div className="space-y-6">
                        {filteredActivities.map((activity, index) => {
                            const iconConfig = getActivityIcon(activity.type);
                            const IconComponent = iconConfig.icon;
                            
                            return (
                                <div key={activity.id} className="relative flex gap-4 group">
                                    {/* Icon */}
                                    <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${theme === "dark" ? iconConfig.bg.replace("dark:", "") : iconConfig.bg.split(" ")[0]} ring-4 ${theme === "dark" ? "ring-gray-800" : "ring-white"}`}>
                                        <IconComponent className={`w-5 h-5 ${theme === "dark" ? iconConfig.color.split(" ")[1] : iconConfig.color.split(" ")[0]}`} />
                                    </div>

                                    {/* Content Card */}
                                    <div className={`flex-1 p-4 rounded-xl transition-all duration-200 group-hover:shadow-md ${theme === "dark" ? "bg-gray-700/50 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100"}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                                    {activity.title}
                                                </h4>
                                                {activity.outcome && (
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                        activity.outcome === "Positive" 
                                                            ? theme === "dark" ? "bg-green-900/40 text-green-400" : "bg-green-100 text-green-700"
                                                            : theme === "dark" ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-700"
                                                    }`}>
                                                        {activity.outcome}
                                                    </span>
                                                )}
                                                {activity.direction === "inbound" && (
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${theme === "dark" ? "bg-cyan-900/40 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}>
                                                        Inbound
                                                    </span>
                                                )}
                                            </div>
                                            <button className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-200"}`}>
                                                <MoreHorizontal className={`w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                                            </button>
                                        </div>

                                        <p className={`text-sm leading-relaxed mb-3 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                            {activity.description}
                                        </p>

                                        {/* Contacted Through & Due Date Pills */}
                                        {(activity.contactedThroughInfo || activity.dueDate) && (
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                {activity.contactedThroughInfo && (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        activity.contactedThroughInfo.color === "blue"
                                                            ? theme === "dark" ? "bg-blue-900/40 text-blue-400 ring-1 ring-blue-700" : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                                            : activity.contactedThroughInfo.color === "green"
                                                            ? theme === "dark" ? "bg-green-900/40 text-green-400 ring-1 ring-green-700" : "bg-green-50 text-green-700 ring-1 ring-green-200"
                                                            : activity.contactedThroughInfo.color === "purple"
                                                            ? theme === "dark" ? "bg-purple-900/40 text-purple-400 ring-1 ring-purple-700" : "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                                                            : theme === "dark" ? "bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-700" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                    }`}>
                                                        
                                                        {activity.contactedThroughInfo.label}
                                                    </span>
                                                )}
                                                {activity.dueDate && (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        theme === "dark" ? "bg-orange-900/40 text-orange-400 ring-1 ring-orange-700" : "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
                                                    }`}>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Due: {new Date(activity.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Meta Information */}
                                        <div className={`flex flex-wrap items-center gap-4 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${theme === "dark" ? "bg-orange-900/40 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                                                    {activity.userInitials}
                                                </div>
                                                <span>{activity.user}</span>
                                            </div>
                                            <span>•</span>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {activity.timestamp}
                                            </div>
                                            {activity.duration && (
                                                <>
                                                    <span>•</span>
                                                    <span>{activity.duration}</span>
                                                </>
                                            )}
                                            {activity.attendees && (
                                                <>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {activity.attendees} attendees
                                                    </div>
                                                </>
                                            )}
                                            {activity.attachments && (
                                                <>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1">
                                                        <FileText className="w-3 h-3" />
                                                        {activity.attachments} attachments
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Empty State */}
                {filteredActivities.length === 0 && (
                    <div className="text-center py-12">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                            <MessageSquare className={`w-8 h-8 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                        </div>
                        <h3 className={`text-lg font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                            No activities found
                        </h3>
                        <p className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                            There are no {filter !== "all" ? filter : ""} activities recorded yet.
                        </p>
                    </div>
                )}

                {/* Load More */}
                {filteredActivities.length > 0 && (
                    <div className="mt-6 text-center">
                        <button className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${theme === "dark" ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                            Load More Activities
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Tasks Tab Component
function TasksTab({ theme, leadId, leadName }) {
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskType, setNewTaskType] = useState("Call");
    const [newTaskPriority, setNewTaskPriority] = useState("Medium");
    const [newTaskDueDate, setNewTaskDueDate] = useState("");
    const [newTaskComments, setNewTaskComments] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch tasks for this lead
    const { data: tasks, error, isLoading, mutate } = useSWR(
        leadId ? `/api/tasks?lead_id=${leadId}` : null,
        (url) => fetch(url).then(res => res.json())
    );

    const priorityStyles = {
        High: { light: "bg-red-50 text-red-700 ring-1 ring-red-200", dark: "bg-red-900/40 text-red-400 ring-1 ring-red-700" },
        Medium: { light: "bg-orange-50 text-orange-700 ring-1 ring-orange-200", dark: "bg-orange-900/40 text-orange-400 ring-1 ring-orange-700" },
        Low: { light: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", dark: "bg-blue-900/40 text-blue-400 ring-1 ring-blue-700" },
    };

    const statusStyles = {
        Pending: { light: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dark: "bg-amber-900/40 text-amber-400 ring-1 ring-amber-700" },
        "In Progress": { light: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", dark: "bg-blue-900/40 text-blue-400 ring-1 ring-blue-700" },
        Completed: { light: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dark: "bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-700" },
    };

    const typeIcons = {
        Call: Phone,
        Email: Mail,
        Meeting: Calendar,
        "Follow Up": Clock,
    };

    // Format due date display
    const formatDueDate = (dateStr) => {
        if (!dateStr) return "No due date";
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (dateOnly.getTime() === today.getTime()) return "Today";
        if (dateOnly.getTime() === tomorrow.getTime()) return "Tomorrow";
        if (dateOnly < today) return "Overdue";
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const getDueStatus = (dateStr) => {
        if (!dateStr) return "upcoming";
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (dateOnly < today) return "overdue";
        if (dateOnly.getTime() === today.getTime()) return "today";
        return "upcoming";
    };

    const dueStyles = {
        overdue: { light: "bg-red-50 text-red-700", dark: "bg-red-900/40 text-red-400" },
        today: { light: "bg-blue-50 text-blue-700", dark: "bg-blue-900/40 text-blue-400" },
        upcoming: { light: "bg-emerald-50 text-emerald-700", dark: "bg-emerald-900/40 text-emerald-400" },
    };

    // Handle add task
    const handleAddTask = async () => {
        if (!newTaskType) return;
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    type: newTaskType,
                    priority: newTaskPriority,
                    due_datetime: newTaskDueDate || null,
                    comments: newTaskComments,
                }),
            });
            if (response.ok) {
                setNewTaskType("Call");
                setNewTaskPriority("Medium");
                setNewTaskDueDate("");
                setNewTaskComments("");
                setShowAddTask(false);
                mutate();
            }
        } catch (error) {
            console.error("Error adding task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle mark as complete
    const handleToggleComplete = async (taskId, currentStatus) => {
        const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
        try {
            await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId, status: newStatus }),
            });
            mutate();
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className={`w-8 h-8 animate-spin ${theme === "dark" ? "text-orange-400" : "text-orange-500"}`} />
            </div>
        );
    }

    const tasksList = Array.isArray(tasks) ? tasks : [];
    const pendingTasks = tasksList.filter(t => t.status !== "Completed");
    const completedTasks = tasksList.filter(t => t.status === "Completed");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        Tasks
                    </h2>
                    <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {pendingTasks.length} pending, {completedTasks.length} completed
                    </p>
                </div>
                <button 
                    onClick={() => setShowAddTask(!showAddTask)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all duration-200 font-medium text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Task
                </button>
            </div>

            {/* Add Task Form */}
            {showAddTask && (
                <div className={`p-5 rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        Add New Task
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Task Type */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                Task Type
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {["Call", "Email", "Meeting", "Follow Up"].map((type) => {
                                    const Icon = typeIcons[type];
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => setNewTaskType(type)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                newTaskType === type
                                                    ? "bg-orange-500 text-white"
                                                    : theme === "dark"
                                                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {type}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                Priority
                            </label>
                            <div className="flex gap-2">
                                {["High", "Medium", "Low"].map((priority) => (
                                    <button
                                        key={priority}
                                        onClick={() => setNewTaskPriority(priority)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            newTaskPriority === priority
                                                ? priority === "High" 
                                                    ? "bg-red-500 text-white"
                                                    : priority === "Medium"
                                                        ? "bg-orange-500 text-white"
                                                        : "bg-blue-500 text-white"
                                                : theme === "dark"
                                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        {priority}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="mb-4">
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                            Due Date
                        </label>
                        <input
                            type="datetime-local"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className={`w-full md:w-auto px-4 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                                theme === "dark"
                                    ? "bg-gray-700 border-gray-600 text-gray-200"
                                    : "bg-white border-gray-200 text-gray-900"
                            }`}
                        />
                    </div>

                    {/* Comments */}
                    <div className="mb-4">
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                            Notes (Optional)
                        </label>
                        <textarea
                            value={newTaskComments}
                            onChange={(e) => setNewTaskComments(e.target.value)}
                            placeholder="Add any notes about this task..."
                            rows={2}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                                theme === "dark"
                                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                            }`}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setShowAddTask(false);
                                setNewTaskType("Call");
                                setNewTaskPriority("Medium");
                                setNewTaskDueDate("");
                                setNewTaskComments("");
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                theme === "dark"
                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddTask}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSubmitting ? "Adding..." : "Add Task"}
                        </button>
                    </div>
                </div>
            )}

            {/* Tasks List */}
            <div className={`rounded-xl ${theme === "dark" ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                {/* Pending Tasks */}
                {pendingTasks.length > 0 && (
                    <div className="p-4">
                        <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                            Pending Tasks ({pendingTasks.length})
                        </h3>
                        <div className="space-y-3">
                            {pendingTasks.map((task) => {
                                const Icon = typeIcons[task.type] || Phone;
                                const dueStatus = getDueStatus(task.due_datetime);
                                return (
                                    <div 
                                        key={task.id}
                                        className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                                            theme === "dark" ? "bg-gray-700/50 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100"
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => handleToggleComplete(task.id, task.status)}
                                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                theme === "dark" 
                                                    ? "border-gray-500 hover:border-orange-500 hover:bg-orange-500/20" 
                                                    : "border-gray-300 hover:border-orange-500 hover:bg-orange-50"
                                            }`}
                                        >
                                            <CheckCircle2 className={`w-4 h-4 ${theme === "dark" ? "text-gray-600" : "text-gray-300"}`} />
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                                        {task.title || `${task.type} - ${leadName}`}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                            priorityStyles[task.priority]?.[theme === "dark" ? "dark" : "light"] || priorityStyles.Medium.light
                                                        }`}>
                                                            {task.priority}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                            theme === "dark" ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-600"
                                                        }`}>
                                                            <Icon className="w-3 h-3" />
                                                            {task.type}
                                                        </span>
                                                        {task.due_datetime && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                                dueStyles[dueStatus]?.[theme === "dark" ? "dark" : "light"]
                                                            }`}>
                                                                <Clock className="w-3 h-3" />
                                                                {formatDueDate(task.due_datetime)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {task.comments && (
                                                        <p className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                                            {task.comments}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Divider */}
                {pendingTasks.length > 0 && completedTasks.length > 0 && (
                    <div className={`border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`} />
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                    <div className="p-4">
                        <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                            Completed ({completedTasks.length})
                        </h3>
                        <div className="space-y-3">
                            {completedTasks.map((task) => {
                                const Icon = typeIcons[task.type] || Phone;
                                return (
                                    <div 
                                        key={task.id}
                                        className={`flex items-start gap-4 p-4 rounded-xl transition-all opacity-60 ${
                                            theme === "dark" ? "bg-gray-700/30" : "bg-gray-50"
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => handleToggleComplete(task.id, task.status)}
                                            className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-white" />
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-medium line-through ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                                {task.title || `${task.type} - ${leadName}`}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center gap-1 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                                    <Icon className="w-3 h-3" />
                                                    {task.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {tasksList.length === 0 && (
                    <div className="text-center py-12">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                            <CheckCircle2 className={`w-8 h-8 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                        </div>
                        <h3 className={`text-lg font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                            No tasks yet
                        </h3>
                        <p className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                            Create a task to track follow-ups for this lead.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

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
            {/* TAB CONTENT */}
            {/* ACTIVITY TAB */}
            {tab === "activity" && (
                <ActivityTab theme={theme} leadId={leadId} />
            )}

            {/* TASKS TAB */}
            {tab === "tasks" && (
                <TasksTab theme={theme} leadId={leadId} leadName={lead.name} />
            )}

        </div>
    );
}