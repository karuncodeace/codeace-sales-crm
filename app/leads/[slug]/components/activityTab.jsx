"use client";

import { useState } from "react";
import useSWR from "swr";
import { Phone, Mail, MessageSquare, MoreHorizontal, Calendar, Clock, CheckCircle2, FileText, TrendingUp, User, Loader2 } from "lucide-react";
import { useTheme } from "../../../context/themeContext";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ActivityTab({ leadId }) {
    const { theme } = useTheme();
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

    // Format timestamp for display (using Asia/Calcutta timezone)
    const formatTimestamp = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        const now = new Date();
        
        // Calculate difference in days (UTC comparison is fine for day difference)
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Format time in Asia/Calcutta timezone
        const timeOptions = {
            timeZone: 'Asia/Calcutta',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        
        if (diffDays === 0) {
            return `Today, ${date.toLocaleTimeString('en-IN', timeOptions)}`;
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

    // Format date to Asia/Calcutta timezone
    const formatToCalcuttaTime = (dateString) => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            // Convert to Asia/Calcutta timezone with readable format
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
            console.error('Error formatting date:', error);
            return dateString;
        }
    };

    const activities = activitiesArray
        .map(act => ({
            id: act.id,
            type: act.type || "note",
            title: act.activity || getActivityTitle(act.type || "note"),
            description: act.comments || "",
            user: getDisplayName(act.source),
            userInitials: getInitials(act.source),
            timestamp: formatTimestamp(act.created_at),
            rawDate: formatToCalcuttaTime(act.created_at),
            contactedThrough: act.connect_through,
            contactedThroughInfo: getContactedThroughInfo(act.connect_through),
            dueDate: act.due_date,
            createdAt: act.created_at, // Keep original for sorting
        }))
        .sort((a, b) => {
            // Sort by most recent first (descending order)
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
        });

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
                                                        <Calendar className="w-3 h-3" />
                                                        Due: {new Date(activity.dueDate).toLocaleDateString('en-IN', { 
                                                            timeZone: 'Asia/Calcutta',
                                                            month: 'short', 
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
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
                                                {activity.rawDate}
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

