"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useTheme } from "../../../context/themeContext";
import { useAlert } from "../../../context/alertContext";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ObjectionTab({ leadId, leadName, theme: themeProp }) {
    const { theme: ctxTheme } = useTheme();
    const { showConfirm } = useAlert();
    const theme = themeProp || ctxTheme;

    const [showAdd, setShowAdd] = useState(false);
    const [newObjection, setNewObjection] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const { data: objectionsData, isLoading, mutate } = useSWR(
        leadId ? `/api/objections?lead_id=${leadId}` : null,
        fetcher
    );

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        return date.toLocaleString("en-IN", {
            timeZone: "Asia/Calcutta",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const objections = (Array.isArray(objectionsData) ? objectionsData : [])
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const handleAdd = async () => {
        if (!newObjection.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/objections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lead_id: leadId,
                    objection_content: newObjection.trim(),
                }),
            });
            if (!res.ok) throw new Error("Failed to add objection");
            setNewObjection("");
            setShowAdd(false);
            await mutate();
        } catch (err) {
            // Silently handle error
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        showConfirm("Delete this objection?", () => {
            proceedWithDelete(id);
        }, "Confirm Deletion");
    };
    
    const proceedWithDelete = async (id) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/objections?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete objection");
            await mutate();
        } catch (err) {
            // Silently handle error
        } finally {
            setDeletingId(null);
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        Objections
                    </h2>
                    <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {objections.length} {objections.length === 1 ? "objection" : "objections"} for {leadName}
                    </p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Objection
                </button>
            </div>

            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
                    <div className={`relative w-full max-w-2xl p-6 rounded-2xl shadow-2xl border-2 ${
                        theme === "dark"
                            ? "bg-gradient-to-br from-gray-800 to-gray-900 border-orange-500/30"
                            : "bg-gradient-to-br from-white to-gray-50 border-orange-200"
                    }`}>
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-100"}`}>
                                    <AlertTriangle className={`w-6 h-6 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                        Log Objection
                                    </h3>
                                    <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                        Capture the objection shared by the lead.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAdd(false);
                                    setNewObjection("");
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

                        <textarea
                            value={newObjection}
                            onChange={(e) => setNewObjection(e.target.value)}
                            placeholder="Describe the objection..."
                            rows={6}
                            className={`w-full px-4 py-4 rounded-xl border-2 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${
                                theme === "dark"
                                    ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                            }`}
                        />
                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => {
                                    setShowAdd(false);
                                    setNewObjection("");
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
                                onClick={handleAdd}
                                disabled={isSubmitting || !newObjection.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isSubmitting ? "Saving..." : "Save Objection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {objections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {objections.map((obj) => (
                        <div
                            key={obj.id}
                            className={`rounded-xl p-4 border transition-colors ${
                                theme === "dark"
                                    ? "bg-transparent border-gray-700 hover:border-gray-600"
                                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-md ${theme === "dark" ? "bg-orange-500/15" : "bg-orange-50"}`}>
                                        <AlertTriangle className={`w-4 h-4 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                            Lead Objection
                                        </p>
                                        <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                            {formatDate(obj.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(obj.id)}
                                    disabled={deletingId === obj.id}
                                    className={`p-2 rounded-md transition-colors ${
                                        theme === "dark"
                                            ? "hover:bg-red-900/30 text-gray-400 hover:text-red-400"
                                            : "hover:bg-red-50 text-gray-500 hover:text-red-600"
                                    }`}
                                    title="Delete objection"
                                >
                                    {deletingId === obj.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <p className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                                {obj.comments || obj.activity || "—"}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`text-center py-16 rounded-2xl border ${
                    theme === "dark"
                        ? "bg-transparent border-gray-700"
                        : "bg-white border-gray-200"
                }`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        theme === "dark" ? "bg-gray-800" : "bg-orange-50"
                    }`}>
                        <AlertTriangle className={`w-7 h-7 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        No objections yet
                    </h3>
                    <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        Capture objections from your conversations to track and resolve them.
                    </p>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                    >
                        <Plus className="w-4 h-4" />
                        Add Objection
                    </button>
                </div>
            )}
        </div>
    );
}

