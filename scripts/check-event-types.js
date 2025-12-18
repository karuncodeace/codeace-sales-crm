/**
 * Helper script to check event types in the database
 * Run with: node scripts/check-event-types.js
 * 
 * This will help you see what slugs are available for testing
 */

// Note: This is a reference script. You'll need to run this in your Supabase dashboard
// or create a proper script with your Supabase credentials

console.log(`
To check your event types and slugs, run this SQL in your Supabase SQL Editor:

SELECT id, name, slug, active, duration_minutes, user_id
FROM event_types
WHERE active = true;

If you don't have any event types with slugs, you can create one:

INSERT INTO event_types (name, slug, duration_minutes, user_id, active, buffer_before, buffer_after)
VALUES 
  ('Discovery Call', 'discovery-call', 30, 'YOUR_USER_ID', true, 0, 0),
  ('Sales Call', 'sales-call', 60, 'YOUR_USER_ID', true, 0, 0);

Make sure to:
1. Replace 'YOUR_USER_ID' with an actual user ID from your users table
2. Ensure the slug column exists: ALTER TABLE event_types ADD COLUMN slug TEXT UNIQUE;
`);

