"use client";

import { useNotification } from "../../context/notificationContext";
import { useTheme } from "../../context/themeContext";

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();
  const { theme } = useTheme();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => {
        const isDark = theme === "dark";
        const bgColor = 
          notification.type === "success" 
            ? isDark ? "bg-green-900/90 border-green-700" : "bg-green-50 border-green-200"
            : notification.type === "error"
            ? isDark ? "bg-red-900/90 border-red-700" : "bg-red-50 border-red-200"
            : isDark ? "bg-blue-900/90 border-blue-700" : "bg-blue-50 border-blue-200";
        
        const textColor = 
          notification.type === "success"
            ? isDark ? "text-green-200" : "text-green-800"
            : notification.type === "error"
            ? isDark ? "text-red-200" : "text-red-800"
            : isDark ? "text-blue-200" : "text-blue-800";

        const iconColor = 
          notification.type === "success"
            ? isDark ? "text-green-400" : "text-green-600"
            : notification.type === "error"
            ? isDark ? "text-red-400" : "text-red-600"
            : isDark ? "text-blue-400" : "text-blue-600";

        return (
          <div
            key={notification.id}
            className={`${bgColor} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300`}
          >
            <div className={`flex-shrink-0 ${iconColor}`}>
              {notification.type === "success" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : notification.type === "error" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${textColor}`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`flex-shrink-0 ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

