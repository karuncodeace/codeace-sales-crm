import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

/**
 * GET: Detailed check of leads and their assigned_to values
 * This helps debug why leads aren't showing up
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (crmUser.role !== "sales" || !crmUser.salesPersonId) {
      return Response.json({ 
        error: "This endpoint is for sales users only" 
      }, { status: 403 });
    }

    const salesPersonId = crmUser.salesPersonId;

    // Get ALL leads to see what's in the database
    const { data: allLeads, error: allLeadsError } = await supabase
      .from("leads_table")
      .select("id, lead_name, assigned_to, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    // Get leads that should match (using exact match)
    const { data: matchingLeads, error: matchingError } = await supabase
      .from("leads_table")
      .select("id, lead_name, assigned_to, status, created_at")
      .eq("assigned_to", salesPersonId);

    // Also try as string comparison
    const { data: stringMatchLeads, error: stringMatchError } = await supabase
      .from("leads_table")
      .select("id, lead_name, assigned_to, status, created_at")
      .eq("assigned_to", String(salesPersonId));

    // Get unique assigned_to values to see what's actually in the database
    const uniqueAssignedTo = allLeads 
      ? [...new Set(allLeads.map(l => l.assigned_to).filter(Boolean))]
      : [];

    // Check for leads with similar but not exact matches
    const similarMatches = allLeads?.filter(lead => {
      if (!lead.assigned_to) return false;
      const assigned = String(lead.assigned_to).trim();
      const target = String(salesPersonId).trim();
      return assigned.toLowerCase() === target.toLowerCase() || 
             assigned.includes(target) || 
             target.includes(assigned);
    }) || [];

    return Response.json({
      success: true,
      salesPersonId: salesPersonId,
      salesPersonIdType: typeof salesPersonId,
      queryResults: {
        exactMatch: {
          count: matchingLeads?.length || 0,
          leads: matchingLeads || [],
          error: matchingError?.message,
        },
        stringMatch: {
          count: stringMatchLeads?.length || 0,
          leads: stringMatchLeads || [],
          error: stringMatchError?.message,
        },
      },
      databaseState: {
        totalLeadsChecked: allLeads?.length || 0,
        uniqueAssignedToValues: uniqueAssignedTo,
        similarMatches: similarMatches.map(l => ({
          id: l.id,
          name: l.lead_name,
          assigned_to: l.assigned_to,
          assigned_to_type: typeof l.assigned_to,
          assigned_to_string: String(l.assigned_to),
        })),
        allLeadsSample: allLeads?.slice(0, 10).map(l => ({
          id: l.id,
          name: l.lead_name,
          assigned_to: l.assigned_to,
          assigned_to_type: typeof l.assigned_to,
          assigned_to_string: String(l.assigned_to),
          status: l.status,
        })) || [],
      },
      diagnostics: {
        comparison: {
          salesPersonId: salesPersonId,
          salesPersonIdAsString: String(salesPersonId),
          salesPersonIdTrimmed: String(salesPersonId).trim(),
        },
        potentialIssues: [
          !matchingLeads || matchingLeads.length === 0 ? "No exact matches found" : null,
          uniqueAssignedTo.length === 0 ? "No leads have assigned_to values" : null,
          uniqueAssignedTo.length > 0 && !uniqueAssignedTo.includes(salesPersonId) 
            ? `assigned_to values in DB don't match SP-02. Found: ${JSON.stringify(uniqueAssignedTo)}` 
            : null,
          similarMatches.length > 0 && matchingLeads?.length === 0 
            ? "Found similar matches but exact query failed - possible data type issue" 
            : null,
        ].filter(Boolean),
      },
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

