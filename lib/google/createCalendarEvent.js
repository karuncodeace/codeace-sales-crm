import { getCalendarClient } from "./calendarClient";

/**
 * Creates a Google Calendar event with Google Meet link
 * @param {Object} params
 * @param {string} params.summary - Event title
 * @param {string} params.description - Event description
 * @param {string} params.startTime - ISO string for start time
 * @param {string} params.endTime - ISO string for end time
 * @param {string} params.timezone - Timezone (e.g., "America/New_York")
 * @param {string} params.inviteeEmail - Email of the attendee
 * @param {string} params.inviteeName - Name of the attendee
 * @param {string} params.bookingId - Booking ID for requestId
 * @returns {Promise<{eventId: string, meetingLink: string}>}
 */
export async function createCalendarEventWithMeet({
  summary,
  description,
  startTime,
  endTime,
  timezone,
  inviteeEmail,
  inviteeName,
  bookingId,
}) {
  const calendar = await getCalendarClient();

  const event = {
    summary: summary || "Discovery Call",
    description: description || "Scheduled via CRM",
    start: {
      dateTime: startTime,
      timeZone: timezone,
    },
    end: {
      dateTime: endTime,
      timeZone: timezone,
    },
    attendees: [
      { email: inviteeEmail, displayName: inviteeName || inviteeEmail },
    ],
    conferenceData: {
      createRequest: {
        requestId: `meet-${bookingId}-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 30 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  try {
    console.log("📅 Inserting calendar event with Meet link...");
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
      // Note: sendUpdates is not used because service accounts cannot send invitations
      // without Domain-Wide Delegation. The event will still be created with attendees
      // and they can see it in their calendar, but no email will be sent automatically.
    });

    console.log("📅 Calendar event inserted successfully");
    const eventId = response.data.id;
    
    // Extract Google Meet link from response
    // Try multiple possible locations for the Meet link
    const meetingLink =
      response.data.conferenceData?.entryPoints?.[0]?.uri ||
      response.data.hangoutLink ||
      null;

    console.log("🔗 Meeting link extraction:", {
      hasConferenceData: !!response.data.conferenceData,
      entryPointsCount: response.data.conferenceData?.entryPoints?.length || 0,
      firstEntryPoint: response.data.conferenceData?.entryPoints?.[0],
      hangoutLink: response.data.hangoutLink,
      extractedMeetingLink: meetingLink,
    });

    if (!meetingLink) {
      console.warn(
        "⚠️ Google Meet link not found in response. Full response data:",
        JSON.stringify(
          {
            id: response.data.id,
            hasConferenceData: !!response.data.conferenceData,
            conferenceData: response.data.conferenceData,
            entryPoints: response.data.conferenceData?.entryPoints,
            hangoutLink: response.data.hangoutLink,
          },
          null,
          2
        )
      );
    } else {
      console.log("✅ Google Meet link extracted successfully:", meetingLink);
    }

    return {
      eventId,
      meetingLink,
    };
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw new Error(
      `Failed to create Google Calendar event: ${error.message}`
    );
  }
}

