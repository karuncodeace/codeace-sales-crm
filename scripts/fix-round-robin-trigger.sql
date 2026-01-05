-- Fix Round Robin Trigger to Respect Manual Assignments
-- This script ensures that database triggers only apply round robin when assigned_to is NULL
-- Run this in your Supabase SQL editor

-- First, let's check if there's an existing trigger on leads_table for assignment
-- We'll create a function that only assigns if assigned_to is NULL

-- Function to assign leads using round robin (only if not already assigned)
CREATE OR REPLACE FUNCTION assign_lead_round_robin()
RETURNS TRIGGER AS $$
DECLARE
  next_sales_person_id UUID;
  total_sales_persons INTEGER;
BEGIN
  -- Only apply round robin if assigned_to is NULL (not manually assigned)
  IF NEW.assigned_to IS NULL THEN
    -- Get all active sales persons
    SELECT COUNT(*), 
           (SELECT id FROM sales_persons 
            ORDER BY 
              (SELECT COUNT(*) FROM leads_table WHERE assigned_to = sales_persons.id),
              id
            LIMIT 1)
    INTO total_sales_persons, next_sales_person_id
    FROM sales_persons;
    
    -- If we found a sales person, assign the lead
    IF next_sales_person_id IS NOT NULL THEN
      NEW.assigned_to := next_sales_person_id;
    END IF;
  END IF;
  
  -- If assigned_to is already set (manual assignment), do nothing - respect it
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (adjust trigger name if different)
DROP TRIGGER IF EXISTS assign_lead_round_robin_trigger ON leads_table;

-- Create the trigger that runs BEFORE INSERT
-- This ensures manual assignments are preserved
CREATE TRIGGER assign_lead_round_robin_trigger
  BEFORE INSERT ON leads_table
  FOR EACH ROW
  EXECUTE FUNCTION assign_lead_round_robin();

-- Also handle UPDATE case - only apply round robin if assigned_to is being set to NULL
CREATE OR REPLACE FUNCTION assign_lead_round_robin_on_update()
RETURNS TRIGGER AS $$
DECLARE
  next_sales_person_id UUID;
BEGIN
  -- Only apply round robin if assigned_to is being changed to NULL
  -- AND it was previously NULL (not being manually unassigned)
  IF NEW.assigned_to IS NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    -- Get the next sales person using round robin
    SELECT id INTO next_sales_person_id
    FROM sales_persons
    ORDER BY 
      (SELECT COUNT(*) FROM leads_table WHERE assigned_to = sales_persons.id),
      id
    LIMIT 1;
    
    -- If we found a sales person, assign the lead
    IF next_sales_person_id IS NOT NULL THEN
      NEW.assigned_to := next_sales_person_id;
    END IF;
  END IF;
  
  -- If assigned_to is being set to a value (manual assignment), respect it
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing update trigger if it exists
DROP TRIGGER IF EXISTS assign_lead_round_robin_update_trigger ON leads_table;

-- Create the trigger that runs BEFORE UPDATE
CREATE TRIGGER assign_lead_round_robin_update_trigger
  BEFORE UPDATE ON leads_table
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to))
  EXECUTE FUNCTION assign_lead_round_robin_on_update();

-- Note: After running this script, manual assignments will be preserved
-- Round robin will only apply when assigned_to is NULL

