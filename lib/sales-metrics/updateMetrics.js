/**
 * Server-side utility to update sales_metrics_daily
 * This function should ONLY be called from server-side API routes
 * Never expose this to client-side code
 */

import { supabaseAdmin } from "../supabase/serverClient";

/**
 * Updates daily sales metrics using upsert pattern
 * @param {Object} metrics - Object containing metric values to increment
 * @param {number} metrics.leads - Number of leads to add (default: 0)
 * @param {number} metrics.calls - Number of calls to add (default: 0)
 * @param {number} metrics.meetings - Number of meetings to add (default: 0)
 * @param {number} metrics.prospects - Number of prospects to add (default: 0)
 * @param {number} metrics.proposals - Number of proposals to add (default: 0)
 * @param {number} metrics.converted - Number of converted deals to add (default: 0)
 * @param {number} metrics.closed_revenue - Revenue amount to add (default: 0)
 * @param {Date|string} date - Date for the metric (default: today)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateDailyMetrics(metrics = {}, date = null) {
  try {
    // Use admin client to bypass RLS (system-generated only)
    const supabase = supabaseAdmin();

    // Default to today if no date provided
    const metricDate = date 
      ? (date instanceof Date ? date.toISOString().split("T")[0] : date)
      : new Date().toISOString().split("T")[0];

    // Extract metric values (default to 0)
    const {
      leads = 0,
      calls = 0,
      meetings = 0,
      prospects = 0,
      proposals = 0,
      converted = 0,
      closed_revenue = 0,
    } = metrics;

    // Validate all values are non-negative
    const values = [leads, calls, meetings, prospects, proposals, converted, closed_revenue];
    if (values.some(val => val < 0 || isNaN(val))) {
      throw new Error("All metric values must be non-negative numbers");
    }

    // Use upsert to increment existing values or create new row
    // PostgreSQL ON CONFLICT with addition
    const { error } = await supabase.rpc("upsert_daily_metrics", {
      p_metric_date: metricDate,
      p_leads: leads,
      p_calls: calls,
      p_meetings: meetings,
      p_prospects: prospects,
      p_proposals: proposals,
      p_converted: converted,
      p_new_pipeline_value: 0, // Not used in this context
      p_closed_revenue: closed_revenue,
    });

    if (error) {
      // If RPC function doesn't exist, fall back to manual upsert
      if (error.code === "42883" || error.message.includes("function") || error.message.includes("does not exist")) {
        console.warn("upsert_daily_metrics function not found, using manual upsert");
        return await manualUpsertMetrics(supabase, metricDate, {
          leads,
          calls,
          meetings,
          prospects,
          proposals,
          converted,
          closed_revenue,
        });
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating daily metrics:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Manual upsert using Supabase client (fallback if RPC function doesn't exist)
 */
async function manualUpsertMetrics(supabase, metricDate, metrics) {
  try {
    // First, try to get existing row
    const { data: existing, error: fetchError } = await supabase
      .from("sales_metrics_daily")
      .select("*")
      .eq("metric_date", metricDate)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 = not found
      throw fetchError;
    }

    if (existing) {
      // Update existing row (increment values)
      const { error: updateError } = await supabase
        .from("sales_metrics_daily")
        .update({
          leads: (existing.leads || 0) + metrics.leads,
          calls: (existing.calls || 0) + metrics.calls,
          meetings: (existing.meetings || 0) + metrics.meetings,
          prospects: (existing.prospects || 0) + metrics.prospects,
          proposals: (existing.proposals || 0) + metrics.proposals,
          converted: (existing.converted || 0) + metrics.converted,
          closed_revenue: (parseFloat(existing.closed_revenue || 0) + parseFloat(metrics.closed_revenue || 0)).toString(),
        })
        .eq("metric_date", metricDate);

      if (updateError) throw updateError;
    } else {
      // Insert new row
      const { error: insertError } = await supabase
        .from("sales_metrics_daily")
        .insert({
          metric_date: metricDate,
          leads: metrics.leads || 0,
          calls: metrics.calls || 0,
          meetings: metrics.meetings || 0,
          prospects: metrics.prospects || 0,
          proposals: metrics.proposals || 0,
          converted: metrics.converted || 0,
          closed_revenue: metrics.closed_revenue || 0,
        });

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error("Error in manual upsert metrics:", error);
    return { success: false, error: error.message };
  }
}

