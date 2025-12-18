import { google } from "googleapis";

/**
 * Creates a Google Calendar client using service account credentials
 * @returns {Promise<google.calendar_v3.Calendar>}
 */
export async function getCalendarClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_2) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON_2 environment variable is required"
    );
  }

  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_2);
  } catch (error) {
    console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON_2:", error);
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON_2 format");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const calendar = google.calendar({ version: "v3", auth });

  return calendar;
}

