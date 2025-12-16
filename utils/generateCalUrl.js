// Utility to build a Cal.com booking URL with encoded query params
// Expects lead: { id, name, email }, salesperson: { id }, and optional eventTypeId
// Returns a string URL

import { CAL_BASE_URL, getCalEventUrl } from "../config/calConfig";

export function generateCalUrl(lead = {}, salesperson = {}, eventTypeId = "discovery") {
  const baseUrl = getCalEventUrl(eventTypeId);

  const params = new URLSearchParams();

  if (lead.name) params.set("name", lead.name);
  if (lead.email) params.set("email", lead.email);
  if (lead.id) params.set("lead_id", lead.id);
  if (salesperson.id) params.set("salesperson_id", salesperson.id);

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}





