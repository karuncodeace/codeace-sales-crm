import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../../lib/crm/auth";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based filtering
    const crmUser = await getCrmUser();
    
    // If no CRM user found, return empty data
    if (!crmUser) {
      return Response.json({
        series: [],
        labels: [],
        total: 0
      });
    }

    // Get filtered query based on role (respects RLS policies)
    let query = getFilteredQuery(supabase, "leads_table", crmUser);
    
    // Fetch all leads with their lead_source
    const { data: leads, error } = await query.select("lead_source");

    if (error) {
      return Response.json(
        { error: "Failed to fetch lead sources data" },
        { status: 500 }
      );
    }

    // Handle null or undefined data
    if (!leads || !Array.isArray(leads)) {
      return Response.json({
        series: [],
        labels: [],
        total: 0
      });
    }

    // Group leads by lead_source and count
    const sourceCounts = {};
    let totalLeads = 0;

    leads.forEach((lead) => {
      const source = lead.lead_source || "Unknown";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      totalLeads++;
    });

    // Convert to arrays for chart (sorted by count, descending)
    const sortedSources = Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({
        source,
        count,
        percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
      }));

    // Extract labels and series (percentages)
    const labels = sortedSources.map(item => item.source);
    const series = sortedSources.map(item => item.percentage);

    // If no leads, return empty data
    if (totalLeads === 0) {
      return Response.json({
        series: [],
        labels: [],
        total: 0
      });
    }

    const data = {
      series,
      labels,
      total: totalLeads
    };

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch lead sources data" },
      { status: 500 }
    );
  }
}













