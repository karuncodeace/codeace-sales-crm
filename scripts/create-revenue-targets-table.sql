-- Create revenue_targets table for storing period-based targets
-- Run this SQL in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS revenue_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id TEXT UNIQUE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly')),
  year INTEGER NOT NULL,
  month INTEGER,
  quarter INTEGER,
  target_leads INTEGER DEFAULT 0,
  target_calls INTEGER DEFAULT 0,
  target_meetings INTEGER DEFAULT 0,
  target_prospects INTEGER DEFAULT 0,
  target_proposals INTEGER DEFAULT 0,
  target_converted INTEGER DEFAULT 0,
  target_revenue DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on period_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_revenue_targets_period_id ON revenue_targets(period_id);

-- Create index on period_type, year for filtering
CREATE INDEX IF NOT EXISTS idx_revenue_targets_period ON revenue_targets(period_type, year);

-- Add RLS (Row Level Security) policies
ALTER TABLE revenue_targets ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read targets
CREATE POLICY "Admins can read revenue targets"
  ON revenue_targets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can insert/update targets
CREATE POLICY "Admins can insert revenue targets"
  ON revenue_targets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update revenue targets"
  ON revenue_targets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Note: If your auth.uid() doesn't match users.id, you may need to adjust the policies
-- based on your authentication setup. The API routes handle authorization server-side,
-- so these RLS policies are an additional layer of security.

