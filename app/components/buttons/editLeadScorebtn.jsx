"use client";

import { useState, useEffect } from "react";
import { useTheme } from "../../context/themeContext";
import toast from "react-hot-toast";
import { X, Target, MessageSquare, Zap, TrendingUp, Save, Loader2 } from "lucide-react";

export default function EditLeadScoreModal({ isOpen, onClose, lead, leadId, onSave }) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    
    const [scores, setScores] = useState({
        lead_score: 0,
        responsiveness_score: 0,
        conversion_probability_score: 0,
    });
    const [isSaving, setIsSaving] = useState(false);

    // Initialize scores when modal opens or lead changes
    useEffect(() => {
        if (isOpen && lead) {
            setScores({
                lead_score: Number(lead.lead_score) || 0,
                responsiveness_score: Number(lead.responsiveness_score) || 0,
                conversion_probability_score: Number(lead.conversion_probability_score) || 0,
            });
        }
    }, [isOpen, lead]);

    // Handle score change
    const handleScoreChange = (field, value) => {
        const numValue = parseInt(value) || 0;
        let maxValue = 5;
        if (field === "responsiveness_score" || field === "conversion_probability_score") {
            maxValue = 10;
        }
        
        setScores((prev) => ({
            ...prev,
            [field]: Math.max(0, Math.min(maxValue, numValue)),
        }));
    };

    // Save scores
    const handleSave = async () => {
        if (!leadId) return;
        
        setIsSaving(true);
        try {
            const response = await fetch(`/api/leads/${leadId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    lead_score: scores.lead_score,
                    responsiveness_score: scores.responsiveness_score,
                    conversion_probability_score: scores.conversion_probability_score,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to save scores");
            }

            // Call onSave callback to refresh data
            if (onSave) {
                onSave();
            }

            toast.success("Scores saved successfully!");
            onClose();
        } catch (error) {
            toast.error(error.message || "Failed to save scores. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const totalScore = Number(scores.lead_score || 0) + Number(scores.responsiveness_score || 0) + Number(scores.conversion_probability_score || 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-xl sm:rounded-2xl shadow-2xl transform transition-all overflow-hidden flex flex-col ${
                    isDark ? "bg-[#1f1f1f] border border-gray-700" : "bg-white border border-gray-200"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                            <Target className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className={`text-lg sm:text-xl font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                Edit Lead Scores
                            </h2>
                            <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                Update scoring for {lead?.name || "this lead"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ml-2 ${
                            isDark
                                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                                : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
                    {/* Lead Score */}
                    <div className={`p-3 sm:p-5 rounded-lg sm:rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isDark ? "bg-blue-900/40" : "bg-blue-100"}`}>
                                <Target className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-xs sm:text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                                    Lead Score
                                </h3>
                                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    Rate the overall quality of this lead (0-5)
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                            <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-1.5 sm:mb-2">
                                    <div
                                        className="bg-blue-500 h-2 sm:h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${(scores.lead_score / 5) * 100}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] sm:text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    {scores.lead_score} / 5
                                </span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                max="5"
                                value={scores.lead_score}
                                onChange={(e) => handleScoreChange("lead_score", e.target.value)}
                                className={`w-full sm:w-20 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xl sm:text-2xl font-bold text-center border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${
                                    isDark
                                        ? "bg-gray-700/80 border-blue-500/50 text-blue-400 hover:border-blue-400 focus:bg-gray-700"
                                        : "bg-white border-blue-300 text-blue-600 hover:border-blue-400 focus:bg-blue-50/50"
                                } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                        </div>
                    </div>

                    {/* Responsiveness Score */}
                    <div className={`p-3 sm:p-5 rounded-lg sm:rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isDark ? "bg-green-900/40" : "bg-green-100"}`}>
                                <MessageSquare className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-green-400" : "text-green-600"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-xs sm:text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                                    Responsiveness Score
                                </h3>
                                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    How quickly and frequently the lead responds (0-10)
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                            <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-1.5 sm:mb-2">
                                    <div
                                        className="bg-green-500 h-2 sm:h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${(scores.responsiveness_score / 10) * 100}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] sm:text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    {scores.responsiveness_score} / 10
                                </span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={scores.responsiveness_score}
                                onChange={(e) => handleScoreChange("responsiveness_score", e.target.value)}
                                className={`w-full sm:w-20 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xl sm:text-2xl font-bold text-center border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm ${
                                    isDark
                                        ? "bg-gray-700/80 border-green-500/50 text-green-400 hover:border-green-400 focus:bg-gray-700"
                                        : "bg-white border-green-300 text-green-600 hover:border-green-400 focus:bg-green-50/50"
                                } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                        </div>
                    </div>

                    {/* Conversion Probability Score */}
                    <div className={`p-3 sm:p-5 rounded-lg sm:rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isDark ? "bg-yellow-900/40" : "bg-yellow-100"}`}>
                                <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-xs sm:text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                                    Conversion Probability Score
                                </h3>
                                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    Likelihood of converting this lead to a customer (0-10)
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                            <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-1.5 sm:mb-2">
                                    <div
                                        className="bg-yellow-500 h-2 sm:h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${(scores.conversion_probability_score / 10) * 100}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] sm:text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    {scores.conversion_probability_score} / 10
                                </span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={scores.conversion_probability_score}
                                onChange={(e) => handleScoreChange("conversion_probability_score", e.target.value)}
                                className={`w-full sm:w-20 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xl sm:text-2xl font-bold text-center border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm ${
                                    isDark
                                        ? "bg-gray-700/80 border-yellow-500/50 text-yellow-400 hover:border-yellow-400 focus:bg-gray-700"
                                        : "bg-white border-yellow-300 text-yellow-600 hover:border-yellow-400 focus:bg-yellow-50/50"
                                } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                        </div>
                    </div>

                    {/* Total Score */}
                    <div className={`p-3 sm:p-5 rounded-lg sm:rounded-xl border ${isDark ? "bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-orange-700/50" : "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"}`}>
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isDark ? "bg-orange-500/20" : "bg-orange-200"}`}>
                                <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-xs sm:text-sm font-semibold ${isDark ? "text-orange-300" : "text-orange-700"}`}>
                                    Total Score
                                </h3>
                                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${isDark ? "text-orange-400/70" : "text-orange-600/70"}`}>
                                    Combined score out of 25
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                            <div className={`w-full sm:w-24 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-2xl sm:text-3xl font-bold text-center ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                                {totalScore}
                            </div>
                            <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-1.5 sm:mb-2">
                                    <div
                                        className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${isDark ? "bg-orange-500" : "bg-orange-500"}`}
                                        style={{ width: `${(totalScore / 25) * 100}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] sm:text-xs font-medium ${isDark ? "text-orange-400/70" : "text-orange-600/70"}`}>
                                    {totalScore} / 25
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors ${
                            isDark
                                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            isDark
                                ? "bg-orange-600 hover:bg-orange-700 text-white"
                                : "bg-orange-500 hover:bg-orange-600 text-white"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Scores
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

