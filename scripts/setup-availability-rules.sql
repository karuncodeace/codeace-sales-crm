-- Setup Availability Rules for Discovery Call Event Type
-- Run this in your Supabase SQL Editor

-- First, get the user_id from your event_types table
-- Replace 'discovery-call' with your actual slug if different
SELECT 
    et.id as event_type_id,
    et.name as event_type_name,
    et.user_id,
    u.email as user_email
FROM event_types et
JOIN users u ON et.user_id = u.id
WHERE et.slug = 'discovery-call';

-- Then create availability rules for that user_id
-- This sets up Monday-Friday, 10:00 AM - 5:00 PM availability
-- Replace 'YOUR_USER_ID' with the actual user_id from above query

-- Example: Create availability for Monday (day_of_week: 1 = Monday, 0 = Sunday)
INSERT INTO availability_rules (user_id, day_of_week, start_time, end_time)
VALUES 
  -- Monday
  ('YOUR_USER_ID', 1, '10:00:00', '17:00:00'),
  -- Tuesday
  ('YOUR_USER_ID', 2, '10:00:00', '17:00:00'),
  -- Wednesday
  ('YOUR_USER_ID', 3, '10:00:00', '17:00:00'),
  -- Thursday
  ('YOUR_USER_ID', 4, '10:00:00', '17:00:00'),
  -- Friday
  ('YOUR_USER_ID', 5, '10:00:00', '17:00:00')
ON CONFLICT DO NOTHING;

-- Verify the rules were created
SELECT 
    ar.id,
    ar.user_id,
    ar.day_of_week,
    CASE ar.day_of_week
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,
    ar.start_time,
    ar.end_time
FROM availability_rules ar
WHERE ar.user_id = 'YOUR_USER_ID'
ORDER BY ar.day_of_week;

-- Note: day_of_week values:
-- 0 = Sunday
-- 1 = Monday
-- 2 = Tuesday
-- 3 = Wednesday
-- 4 = Thursday
-- 5 = Friday
-- 6 = Saturday

