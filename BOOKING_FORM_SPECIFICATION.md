# Booking Form Specification

## Overview
The booking form is a multi-step process that allows sales team members to schedule meetings with leads. It integrates with Google Calendar and creates calendar events with Google Meet links.

## User Flow

### 1. Initiation
- **Entry Point**: From the lead detail page (`/leads/[slug]/page.js`)
- **Trigger**: User clicks "Schedule Meeting" button in the "Connect" dropdown menu
- **Component**: `BookMeetingButton` (`app/components/buttons/bookMeetingbtn.jsx`)

### 2. Call Type Selection
- **Modal**: Opens a modal with two call type options:
  - **Demo Meeting** (`demo-call`)
  - **Discussion Meeting** (`discussion-call`)
- **Action**: User selects a call type, which navigates to `/book/[slug]` where `slug` is the call type identifier

### 3. Booking Page (`/book/[slug]/page.jsx`)
The booking page consists of three main sections:

#### A. Calendar Component
- **Purpose**: Date selection
- **Default**: Today's date is pre-selected
- **Component**: `Calendar` (`app/book/[slug]/components/calender.jsx`)
- **Behavior**: User can select any available date

#### B. Slot Picker
- **Purpose**: Time slot selection
- **Component**: `SlotPicker` (`app/book/[slug]/components/SlotPicker.jsx`)
- **Data Source**: Fetches available slots via `useSlots` hook based on:
  - Selected date
  - Event type configuration
  - Existing bookings (conflicts are filtered out)
- **Display**: Shows available time slots for the selected date
- **Selection**: User clicks a time slot to select it

#### C. Booking Form
- **Purpose**: Collects attendee information
- **Component**: `BookingForm` (`app/book/[slug]/components/BookingForm.jsx`)
- **State**: Form is disabled until a time slot is selected

## Booking Form Fields

### 1. Lead Selection (Required)
- **Field Type**: Searchable dropdown with autocomplete
- **Search Capabilities**: 
  - Search by Lead ID
  - Search by Lead Name
  - Search by Contact Name
  - Search by Email
  - Search by Phone
- **Display Format**: `{leadId}, {contactName}, {leadName}`
- **Filtering**: 
  - Excludes leads with status: "Disqualified", "Junk", "Junk Lead"
  - Real-time filtering as user types
- **Auto-fill Behavior**: 
  - When a lead is selected, automatically fills:
    - Email field (from lead's email)
    - Phone field (from lead's phone)
- **Validation**: 
  - Required field
  - Must select a lead from the dropdown

### 2. Email (Required)
- **Field Type**: Email input
- **Auto-fill**: Populated when lead is selected
- **Validation**: 
  - Required field
  - Must be valid email format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- **Editable**: User can modify the auto-filled value

### 3. Phone (Optional)
- **Field Type**: Tel input
- **Auto-fill**: Populated when lead is selected
- **Validation**: 
  - Optional field
  - If provided, must be valid phone format (regex: `/^[\d\s\-\+\(\)]+$/`)
- **Editable**: User can modify the auto-filled value

### 4. Email Confirmation Checkbox (Optional)
- **Field Type**: Checkbox
- **Label**: "Send confirmation email to the attendee"
- **Purpose**: Controls whether a confirmation email is sent to the invitee
- **Default**: Unchecked (`is_email_required: false`)
- **Behavior**: 
  - When **checked** (toggled ON): Sends `is_email_required: true` to the API
  - When **unchecked** (toggled OFF): Sends `is_email_required: false` to the API
- **Implementation**: 
  - Checkbox state is bound to `formData.is_email_required`
  - `onChange` handler sets `is_email_required: e.target.checked` (boolean)
  - Form submission sends the boolean value directly: `is_email_required: formData.is_email_required`
  - Server-side validates and stores: `is_email_required: requestBody.is_email_required === true ? true : false`

## Form Validation

### Client-Side Validation
1. **Time Slot**: Must be selected before form submission
2. **Lead**: Required, must be selected from dropdown
3. **Email**: Required, must be valid email format
4. **Phone**: Optional, but if provided must be valid format

### Validation Flow
```javascript
validate() {
  - Check email is present and valid
  - Check phone (if provided) is valid
  - Check lead_id is selected
  - Return true if all validations pass
}
```

### Error Display
- **Field-level errors**: Displayed below each field in red
- **Submit errors**: Displayed in a red alert box above submit button
- **Real-time**: Errors clear as user corrects the field

## Form Submission Flow

### 1. Pre-submission Checks
```javascript
handleSubmit() {
  1. Prevent default form submission
  2. Check if selectedSlot exists
  3. Run validate() function
  4. If validation fails, show errors and return
}
```

### 2. Data Preparation
```javascript
- Get user's timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
- Find selected lead from leads array
- Extract lead name and contact name
- Prepare request payload:
  {
    eventTypeId: eventType.id,
    start: selectedSlot.start (ISO string),
    end: selectedSlot.end (ISO string),
    timezone: user's timezone,
    invitee: {
      name: leadName,
      email: formData.email.trim(),
      phone: formData.phone.trim() || null
    },
    lead_id: formData.lead_id,
    invitiee_contact_name: contactName,
    is_email_required: formData.is_email_required
  }
```

### 3. API Request
- **Endpoint**: `POST /api/bookings`
- **Headers**: `Content-Type: application/json`
- **Body**: Prepared payload (see above)

### 4. Server-Side Processing (`lib/bookings/createBooking.js`)

#### A. Request Validation
- Validates request body structure
- Validates required fields (eventTypeId, start, end, timezone, invitee)
- Validates date formats (ISO strings)
- Validates start < end
- Validates start is not in the past

#### B. Event Type & User Fetching
- Fetches event type from `event_types` table
- Fetches host user from `users` table
- Validates event type exists

#### C. Conflict Checking
- Calculates buffered time range:
  - `bufferedStart = start - buffer_before`
  - `bufferedEnd = end + buffer_after`
- Checks for existing bookings in the buffered time range
- If conflict exists, throws error: "Selected slot is no longer available"

#### D. Booking Creation
- Inserts booking into `bookings` table:
  ```sql
  {
    event_type_id: eventTypeId,
    host_user_id: eventType.user_id,
    start_time: startDate (ISO),
    end_time: endDate (ISO),
    timezone: timezone,
    status: "scheduled",
    invitee_name: invitee.name,
    invitee_email: invitee.email,
    invitee_phone: invitee.phone,
    lead_id: lead_id,
    invitiee_contact_name: contactName,
    is_email_required: is_email_required
  }
  ```

#### E. Activity Logging
- Logs booking creation action in `booking_actions` table:
  ```sql
  {
    booking_id: booking.id,
    action: "created",
    performed_by: eventType.user_id
  }
  ```

#### F. Google Calendar Integration
- Creates Google Calendar event via `createCalendarEventWithMeet()`
- Includes:
  - Event title (from event type)
  - Start/end times
  - Attendee email
  - Google Meet link
  - Timezone information
- If email confirmation is required (`is_email_required: true`), sends confirmation email

### 5. Success Handling

#### Client-Side (`BookingForm.jsx`)
```javascript
onBookingSuccess(bookingData) {
  1. Reset form fields
  2. Clear errors
  3. Call parent's onBookingSuccess callback
}
```

#### Page-Level (`/book/[slug]/page.jsx`)
```javascript
handleBookingSuccess(data) {
  1. Remove booked slot from available slots (removeBookedSlot)
  2. Set bookingSuccess = true
  3. Set bookingData = data
  4. Show Success modal
}
```

#### Success Modal (`Success.jsx`)
- Displays booking confirmation
- Shows booking details
- Provides options to:
  - Close modal
  - Book another meeting

## Error Handling

### Client-Side Errors
1. **Validation Errors**: Displayed inline below fields
2. **Submit Errors**: Displayed in alert box
3. **API Errors**: Displayed in alert box with error message from server

### Server-Side Errors
1. **400 Bad Request**: 
   - Invalid request body
   - Missing required fields
   - Invalid date formats
   - Slot conflict detected
   - Past date selected

2. **404 Not Found**: 
   - Event type not found
   - Host user not found

3. **500 Internal Server Error**: 
   - Database errors
   - Google Calendar API errors
   - Unexpected errors

### Error Messages
- User-friendly error messages are returned from API
- Client displays error messages in red alert boxes
- Field-level errors show specific validation messages

## State Management

### Form State (`BookingForm.jsx`)
```javascript
formData: {
  email: string,
  phone: string,
  lead_id: string,
  is_email_required: boolean
}

leadSearchTerm: string
isLeadDropdownOpen: boolean
errors: { [field: string]: string }
loading: boolean
submitError: string | null
```

### Page State (`/book/[slug]/page.jsx`)
```javascript
selectedDate: string (YYYY-MM-DD)
selectedSlot: { start: ISO string, end: ISO string } | null
bookingSuccess: boolean
bookingData: object | null
```

## Data Flow Diagram

```
User clicks "Schedule Meeting"
    ↓
BookMeetingButton opens modal
    ↓
User selects call type (demo-call/discussion-call)
    ↓
Navigate to /book/[slug]
    ↓
BookingPage loads:
  - Fetches event type (useEventType hook)
  - Fetches available slots (useSlots hook)
  - Renders Calendar, SlotPicker, BookingForm
    ↓
User selects date → Updates selectedDate
    ↓
User selects time slot → Updates selectedSlot
    ↓
BookingForm enables → User fills form
    ↓
User selects lead → Auto-fills email/phone
    ↓
User submits form → handleSubmit()
    ↓
POST /api/bookings
    ↓
Server validates → Checks conflicts → Creates booking
    ↓
Creates Google Calendar event → Sends email (if required)
    ↓
Returns booking data
    ↓
onBookingSuccess() → Shows Success modal
    ↓
User closes modal → Ready for next booking
```

## Key Features

### 1. Lead Integration
- Seamless integration with CRM leads
- Auto-fills contact information
- Links booking to lead record

### 2. Conflict Prevention
- Real-time conflict checking
- Buffer time support (before/after meeting)
- Prevents double-booking

### 3. Google Calendar Integration
- Automatic calendar event creation
- Google Meet link generation
- Email notifications (optional)

### 4. User Experience
- Progressive disclosure (date → time → details)
- Real-time validation
- Clear error messages
- Success confirmation
- Form reset after booking

### 5. Data Integrity
- Required field validation
- Email format validation
- Phone format validation
- Lead selection validation
- Time slot validation

## Technical Dependencies

### Frontend
- React (Next.js)
- SWR (data fetching)
- Lucide React (icons)
- React Hot Toast (notifications)

### Backend
- Next.js API Routes
- Supabase (database)
- Google Calendar API
- Google Meet API

### Database Tables
- `event_types`: Event type configurations
- `bookings`: Booking records
- `booking_actions`: Booking activity log
- `leads`: Lead records
- `users`: User records

## Future Enhancements (Potential)

1. **Recurring Meetings**: Support for recurring booking patterns
2. **Custom Fields**: Additional form fields per event type
3. **Reminder Notifications**: SMS/Email reminders before meeting
4. **Rescheduling**: Allow users to reschedule existing bookings
5. **Cancellation**: Allow users to cancel bookings
6. **Multiple Attendees**: Support for multiple invitees
7. **Time Zone Selection**: Explicit timezone selection for international leads
8. **Booking Templates**: Pre-filled forms for common scenarios
