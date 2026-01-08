"use client";

// This file provides a drop-in replacement for native alert() and confirm()
// Import useAlert from context/alertContext in your components instead

export const createAlertHelpers = (showAlert, showConfirm) => {
  return {
    alert: (message, type = "info") => {
      showAlert(message, type);
    },
    confirm: (message, onConfirm, title = "Confirm") => {
      showConfirm(message, onConfirm, title, "warning");
    },
  };
};






