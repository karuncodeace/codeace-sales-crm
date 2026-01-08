"use client";

import toast from "react-hot-toast";

/**
 * Utility functions for showing toast notifications
 * These provide a consistent API for success, error, warning, and info messages
 */

export const showToast = {
  success: (message) => {
    toast.success(message, {
      duration: 3000,
    });
  },
  error: (message) => {
    toast.error(message, {
      duration: 4000,
    });
  },
  warning: (message) => {
    toast(message, {
      icon: "⚠️",
      duration: 3000,
    });
  },
  info: (message) => {
    toast(message, {
      icon: "ℹ️",
      duration: 3000,
    });
  },
  loading: (message) => {
    return toast.loading(message);
  },
  promise: (promise, messages) => {
    return toast.promise(promise, messages);
  },
};

/**
 * Show a confirmation dialog using toast
 * Note: react-hot-toast doesn't have built-in confirm, so we use a custom approach
 * For critical confirmations, consider using a modal instead
 */
export const showConfirmToast = (message, onConfirm, onCancel = null) => {
  const toastId = toast(
    (t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{message}</p>
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <button
              onClick={() => {
                toast.dismiss(t.id);
                if (onCancel) onCancel();
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              toast.dismiss(t.id);
              if (onConfirm) onConfirm();
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    ),
    {
      duration: Infinity, // Don't auto-dismiss
      position: "top-center",
    }
  );
  return toastId;
};






