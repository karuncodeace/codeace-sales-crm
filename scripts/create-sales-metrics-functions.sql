-- Database function for manual updates to sales_metrics_daily
-- Run this SQL in your Supabase SQL editor
-- 
-- NOTE: Automatic triggers have been removed. 
-- sales_metrics_daily must be updated manually via API calls or scheduled jobs.

-- 1. Create function to upsert daily metrics (for manual updates)
CREATE OR REPLACE FUNCTION upsert_daily_metrics(
  p_metric_date DATE,
  p_leads INTEGER DEFAULT 0,
  p_calls INTEGER DEFAULT 0,
  p_meetings INTEGER DEFAULT 0,
  p_prospects INTEGER DEFAULT 0,
  p_proposals INTEGER DEFAULT 0,
  p_converted INTEGER DEFAULT 0,
  p_new_pipeline_value DECIMAL(15, 2) DEFAULT 0,
  p_closed_revenue DECIMAL(15, 2) DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sales_metrics_daily (
    metric_date,
    leads,
    calls,
    meetings,
    prospects,
    proposals,
    converted,
    new_pipeline_value,
    closed_revenue
  )
  VALUES (
    p_metric_date,
    p_leads,
    p_calls,
    p_meetings,
    p_prospects,
    p_proposals,
    p_converted,
    p_new_pipeline_value,
    p_closed_revenue
  )
  ON CONFLICT (metric_date)
  DO UPDATE SET
    leads = sales_metrics_daily.leads + EXCLUDED.leads,
    calls = sales_metrics_daily.calls + EXCLUDED.calls,
    meetings = sales_metrics_daily.meetings + EXCLUDED.meetings,
    prospects = sales_metrics_daily.prospects + EXCLUDED.prospects,
    proposals = sales_metrics_daily.proposals + EXCLUDED.proposals,
    converted = sales_metrics_daily.converted + EXCLUDED.converted,
    new_pipeline_value = sales_metrics_daily.new_pipeline_value + EXCLUDED.new_pipeline_value,
    closed_revenue = sales_metrics_daily.closed_revenue + EXCLUDED.closed_revenue,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. Grant execute permission on function
GRANT EXECUTE ON FUNCTION upsert_daily_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_daily_metrics TO service_role;

-- Note: sales_metrics_daily must be updated manually via:
-- - API calls using the upsert_daily_metrics function
-- - Scheduled background jobs
-- - Manual data entry
-- Automatic triggers have been removed as per requirements.

