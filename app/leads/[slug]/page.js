"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { Phone, Mail, MessageSquare, MoreHorizontal, ArrowLeft, MapPin, User, Target, IndianRupee, Flame, Calendar, Clock, CheckCircle2, Circle, FileText, TrendingUp, Building2, Loader2, Copy, Check, Plus, Edit2, Trash2, StickyNote } from "lucide-react";
import { useTheme } from "../../context/themeContext";
import EmailModal from "../../components/ui/email-modal";
import OverveiwTab from "./components/overveiwTab";
import ActivityTab from "./components/activityTab";
import BookMeetingButton from "../../components/buttons/bookMeetingbtn";
const fetcher = (url) => fetch(url).then((res) => res.json());

// Notes Tab Component
function NotesTab({ theme, leadId, leadName }) {
    const [showAddNote, setShowAddNote] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteText, setEditNoteText] = useState("");
    const [deletingNoteId, setDeletingNoteId] = useState(null);

    // Fetch notes from API (filter activities by type "note")
    const { data: activitiesData, error, isLoading, mutate } = useSWR(
        leadId ? `/api/task-activities?lead_id=${leadId}` : null,
        fetcher
    );

    // Format timestamp for display (using Asia/Calcutta timezone)
    const formatNoteDate = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        const options = {
            timeZone: 'Asia/Calcutta',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleString('en-IN', options);
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

    // Note background colors
    const noteColors = [
        "bg-yellow-100",
        "bg-pink-100",
        "bg-green-100",
        "bg-blue-100",
        "bg-orange-100",
        "bg-purple-100",
    ];

    const noteColorsDark = [
        "bg-yellow-900/20",
        "bg-pink-900/20",
        "bg-green-900/20",
        "bg-blue-900/20",
        "bg-orange-900/20",
        "bg-purple-900/20",
    ];

    // Get color for a note based on its ID (consistent color per note)
    const getNoteColor = (noteId) => {
        const index = parseInt(noteId) % noteColors.length;
        return {
            light: noteColors[index],
            dark: noteColorsDark[index],
        };
    };

    // Filter notes from activities
    const activitiesList = Array.isArray(activitiesData) ? activitiesData : [];
    const notes = activitiesList
        .filter(act => act.type === "note")
        .map(act => ({
            id: act.id,
            content: act.comments || act.activity || "",
            user: getDisplayName(act.source),
            userInitials: getInitials(act.source),
            createdAt: act.created_at,
            formattedDate: formatNoteDate(act.created_at),
            relativeTime: formatRelativeTime(act.created_at),
            color: getNoteColor(act.id),
        }))
        .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime(); // Most recent first
        });

    // Handle add note
    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/task-activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    activity: "Note Added",
                    type: "note",
                    comments: newNote.trim(),
                    connect_through: "note",
                }),
            });
            
            if (response.ok) {
                setNewNote("");
                setShowAddNote(false);
                mutate(); // Refresh the notes list
            }
        } catch (error) {
            console.error("Error adding note:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle edit note
    const handleEditNote = async (noteId) => {
        if (!editNoteText.trim()) return;
        
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/task-activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    activity: "Note Updated",
                    type: "note",
                    comments: editNoteText.trim(),
                    connect_through: "note",
                }),
            });
            
            if (response.ok) {
                setEditingNoteId(null);
                setEditNoteText("");
                mutate();
            }
        } catch (error) {
            console.error("Error updating note:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete note
    const handleDeleteNote = async (noteId) => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        
        setDeletingNoteId(noteId);
        try {
            alert("Delete functionality needs to be implemented in the API");
        } catch (error) {
            console.error("Error deleting note:", error);
        } finally {
            setDeletingNoteId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className={`w-8 h-8 animate-spin ${theme === "dark" ? "text-orange-400" : "text-orange-500"}`} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        Notes
                    </h2>
                    <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {notes.length} {notes.length === 1 ? 'note' : 'notes'} for {leadName}
                    </p>
                </div>
               
                <button 
                    onClick={() => setShowAddNote(!showAddNote)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Note
                </button>
            </div>

            {/* Floating Add Note Form */}
            {showAddNote && (
                <div className={`relative p-6 rounded-2xl shadow-2xl border-2 ${
                    theme === "dark" 
                        ? "bg-gradient-to-br from-gray-800 to-gray-900 border-orange-500/30" 
                        : "bg-gradient-to-br from-white to-gray-50 border-orange-200"
                }`}>
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={() => {
                                setShowAddNote(false);
                                setNewNote("");
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                                theme === "dark" 
                                    ? "hover:bg-gray-700 text-gray-400" 
                                    : "hover:bg-gray-100 text-gray-500"
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-100"}`}>
                            <StickyNote className={`w-6 h-6 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                        </div>
                        <h3 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            Create New Note
                        </h3>
                    </div>
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="What's on your mind? Write your note here..."
                        rows={8}
                        className={`w-full px-4 py-4 rounded-xl border-2 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${
                            theme === "dark"
                                ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                                : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                        }`}
                    />
                    <div className="flex justify-end gap-3 mt-5">
                        <button
                            onClick={() => {
                                setShowAddNote(false);
                                setNewNote("");
                            }}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                theme === "dark"
                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddNote}
                            disabled={isSubmitting || !newNote.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSubmitting ? "Saving..." : "Save Note"}
                        </button>
                    </div>
                </div>
            )}

            {/* Notes Grid Layout */}
            {notes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className={`group relative rounded-xl p-5 transition-all duration-200 hover:shadow-lg border ${
                                theme === "dark" 
                                    ? `${note.color.dark} border-gray-700 hover:border-gray-600` 
                                    : `${note.color.light} border-gray-200 hover:border-gray-300 shadow-sm`
                            }`}
                        >
                            {editingNoteId === note.id ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={editNoteText}
                                        onChange={(e) => setEditNoteText(e.target.value)}
                                        rows={6}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                                            theme === "dark"
                                                ? "bg-gray-700 border-gray-600 text-white"
                                                : "bg-white border-gray-200 text-gray-900"
                                        }`}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditNote(note.id)}
                                            disabled={isSubmitting}
                                            className="flex-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingNoteId(null);
                                                setEditNoteText("");
                                            }}
                                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                theme === "dark"
                                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Note Header */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`p-2 rounded-lg flex-shrink-0 ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-100"}`}>
                                            <StickyNote className={`w-4 h-4 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                                {note.content}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Note Footer */}
                                    <div className={`flex items-center justify-between pt-3 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${theme === "dark" ? "bg-orange-900/40 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                                                {note.userInitials}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                                    {note.user}
                                                </p>
                                                <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                                    {note.relativeTime}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingNoteId(note.id);
                                                    setEditNoteText(note.content);
                                                }}
                                                className={`p-1.5 rounded-lg transition-colors ${
                                                    theme === "dark" 
                                                        ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" 
                                                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                                }`}
                                                title="Edit note"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                disabled={deletingNoteId === note.id}
                                                className={`p-1.5 rounded-lg transition-colors ${
                                                    theme === "dark" 
                                                        ? "hover:bg-red-900/20 text-gray-400 hover:text-red-400" 
                                                        : "hover:bg-red-50 text-gray-500 hover:text-red-600"
                                                }`}
                                                title="Delete note"
                                            >
                                                {deletingNoteId === note.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`text-center py-20 rounded-2xl ${theme === "dark" ? "bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700" : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-100"}`}>
                        <StickyNote className={`w-10 h-10 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        No notes yet
                    </h3>
                    <p className={`text-sm mb-6 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                        Start documenting important information about this lead
                    </p>
                    <button
                        onClick={() => setShowAddNote(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                    >
                        <Plus className="w-5 h-5" />
                        Create Your First Note
                    </button>
                </div>
            )}
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
    const [emailModal, setEmailModal] = useState({
        isOpen: false,
        recipientEmail: "",
        recipientName: "",
    });
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "activity", label: "Activity" },
       
        { id: "notes", label: "Notes" },

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

    // Helper to get due_date from task (supporting both due_date and due_datetime for backward compatibility)
    const getTaskDueDate = (task) => {
        return task.due_date || task.due_datetime;
    };

    // Get activity icon and color based on type
    const getActivityIcon = (type) => {
        const icons = {
            call: { icon: Phone, bg: theme === "dark" ? "bg-blue-900/40" : "bg-blue-100", color: theme === "dark" ? "text-blue-400" : "text-blue-600" },
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
            Medium: theme === "dark" ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-700",
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
                

                {/* Action Menu Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        className={`p-2 rounded-lg transition-colors ${
                            theme === "dark" 
                                ? "hover:bg-gray-700 text-gray-400" 
                                : "hover:bg-gray-100 text-gray-500"
                        }`}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {/* Action Menu Dropdown */}
                    {showActionsMenu && (
                        <>
                            {/* Backdrop */}
                            <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowActionsMenu(false)}
                            />
                            {/* Menu */}
                            <div className={`absolute right-0 mt-2 w-48 rounded-lg border shadow-xl z-20 ${
                                theme === "dark" 
                                    ? "bg-gray-800 border-gray-700" 
                                    : "bg-white border-gray-200"
                            }`}>
                                <button
                                    onClick={() => {
                                        setEmailModal({
                                            isOpen: true,
                                            recipientEmail: lead.email,
                                            recipientName: lead.name,
                                        });
                                        setShowActionsMenu(false);
                                    }}
                                    disabled={!lead.email}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                                        lead.email
                                            ? theme === "dark"
                                                ? "hover:bg-gray-700 text-gray-200"
                                                : "hover:bg-gray-100 text-gray-700"
                                            : theme === "dark"
                                                ? "text-gray-600 cursor-not-allowed"
                                                : "text-gray-400 cursor-not-allowed"
                                    }`}
                                >
                                    <Mail className="w-4 h-4" />
                                    Send Email
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <BookMeetingButton lead={lead} />
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
                <OverveiwTab lead={lead} leadId={leadId} setTab={setTab} />
            )}
      
            {/* ACTIVITY TAB */}
            {tab === "activity" && (
                <ActivityTab leadId={leadId} />
            )}

        

            {/* NOTES TAB */}
            {tab === "notes" && (
                <NotesTab theme={theme} leadId={leadId} leadName={lead.name} />
            )}

            {/* Email Modal */}
            <EmailModal
                open={emailModal.isOpen}
                onClose={() => setEmailModal({ isOpen: false, recipientEmail: "", recipientName: "" })}
                recipientEmail={emailModal.recipientEmail}
                recipientName={emailModal.recipientName}
                leadId={leadId}
            />
        </div>
    );
}