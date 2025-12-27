-- Create sales_targets, revenue_transactions, and sales_metrics_daily tables
-- Run this SQL in your Supabase SQL editor

-- 1. Create sales_targets table (exact schema as provided)
CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Funnel Targets
  target_leads INTEGER NOT NULL DEFAULT 0,
  target_calls INTEGER NOT NULL DEFAULT 0,
  target_meetings INTEGER NOT NULL DEFAULT 0,
  target_prospects INTEGER NOT NULL DEFAULT 0,
  target_proposals INTEGER NOT NULL DEFAULT 0,
  target_converted INTEGER NOT NULL DEFAULT 0,
  -- Revenue Target
  target_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(period_type, period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_targets_period ON sales_targets(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_sales_targets_dates ON sales_targets(period_start, period_end);

-- 2. Create revenue_transactions table
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads_table(id) ON DELETE CASCADE,
  sales_person_id TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'closed', 'cancelled')),
  closed_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT closed_date_required_when_closed CHECK (
    (status = 'closed' AND closed_date IS NOT NULL) OR
    (status != 'closed')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_lead ON revenue_transactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_salesperson ON revenue_transactions(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_status ON revenue_transactions(status);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_closed_date ON revenue_transactions(closed_date);

-- 3. Create sales_metrics_daily table
CREATE TABLE IF NOT EXISTS sales_metrics_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL UNIQUE,
  leads INTEGER DEFAULT 0 CHECK (leads >= 0),
  calls INTEGER DEFAULT 0 CHECK (calls >= 0),
  meetings INTEGER DEFAULT 0 CHECK (meetings >= 0),
  prospects INTEGER DEFAULT 0 CHECK (prospects >= 0),
  proposals INTEGER DEFAULT 0 CHECK (proposals >= 0),
  converted INTEGER DEFAULT 0 CHECK (converted >= 0),
  new_pipeline_value DECIMAL(15, 2) DEFAULT 0 CHECK (new_pipeline_value >= 0),
  closed_revenue DECIMAL(15, 2) DEFAULT 0 CHECK (closed_revenue >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_sales_metrics_daily_date ON sales_metrics_daily(metric_date);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_metrics_daily ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for sales_targets (Admin only)
CREATE POLICY "Admins can read sales targets"
  ON sales_targets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert sales targets"
  ON sales_targets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update sales targets"
  ON sales_targets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 6. RLS Policies for revenue_transactions (Admin only)
CREATE POLICY "Admins can read revenue transactions"
  ON revenue_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert revenue transactions"
  ON revenue_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 7. RLS Policies for sales_metrics_daily (Read-only for admins, system writes only)
CREATE POLICY "Admins can read sales metrics daily"
  ON sales_metrics_daily
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Note: sales_metrics_daily should only be written by system triggers/functions
-- No direct insert/update policies for users

-- 8. Add updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_sales_targets_updated_at ON sales_targets;
CREATE TRIGGER update_sales_targets_updated_at
  BEFORE UPDATE ON sales_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_revenue_transactions_updated_at ON revenue_transactions;
CREATE TRIGGER update_revenue_transactions_updated_at
  BEFORE UPDATE ON revenue_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_metrics_daily_updated_at ON sales_metrics_daily;
CREATE TRIGGER update_sales_metrics_daily_updated_at
  BEFORE UPDATE ON sales_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: After running this script, also run:
-- scripts/create-sales-metrics-functions.sql
-- to set up the automatic metrics tracking triggers

