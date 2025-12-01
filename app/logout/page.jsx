"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase/browserClient";

export default function LogoutPage() {
  const [status, setStatus] = useState("logging_out");
  const [message, setMessage] = useState("Signing you out securely...");

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Small delay for smooth UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setMessage("Clearing your session...");
        
        // Sign out from Supabase
        await supabaseBrowser.auth.signOut();
        
        // Clear all Supabase cookies manually
        document.cookie.split(";").forEach((c) => {
          const cookie = c.trim();
          if (cookie.startsWith("sb-")) {
            const name = cookie.split("=")[0];
            document.cookie = `${name}=; expires=Thu, 01 Jan 2026 00:00:00 UTC; path=/;`;
          }
        });

        await new Promise(resolve => setTimeout(resolve, 300));
        
        setStatus("success");
        setMessage("You've been signed out successfully");
        
        // Redirect to login with success message
        setTimeout(() => {
          window.location.href = "/login?message=logged_out";
        }, 1200);
        
      } catch (error) {
        console.error("Logout error:", error);
        setStatus("error");
        setMessage("There was an issue signing you out");
        
        // Redirect anyway after showing error
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    };

    handleLogout();
  }, []);

  const statusConfig = {
    logging_out: {
      icon: (
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-orange-100"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
        </div>
      ),
      color: "text-gray-600",
      subtext: "Please wait a moment...",
    },
    success: {
      icon: (
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in duration-300">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
      color: "text-green-600",
      subtext: "See you next time!",
    },
    error: {
      icon: (
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center animate-in zoom-in duration-300">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      ),
      color: "text-amber-600",
      subtext: "Redirecting you anyway...",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center p-8 max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Status Icon */}
        <div className="mb-6 flex justify-center">
          {currentStatus.icon}
        </div>

        {/* Message */}
        <p className={`text-lg font-medium ${currentStatus.color} transition-colors duration-300`}>
          {message}
        </p>
        
        <p className="text-sm text-gray-500 mt-2">
          {currentStatus.subtext}
        </p>

        {/* Progress dots for loading state */}
        {status === "logging_out" && (
          <div className="flex justify-center gap-1.5 mt-4">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
        )}
      </div>
    </div>
  );
}
