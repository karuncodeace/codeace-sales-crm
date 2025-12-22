/**
 * Script to setup discovery-call event type in the database
 * Run this to ensure the discovery-call event type exists
 * 
 * Usage: This is a reference. Run the SQL commands in your Supabase SQL Editor
 */

console.log(`
=== Setup Discovery Call Event Type ===

1. First, ensure the slug column exists:
   ALTER TABLE event_types ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

2. Get a user ID to use:
   SELECT id, email FROM users LIMIT 1;

3. Create the discovery-call event type (replace USER_ID with actual ID):
   INSERT INTO event_types (name, slug, duration_minutes, user_id, active, buffer_before, buffer_after)
   VALUES 
     ('Discovery Call', 'discovery-call', 30, 'USER_ID', true, 0, 0)
   ON CONFLICT (slug) DO UPDATE 
   SET active = true, name = EXCLUDED.name;

4. Verify it was created:
   SELECT id, name, slug, active, duration_minutes 
   FROM event_types 
   WHERE slug = 'discovery-call';

5. Test the API endpoint:
   Visit: http://localhost:3000/api/event-types?slug=discovery-call
   
   Should return the event type data, not an error.

6. Test the booking page:
   Visit: http://localhost:3000/book/discovery-call
   
   Should load the booking page successfully.
`);

