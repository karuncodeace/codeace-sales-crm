import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";

/**
 * GET - Fetch stage notes for a lead
 */
export async function GET(request) {
  const supabase = await supabaseServer();
  
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");
  const stage = searchParams.get("stage");
  
  if (!leadId) {
    return Response.json({ error: "lead_id is required" }, { status: 400 });
  }
  
  // Build query with role-based filtering
  let query = supabase.from("stage_notes").select("*");
  
  // For salespersons, only show stage_notes for leads assigned to them
  if (crmUser.role === "salesperson") {
    // Get all lead_ids assigned to this salesperson
    const { data: assignedLeads } = await supabase
      .from("leads_table")
      .select("id")
      .eq("assigned_to", crmUser.id);
    
    const assignedLeadIds = assignedLeads?.map(l => l.id) || [];
    
    if (assignedLeadIds.length === 0) {
      // No assigned leads, return empty array
      return Response.json([]);
    }
    
    // Filter by assigned lead IDs OR notes they created
    // Use .or() with proper syntax: "column1.in.(val1,val2),column2.eq.val3"
    const leadIdsStr = assignedLeadIds.join(",");
    query = query.or(`lead_id.in.(${leadIdsStr}),created_by.eq.${crmUser.id}`);
  }
  
  if (leadId) {
    query = query.eq("lead_id", leadId);
  }
  
  if (stage) {
    query = query.eq("stage", stage);
  }
  
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching stage notes:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json(data || []);
}

/**
 * POST - Create a new stage note
 */
export async function POST(request) {
  const supabase = await supabaseServer();
  
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const body = await request.json();
  const { lead_id, current_stage_notes, next_stage_notes, outcome } = body;
  
  if (!lead_id) {
    return Response.json(
      { error: "lead_id is required" },
      { status: 400 }
    );
  }
  
  if (!current_stage_notes || !current_stage_notes.trim()) {
    return Response.json(
      { error: "current_stage_notes is required" },
      { status: 400 }
    );
  }
  
  // Normalize outcome value
  const normalizedOutcome = outcome?.toLowerCase() || "success";
  const validOutcomes = ["success", "reschedule", "no response", "no_response"];
  const finalOutcome = validOutcomes.includes(normalizedOutcome) 
    ? normalizedOutcome.replace(" ", "_") 
    : "success";
  
  // Build insert data - match actual database schema
  // Schema: id, created_at, lead_id, current_stage_notes, next_stage_notes, outcome, created_by
  const insertData = {
    lead_id,
    current_stage_notes: current_stage_notes.trim(),
    next_stage_notes: next_stage_notes?.trim() || null,
    outcome: finalOutcome,
  };
  
  // Add created_by if available from crmUser
  // Only include if crmUser.id exists and is a valid string/number
  if (crmUser?.id && (typeof crmUser.id === 'string' || typeof crmUser.id === 'number')) {
    insertData.created_by = String(crmUser.id);
  }
  
  const { data, error } = await supabase
    .from("stage_notes")
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating stage note:", error);
    console.error("Insert data attempted:", insertData);
    return Response.json({ 
      error: error.message,
      details: error.details || error.hint || "Check database schema and column names"
    }, { status: 500 });
  }
  
  return Response.json({ success: true, stage_note: data });
}

