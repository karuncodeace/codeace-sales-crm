"use client";

import { useTheme } from "../context/themeContext";
import { getCalEventUrl } from "../../config/calConfig";
import { ExternalLink, Calendar } from "lucide-react";

export default function BookingWidget({ leadId, leadName, leadEmail, salespersonId, callType, onBookingComplete }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Generate the booking URL
  const eventTypeId = callType?.id || "discovery";
  const baseUrl = getCalEventUrl(eventTypeId);
  const params = new URLSearchParams();
  
  if (leadName) params.set("name", leadName);
  if (leadEmail) params.set("email", leadEmail);
  if (leadId) params.set("lead_id", leadId);
  if (salespersonId) params.set("salesperson_id", salespersonId);
  
  const query = params.toString();
  const bookingUrl = query ? `${baseUrl}?${query}` : baseUrl;

  const handleOpenBooking = () => {
    // Open booking URL in new tab
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
    
    // Call completion handler if provided
    if (onBookingComplete) {
      onBookingComplete({ url: bookingUrl });
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className={`max-w-md w-full text-center space-y-6 ${isDark ? "text-white" : "text-gray-900"}`}>
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
          <Calendar className={`w-8 h-8 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
        </div>
        
        <div>
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Ready to Book?
          </h3>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {callType?.label ? `Schedule your ${callType.label.toLowerCase()}` : "Schedule your meeting"} by clicking the button below.
          </p>
        </div>

        <button
          onClick={handleOpenBooking}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors bg-orange-500 text-white hover:bg-orange-600"
        >
          <Calendar className="w-5 h-5" />
          <span>Open Booking Page</span>
          <ExternalLink className="w-4 h-4" />
        </button>

        <p className="text-xs text-gray-500">
          You'll be redirected to the booking page in a new tab
        </p>
      </div>
    </div>
  );
}

