"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, StickyNote, Plus, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const fetcher = (url) => fetch(url).then((res) => res.json());

function NotesTab({ theme, leadId, leadName }) {
    const [showAddNote, setShowAddNote] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteText, setEditNoteText] = useState("");
    const [deletingNoteId, setDeletingNoteId] = useState(null);
    const [newNoteType, setNewNoteType] = useState("general");
    const [activeTab, setActiveTab] = useState("general");

    // Fetch notes from leads_notes table only
    const { data: leadNotesData, error: leadNotesError, isLoading: isLoadingLeadNotes, mutate: mutateLeadNotes } = useSWR(
        leadId ? `/api/lead-notes?lead_id=${leadId}` : null,
        fetcher
    );

    // Loading / error state
    const isLoading = isLoadingLeadNotes;
    const error = leadNotesError;

    // Mutate function to refresh notes
    const mutate = () => {
        mutateLeadNotes();
    };

    // Format timestamp for display (using Asia/Calcutta timezone)
    const formatNoteDate = (dateString) => {
        if (!dateString) return { date: "—", time: "—" };
        const date = new Date(dateString);
        const dateOptions = {
            timeZone: 'Asia/Calcutta',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        const timeOptions = {
            timeZone: 'Asia/Calcutta',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return {
            date: date.toLocaleDateString('en-IN', dateOptions),
            time: date.toLocaleTimeString('en-IN', timeOptions).toLowerCase()
        };
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

    // Only use notes from leads_notes table (display source single source)
    const leadNotesList = Array.isArray(leadNotesData) ? leadNotesData : [];
    const notes = leadNotesList
        .map(note => ({
            id: note.id,
            content: note.notes || "",
            user: "User",
            userInitials: "US",
            createdAt: note.created_at,
            dateTime: formatNoteDate(note.created_at),
            relativeTime: formatRelativeTime(note.created_at),
            notesType: (note.notes_type || "general").toLowerCase(),
            source: "leads_notes",
        }))
        .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
        });

    const noteTabs = [
        { id: "general", label: "General Notes" },
        { id: "call", label: "Call Notes" },
        { id: "meeting", label: "Meeting Notes" },

    ];

    const filteredNotes = notes.filter((note) => {
        if (activeTab === "general") return true;
        return note.notesType === activeTab;
    });

    const typeCounts = notes.reduce(
        (acc, note) => {
            acc[note.notesType] = (acc[note.notesType] || 0) + 1;
            return acc;
        },
        { call: 0, meeting: 0, general: 0 }
    );
    typeCounts.general = notes.length;

    // Handle add note - save to both task_activities and leads_notes
    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        try {
            // Save to task_activities (for backward compatibility)
            const activityResponse = await fetch('/api/task-activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    activity: "Note Added",
                    type: "note",
                    comments: newNote.trim(),
                    connect_through: "note",
                    notes_type: newNoteType,
                }),
            });

            // Also save to leads_notes table
            const leadNotesResponse = await fetch('/api/lead-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    notes: newNote.trim(),
                    notes_type: newNoteType,
                }),
            });

            if (activityResponse.ok || leadNotesResponse.ok) {
                setNewNote("");
                setNewNoteType("general");
                setShowAddNote(false);
                mutate(); // Refresh the notes list
                if (activityResponse.ok && leadNotesResponse.ok) {
                    toast.success("Note saved successfully");
                } else if (leadNotesResponse.ok) {
                    toast.success("Note saved to leads_notes");
                } else if (activityResponse.ok) {
                    toast.success("Note saved to task_activities");
                }
            } else {
                toast.error("Failed to save note");
            }
        } catch (error) {
            toast.error("Error saving note");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle edit note - update based on source
    const handleEditNote = async (noteId) => {
        if (!editNoteText.trim()) return;

        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        setIsSubmitting(true);
        try {
            let response;
            if (note.source === "leads_notes") {
                // Update in leads_notes table
                response = await fetch('/api/lead-notes', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: noteId,
                        notes: editNoteText.trim(),
                        notes_type: note.notesType,
                    }),
                });
            } else {
                // Update in task_activities
                response = await fetch('/api/task-activities', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: noteId,
                        comments: editNoteText.trim(),
                        activity: "Note Updated",
                    }),
                });
            }

            if (response.ok) {
                setEditingNoteId(null);
                setEditNoteText("");
                mutate();
                // Also log this update in task_activities for audit
                try {
                    await fetch("/api/task-activities", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lead_id: leadId,
                            activity: "Note Updated",
                            type: "note",
                            comments: editNoteText.trim(),
                            notes_type: note.notesType || "general",
                            source: "ui",
                            created_at: new Date().toISOString(),
                        }),
                    });
                } catch (err) {
                    // non-fatal
                    console.warn("Failed to log note update to task_activities", err);
                }
                toast.success("Note updated successfully");
            } else {
                toast.error("Failed to update note");
            }
        } catch (error) {
            toast.error("Error updating note");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete note - delete based on source
    const handleDeleteNote = async (noteId) => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        toast(
            (t) => (
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Are you sure you want to delete this note?</p>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                setDeletingNoteId(noteId);
                                try {
                                    let response;
                                    if (note.source === "leads_notes") {
                                        // Delete from leads_notes table
                                        response = await fetch(`/api/lead-notes?id=${noteId}`, {
                                            method: "DELETE",
                                        });
                                    } else {
                                        // Delete from task_activities
                                        response = await fetch(`/api/task-activities?id=${noteId}`, {
                                            method: "DELETE",
                                        });
                                    }

                                    if (!response.ok) {
                                        throw new Error("Failed to delete note");
                                    }
                            // Log deletion in task_activities
                            try {
                                await fetch("/api/task-activities", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        lead_id: leadId,
                                        activity: "Note Deleted",
                                        type: "note",
                                        comments: note.content || note.activity || "",
                                        notes_type: note.notesType || "general",
                                        source: "ui",
                                        created_at: new Date().toISOString(),
                                    }),
                                });
                            } catch (err) {
                                console.warn("Failed to log note deletion to task_activities", err);
                            }
                            await mutate();
                            toast.success("Note deleted successfully");
                                } catch (error) {
                                    toast.error("Failed to delete note");
                                } finally {
                                    setDeletingNoteId(null);
                                }
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ),
            {
                duration: Infinity,
                position: "top-center",
            }
        );
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
                    <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
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

            {/* Note type tabs */}
            <div className={`flex items-center gap-2 rounded-xl p-4 ${theme === "dark" ? "bg-gray-800/60 border border-gray-700" : "bg-white border border-gray-200"}`}>
                {noteTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? "bg-orange-500 text-white shadow-sm"
                                : theme === "dark"
                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        {tab.label}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id
                                ? "bg-white/20"
                                : theme === "dark"
                                    ? "bg-gray-700 text-gray-300"
                                    : "bg-white text-gray-600"
                            }`}>
                            {typeCounts[tab.id] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Add Note Modal */}
            {showAddNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddNote(false)} />
                    <div className={`relative w-full max-w-2xl p-6 rounded-2xl shadow-2xl border-2 ${theme === "dark"
                            ? "bg-gradient-to-br from-gray-800 to-gray-900 border-orange-500/30"
                            : "bg-gradient-to-br from-white to-gray-50 border-orange-200"
                        }`}>
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-100"}`}>
                                    <StickyNote className={`w-6 h-6 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                        Create New Note
                                    </h3>
                                    <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                        Choose a note type and add details for this lead.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddNote(false);
                                    setNewNote("");
                                    setNewNoteType("general");
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${theme === "dark"
                                        ? "hover:bg-gray-700 text-gray-400"
                                        : "hover:bg-gray-100 text-gray-500"
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Type selector */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            {noteTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setNewNoteType(tab.id)}
                                    className={`text-left border rounded-xl p-3 transition-colors ${newNoteType === tab.id
                                            ? "border-orange-500 bg-orange-500/10"
                                            : theme === "dark"
                                                ? "border-gray-700 hover:border-gray-600 bg-gray-800"
                                                : "border-gray-200 hover:border-gray-300 bg-white"
                                        }`}
                                >
                                    <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                        {tab.label}
                                    </p>
                                    <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                        Save a note tagged as {tab.label}.
                                    </p>
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="What's on your mind? Write your note here..."
                            rows={8}
                            className={`w-full px-4 py-4 rounded-xl border-2 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${theme === "dark"
                                    ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                                }`}
                        />
                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => {
                                    setShowAddNote(false);
                                    setNewNote("");
                                    setNewNoteType("general");
                                }}
                                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === "dark"
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
                </div>
            )}

            {/* Notes Grid Layout */}
            {filteredNotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredNotes.map((note) => (
                        <div
                            key={note.id}
                            className={`group relative rounded-xl p-5 transition-all duration-200 hover:shadow-xl border ${theme === "dark"
                                    ? "bg-[#262626] border-gray-700 hover:border-orange-500/30 hover:bg-[#2a2a2a]"
                                    : "bg-white border-gray-200 hover:border-orange-200 hover:shadow-md"
                                }`}
                        >
                            {editingNoteId === note.id ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={editNoteText}
                                        onChange={(e) => setEditNoteText(e.target.value)}
                                        rows={6}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${theme === "dark"
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
                                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${theme === "dark"
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
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center  mb-3">
                                               {/* Note Type Badge */}
                                        <div className="mb-3">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs  uppercase  ${note.notesType === "call"
                                                    ? theme === "dark"
                                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                                    : note.notesType === "meeting"
                                                        ? theme === "dark"
                                                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                                            : "bg-purple-50 text-purple-700 border border-purple-200"
                                                        : theme === "dark"
                                                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                                            : "bg-orange-50 text-orange-700 border border-orange-200"
                                                }`}>
                                                {note.notesType === "call" && "#Call Notes"}
                                                {note.notesType === "meeting" && "#Meeting Notes"}
                                                {note.notesType === "general" && "#General Notes"}
                                            </span>
                                        </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingNoteId(note.id);
                                                        setEditNoteText(note.content);
                                                    }}
                                                    className={`p-1.5 rounded-lg transition-colors ${theme === "dark"
                                                            ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                                                            : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                                        }`}
                                                    title="Edit note"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    disabled={deletingNoteId === note.id}
                                                    className={`p-1.5 rounded-lg transition-colors ${theme === "dark"
                                                            ? "hover:bg-red-900/20 text-gray-400 hover:text-red-400"
                                                            : "hover:bg-red-50 text-gray-500 hover:text-red-600"
                                                        }`}
                                                    title="Delete note"
                                                >
                                                    {deletingNoteId === note.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                     
  {/* Note Content */}
  <div className="mb-4">
                                        <p className={`text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                            {note.content}
                                        </p>
                                    </div>

                                        {/* Date and Time */}
                                        <div className={`text-xs mb-4 space-y-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                            <div>{note.dateTime?.date || "—"} | {note.dateTime?.time || ""}</div>
                                         
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
                        No notes in this category
                    </h3>
                    <p className={`text-sm mb-6 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                        Switch tabs or add a note to {activeTab === "call" ? "Call" : activeTab === "meeting" ? "Meeting" : "General"} Notes.
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

export default NotesTab;
