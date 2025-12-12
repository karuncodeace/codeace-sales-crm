// Utility to build a Cal.com booking URL with encoded query params
// Expects lead: { id, name, email } and salesperson: { id }
// Returns a string URL

export function generateCalUrl(lead = {}, salesperson = {}) {
  const baseUrl = "https://cal.com/karun-karthikeyan-8wsv1t/15min";

  const params = new URLSearchParams();

  if (lead.name) params.set("name", lead.name);
  if (lead.email) params.set("email", lead.email);
  if (lead.id) params.set("lead_id", lead.id);
  if (salesperson.id) params.set("salesperson_id", salesperson.id);

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}





