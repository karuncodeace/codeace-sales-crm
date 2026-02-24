## Booking Event Payload Specification

This document explains the JSON payload sent from the booking UI to the backend when an event is booked.

### 1. Endpoint

- **Method**: `POST`
- **URL**: `/api/bookings`
- **Consumer**: `BookingForm` (`app/book/[slug]/components/BookingForm.jsx`)
- **Handler**: `createBooking` (`lib/bookings/createBooking.js`)

### 2. Top‑level Payload Shape

```json
{
  "eventTypeId": "string",
  "start": "ISO-8601 datetime string",
  "end": "ISO-8601 datetime string",
  "timezone": "IANA timezone string",
  "invitee": {
    "name": "string",
    "email": "string",
    "phone": "string|null"
  },
  "lead_id": "string|null",
  "invitiee_contact_name": "string|null",
  "is_email_required": true,
  "host_user_id": "string|null",
  "event-title": "string",
  "event-description": "string"
}
```

### 3. Field‑by‑Field Details

- **`eventTypeId`** `string` (required)  
  - ID of the event type being booked.  
  - Comes from `eventType.id`.  
  - Server validates existence and active status in `event_types`.

- **`start`** `string` (required)  
  - Start time of the booking, in ISO 8601 (UTC) format, e.g. `"2026-02-20T09:00:00.000Z"`.  
  - Comes from `selectedSlot.start`.  
  - Must be a valid future datetime and strictly before `end`.

- **`end`** `string` (required)  
  - End time of the booking, ISO 8601 string from `selectedSlot.end`.  
  - Must be a valid datetime after `start`.

- **`timezone`** `string` (required)  
  - Attendee’s local timezone, e.g. `"Asia/Kolkata"`.  
  - Derived from `Intl.DateTimeFormat().resolvedOptions().timeZone`.  
  - Used when creating the Google Calendar event.

- **`invitee`** `object` (required)
  - **`invitee.name`** `string` (required)  
    - Display name for the attendee.  
    - Derived from the selected lead: `lead.name || lead.lead_name || "Guest"`.
  - **`invitee.email`** `string` (required)  
    - Email address of the attendee.  
    - From `formData.email` (validated on client and server).
  - **`invitee.phone`** `string|null` (optional)  
    - Phone number of the attendee, from `formData.phone`.  
    - Sent as `null` if not provided.

- **`lead_id`** `string|null` (required logically, nullable in schema)  
  - CRM lead identifier associated with this booking.  
  - Comes from `formData.lead_id` (user must select a lead in the UI).  
  - Stored in `bookings.lead_id` and used for linking back to the lead.

- **`invitiee_contact_name`** `string|null`  
  - Contact person’s name for the lead, if distinct from the lead name.  
  - Derived from `selectedLead.contactName || selectedLead.contact_name || null`.  
  - Stored as `bookings.invitiee_contact_name`.

- **`is_email_required`** `boolean`  
  - Controls whether a confirmation email should be sent.  
  - Bound to the checkbox in the form (`formData.is_email_required`).  
  - Server normalizes to a strict boolean: `requestBody.is_email_required === true`.

- **`host_user_id`** `string|null`  
  - Optional hint about who is hosting the meeting.  
  - Derived on the client from lead fields when available:  
    `assigned_to | assignedTo | sales_person_id | salesperson_id`.  
  - On the server, this value is interpreted and mapped to a `sales_persons.id` (`SP-...`) for `bookings.host_user_id`.  
  - If omitted or unmappable, server falls back to:  
    1. `eventType.user_id` mapped to `sales_persons.id`, else  
    2. First `sales_persons` row.

- **`event-title`** `string`  
  - Human‑readable meeting title shown to the attendee and in calendar.  
  - Depends on the booking slug:  
    - `discovery-call` → `"Discovery Call – Understanding Your Requirements"`  
    - `demo-call` → `"Live Demo – Solution Walkthrough"`  
    - `discussion-call` → `"Solution Discussion & Clarifications"`  
    - Fallback: `eventType.title || slugToTitle(slug)`.  
  - Stored as `bookings.event_title` (server also accepts `eventTitle` / `event_title`).

- **`event-description`** `string`  
  - Detailed description of the meeting’s purpose.  
  - Predefined per slug, e.g. discovery/demo/discussion texts.  
  - Stored as `bookings.event_description` (server also accepts `eventDescription` / `event_description`).

### 4. Example Payload

```json
{
  "eventTypeId": "evt-123",
  "start": "2026-02-20T09:00:00.000Z",
  "end": "2026-02-20T09:30:00.000Z",
  "timezone": "Asia/Kolkata",
  "invitee": {
    "name": "Acme Corp – John Doe",
    "email": "john.doe@acme.com",
    "phone": "+91 98765 43210"
  },
  "lead_id": "LEAD-456",
  "invitiee_contact_name": "John Doe",
  "is_email_required": true,
  "host_user_id": "SP-001",
  "event-title": "Discovery Call – Understanding Your Requirements",
  "event-description": "This session is intended to gain a comprehensive understanding of your business objectives, operational processes, and key challenges..."
}
```

### 5. How the Server Uses the Payload

- Validates required fields and time ranges (`validateRequest`).
- Resolves the effective host sales person ID and writes `bookings.host_user_id`.
- Checks for slot conflicts with buffered ranges before inserting.
- Inserts into `bookings` with:
  - `event_type_id`, `start_time`, `end_time`, `timezone`, `status`,
  - invitee fields, `lead_id`, `invitiee_contact_name`,
  - `is_email_required`, `event_title`, `event_description`.
- Creates a Google Calendar event (if `GOOGLE_SERVICE_ACCOUNT_JSON_2` is configured) using:
  - `event-title` / `event-description`,
  - `start`, `end`, `timezone`, and `invitee` fields.
