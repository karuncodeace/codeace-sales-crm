/**
 * Cal.com Configuration
 * Centralized configuration for self-hosted Cal.com instance
 */

// Base URL for self-hosted Cal.com instance
export const CAL_BASE_URL = "https://meetings.axilume.ai";

// Cal.com API base URL (for API calls)
export const CAL_API_BASE_URL = process.env.CALCOM_API_URL || `${CAL_BASE_URL}/api/v2`;

// Event type mappings
// Maps internal call type IDs to Cal.com event type slugs
export const CAL_EVENT_TYPES = {
  discovery: "admin/discovery-call",
  "kick-off": "admin/this-is-kick-off-call",
  sales: "admin/sales-call", // Assuming sales-call exists, adjust if needed
};

// Get the full booking URL for an event type
export function getCalEventUrl(eventTypeId) {
  const eventSlug = CAL_EVENT_TYPES[eventTypeId];
  if (!eventSlug) {
    // Fallback to discovery call if event type not found
    return `${CAL_BASE_URL}/${CAL_EVENT_TYPES.discovery}`;
  }
  return `${CAL_BASE_URL}/${eventSlug}`;
}

// Get the calLink format for embed (username/event-slug format)
export function getCalLink(eventTypeId) {
  const eventSlug = CAL_EVENT_TYPES[eventTypeId];
  if (!eventSlug) {
    // Fallback to discovery call if event type not found
    return CAL_EVENT_TYPES.discovery;
  }
  return eventSlug;
}

// Embed script URL
export const CAL_EMBED_SCRIPT_URL = `${CAL_BASE_URL}/embed/embed.js`;


