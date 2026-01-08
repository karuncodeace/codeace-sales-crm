"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, XCircle, X } from "lucide-react";
import { useTheme } from "../../context/themeContext";

export default function Alert({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = "info",
  showConfirm = false,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel"
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (isOpen && !showConfirm) {
      // Auto-close simple alerts after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showConfirm, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: isDark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200",
          text: isDark ? "text-green-400" : "text-green-800",
          icon: <CheckCircle2 className="h-5 w-5 flex-shrink-0" />,
        };
      case "error":
        return {
          bg: isDark ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200",
          text: isDark ? "text-red-400" : "text-red-800",
          icon: <XCircle className="h-5 w-5 flex-shrink-0" />,
        };
      case "warning":
        return {
          bg: isDark ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200",
          text: isDark ? "text-yellow-400" : "text-yellow-800",
          icon: <AlertCircle className="h-5 w-5 flex-shrink-0" />,
        };
      default:
        return {
          bg: isDark ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200",
          text: isDark ? "text-blue-400" : "text-blue-800",
          icon: <AlertCircle className="h-5 w-5 flex-shrink-0" />,
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`${styles.bg} ${styles.text} border rounded-lg shadow-xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
              )}
              <p className="text-sm font-medium">{message}</p>
            </div>
            {!showConfirm && (
              <button
                onClick={onClose}
                className="ml-2 p-1 rounded hover:bg-black/10 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {showConfirm && (
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === "error"
                    ? isDark
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                    : isDark
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}






