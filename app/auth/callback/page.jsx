"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your credentials...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from the URL (contains the tokens)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          setStatus("authenticating");
          setMessage("Setting up your secure session...");
          
          // Small delay for smooth UX
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Set the session using the tokens from the URL
          const { data, error } = await supabaseBrowser.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setStatus("error");
            setMessage("We couldn't verify your credentials. Please try signing in again.");
            setTimeout(() => router.push("/login?error=session_error"), 2500);
            return;
          }

          if (data.session) {
            setStatus("success");
            setMessage("Welcome back! Preparing your dashboard...");
            
            // Save login timestamp for auto-logout
            localStorage.setItem("login_time", Date.now().toString());
            
            // Small delay to show success state
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Use window.location for a full page reload to ensure cookies are sent
            window.location.href = "/dashboard";
          } else {
            setStatus("error");
            setMessage("Authentication incomplete. Please try again.");
            setTimeout(() => router.push("/login?error=no_session"), 2500);
          }
        } else {
          // No tokens in hash, check for existing session
          const { data: { session } } = await supabaseBrowser.auth.getSession();
          
          if (session) {
            setStatus("success");
            setMessage("Session found! Redirecting...");
            
            // Save login timestamp for auto-logout
            localStorage.setItem("login_time", Date.now().toString());
            
            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.href = "/dashboard";
          } else {
            setStatus("error");
            setMessage("No authentication data received. Please try signing in again.");
            setTimeout(() => router.push("/login?error=no_tokens"), 2500);
          }
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
        setTimeout(() => router.push("/login?error=callback_error"), 2500);
      }
    };

    handleAuthCallback();
  }, [router]);

  const statusConfig = {
    verifying: {
      icon: (
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-orange-100"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
        </div>
      ),
      color: "text-gray-600",
    },
    authenticating: {
      icon: (
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-orange-100"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
        </div>
      ),
      color: "text-gray-600",
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
    },
    error: {
      icon: (
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-in zoom-in duration-300">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      ),
      color: "text-red-600",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center p-8">
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
        
        {status === "error" && (
          <p className="text-sm text-gray-500 mt-2">
            Redirecting you back to sign in...
          </p>
        )}

        {/* Progress dots for loading states */}
        {(status === "verifying" || status === "authenticating") && (
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
