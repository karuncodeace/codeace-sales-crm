"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getCalApi } from "@calcom/embed-react";
import { useTheme } from "../context/themeContext";
import { Loader2 } from "lucide-react";
import Script from "next/script";

export default function BookingWidget({ leadId, leadName, leadEmail, salespersonId, callType, onBookingComplete, onError }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const calRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Initialize Cal.com embed
    const initCal = async () => {
      try {
        const cal = await getCalApi();
        
        if (!cal) {
          setError("Cal.com embed failed to load");
          setIsLoading(false);
          return;
        }

        // Create inline embed
        if (calRef.current) {
          // Clear any existing embed first
          try {
            const calLink = callType?.calLink || "karun-karthikeyan-8wsv1t/15min";
            
            cal("inline", {
              elementOrSelector: calRef.current,
              calLink: calLink,
              layout: "month_view",
              config: {
                name: leadName || "",
                email: leadEmail || "",
              },
            });
          } catch (embedError) {
            // Ignore "already exists" errors
            if (!embedError.message?.includes("already exists")) {
              console.warn("Cal.com embed warning:", embedError);
            }
          }

          // Create a single event handler that prevents duplicates
          if (!eventHandlerRef.current) {
            eventHandlerRef.current = (e) => {
              // Prevent duplicate processing
              if (isProcessingRef.current) {
                console.log("Booking already being processed, ignoring duplicate event");
                return;
              }

              console.log("Cal.com event received - Full event:", e);
              console.log("Cal.com event - Type:", e.type);
              console.log("Cal.com event - Detail:", e.detail);
              console.log("Cal.com event - Data:", e.data);
              
              // Only process bookingSuccessful events
              const eventType = e.type || e.action || "";
              if (eventType !== "bookingSuccessful" && eventType !== "BOOKING_SUCCESSFUL") {
                return;
              }
              
              isProcessingRef.current = true;
              
              // Extract booking payload from event - Cal.com sends data in different formats
              let bookingPayload = e.detail || e.data || e;
              
              // Handle different event structures
              if (bookingPayload?.booking) {
                bookingPayload = bookingPayload.booking;
              } else if (bookingPayload?.data) {
                bookingPayload = bookingPayload.data;
              }
              
              // Log the full payload for debugging
              console.log("Sending booking payload to API:", JSON.stringify(bookingPayload, null, 2));
              
              // Send booking to API
              fetch("/api/cal-booking", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  lead_id: leadId,
                  lead_name: leadName,
                  salesperson_id: salespersonId,
                  booking_payload: bookingPayload,
                }),
              })
                .then(async (res) => {
                  const responseData = await res.json();
                  if (!res.ok) {
                    console.error("API Error Response:", responseData);
                    throw new Error(responseData.error || "Failed to save booking");
                  }
                  return responseData;
                })
                .then((data) => {
                  console.log("Booking saved successfully:", data);
                  isProcessingRef.current = false;
                  if (onBookingComplete) {
                    onBookingComplete(data);
                  }
                })
                .catch((err) => {
                  console.error("Error saving booking:", err);
                  isProcessingRef.current = false;
                  if (onError) {
                    onError(err.message || "Failed to save booking");
                  }
                });
            };

            // Register event listener only once
            cal("on", {
              action: "bookingSuccessful",
              callback: eventHandlerRef.current,
            });
          }

          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error initializing Cal.com:", err);
        setError("Failed to load booking calendar");
        setIsLoading(false);
      }
    };

    // Start initialization
    initCal();

    // Set loading to false after a delay as fallback
    const fallbackTimer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      isProcessingRef.current = false;
    };
  }, [leadId, leadName, leadEmail, salespersonId, callType, onBookingComplete, onError, isLoading]);

  return (
    <>
      <Script
        src="https://app.cal.com/embed/embed.js"
        strategy="lazyOnload"
        onLoad={() => {
          // Script loaded, initialize will happen in useEffect
        }}
      />
      <div className={`w-full h-full flex flex-col ${isDark ? "bg-[#1a1a1a]" : "bg-white"}`}>
        {isLoading && (
          <div className="flex items-center justify-center flex-1 min-h-[500px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Loading booking calendar...
              </p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center flex-1 min-h-[500px]">
            <div className={`text-center p-6 rounded-lg ${isDark ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"}`}>
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <div className="flex-1 w-full h-full overflow-hidden">
            <div
              ref={calRef}
              className="w-full h-full"
              style={{
                width: "100%",
                height: "100%",
                minHeight: "600px",
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

