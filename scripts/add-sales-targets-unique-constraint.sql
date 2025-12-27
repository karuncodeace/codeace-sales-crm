-- Add unique constraint to sales_targets table if it doesn't exist
-- Run this SQL in your Supabase SQL editor

-- Check if constraint exists and add it if not
DO $$
BEGIN
  -- Check if the unique constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'sales_targets_period_type_period_start_key'
  ) THEN
    -- Add unique constraint on (period_type, period_start)
    ALTER TABLE sales_targets 
    ADD CONSTRAINT sales_targets_period_type_period_start_key 
    UNIQUE (period_type, period_start);
    
    RAISE NOTICE 'Unique constraint added successfully';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

