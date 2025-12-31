"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Alert from "../components/ui/Alert";

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: null,
    message: "",
    type: "info",
    showConfirm: false,
    onConfirm: null,
    confirmText: "OK",
    cancelText: "Cancel",
  });

  const showAlert = useCallback((message, type = "info", title = null) => {
    setAlertState({
      isOpen: true,
      message,
      type,
      title,
      showConfirm: false,
      onConfirm: null,
      confirmText: "OK",
      cancelText: "Cancel",
    });
  }, []);

  const showConfirm = useCallback((message, onConfirm, title = null, type = "warning") => {
    setAlertState({
      isOpen: true,
      message,
      type,
      title,
      showConfirm: true,
      onConfirm,
      confirmText: "OK",
      cancelText: "Cancel",
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, closeAlert }}>
      {children}
      <Alert
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        showConfirm={alertState.showConfirm}
        onConfirm={alertState.onConfirm}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}


