"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { useTheme } from "../../context/themeContext";

export default function Toast({ message, type = "success", isVisible, onClose, duration = 3000 }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const isSuccess = type === "success";
  const bgColor = isSuccess
    ? isDark
      ? "bg-green-900/30 border-green-700 text-green-400"
      : "bg-green-50 border-green-200 text-green-800"
    : isDark
    ? "bg-red-900/30 border-red-700 text-red-400"
    : "bg-red-50 border-red-200 text-red-800";

  return (
    <div
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-5 fade-in duration-300 ${bgColor}`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 flex-shrink-0" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}




