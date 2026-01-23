import { supabaseServer, supabaseAdmin } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";

/**
 * GET - Fetch notes from lead_notes table for a lead
 */
export async function GET(request) {
  const supabase = await supabaseServer();
  
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");
  
  if (!leadId) {
    return Response.json({ error: "lead_id is required" }, { status: 400 });
  }
  
  // Build query with role-based filtering
  let query = supabase.from("leads_notes").select("*");
  
  // For sales, only show notes for leads assigned to them
  if (crmUser.role === "sales") {
    const salesPersonId = crmUser.salesPersonId;
    
    if (!salesPersonId) {
      console.warn("Lead Notes API: No sales_person_id found for user", crmUser.id);
      return Response.json([]);
    }
    
    // Get all lead_ids assigned to this sales person
    const { data: assignedLeads } = await supabase
      .from("leads_table")
      .select("id")
      .eq("assigned_to", salesPersonId);
    
    const assignedLeadIds = assignedLeads?.map(l => l.id) || [];
    
    if (assignedLeadIds.length === 0) {
      return Response.json([]);
    }
    
    // Filter by assigned lead IDs
    query = query.in("lead_id", assignedLeadIds);
  }
  
  if (leadId) {
    query = query.eq("lead_id", leadId);
  }
  
  // Order by created_at (newest first)
  query = query.order("created_at", { ascending: false });
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Lead Notes API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json(data || []);
}

/**
 * POST - Create a new note in lead_notes table
 */
export async function POST(request) {
  const supabase = await supabaseServer();
  
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const body = await request.json();
  const { lead_id, notes, notes_type } = body;
  
  if (!lead_id) {
    return Response.json(
      { error: "lead_id is required" },
      { status: 400 }
    );
  }
  
  if (!notes || !notes.trim()) {
    return Response.json(
      { error: "notes is required" },
      { status: 400 }
    );
  }
  
  // Build insert data
  const insertData = {
    lead_id,
    notes: notes.trim(),
    notes_type: notes_type || "general", // Default to "general" if not provided
  };
  
  console.log("📝 Lead Notes API - Inserting data:", JSON.stringify(insertData, null, 2));
  
  // Use admin client to bypass RLS (similar to initial task creation)
  // This ensures the note is saved even if RLS policies are restrictive
  const adminSupabase = supabaseAdmin();
  
  const { data, error } = await adminSupabase
    .from("leads_notes")
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error("❌ Lead Notes API - Database error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      insertData,
      fullError: JSON.stringify(error, null, 2)
    });
    
    // If table doesn't exist, provide helpful error message
    if (error.message && (error.message.includes('does not exist') || error.message.includes('relation') || error.code === '42P01')) {
      return Response.json({ 
        error: "leads_notes table does not exist. Please create the table.",
        details: error.message,
        hint: "Run this SQL in Supabase SQL Editor: CREATE TABLE IF NOT EXISTS leads_notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id TEXT NOT NULL, notes TEXT NOT NULL, notes_type TEXT DEFAULT 'general', created_at TIMESTAMP DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_leads_notes_lead_id ON leads_notes(lead_id);"
      }, { status: 500 });
    }
    
    // If RLS policy issue, provide helpful message
    if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
      return Response.json({ 
        error: "Permission denied. Check Row Level Security (RLS) policies for leads_notes table.",
        details: error.message,
        hint: "Ensure RLS policies allow INSERT for authenticated users or create a policy: CREATE POLICY \"Allow authenticated users to insert leads_notes\" ON leads_notes FOR INSERT TO authenticated WITH CHECK (true);"
      }, { status: 500 });
    }
    
    return Response.json({ 
      error: error.message || "Failed to save note",
      code: error.code,
      details: error.details || error.hint || "Check database schema and column names"
    }, { status: 500 });
  }
  
  return Response.json({ success: true, note: data });
}

/**
 * PATCH - Update an existing note in leads_notes table
 */
export async function PATCH(request) {
  const supabase = await supabaseServer();
  
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const body = await request.json();
  const { id, notes, notes_type } = body;
  
  if (!id) {
    return Response.json(
      { error: "id is required" },
      { status: 400 }
    );
  }
  
  if (!notes || !notes.trim()) {
    return Response.json(
      { error: "notes is required" },
      { status: 400 }
    );
  }
  
  // Build update data
  const updateData = {
    notes: notes.trim(),
  };
  
  if (notes_type) {
    updateData.notes_type = notes_type;
  }
  
  // Use admin client to bypass RLS
  const adminSupabase = supabaseAdmin();
  
  const { data, error } = await adminSupabase
    .from("leads_notes")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  
  if (error) {
    console.error("❌ Lead Notes API - Update error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      updateData
    });
    return Response.json({ 
      error: error.message || "Failed to update note",
      code: error.code,
      details: error.details || error.hint || "Check database schema and column names"
    }, { status: 500 });
  }
  
  return Response.json({ success: true, note: data });
}

/**
 * DELETE - Delete a note from leads_notes table
 */
export async function DELETE(request) {
  const supabase = await supabaseServer();
  
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return Response.json(
      { error: "id is required" },
      { status: 400 }
    );
  }
  
  // Use admin client to bypass RLS
  const adminSupabase = supabaseAdmin();
  
  const { error } = await adminSupabase
    .from("leads_notes")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("❌ Lead Notes API - Delete error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return Response.json({ 
      error: error.message || "Failed to delete note",
      code: error.code,
      details: error.details || error.hint || "Check database schema and column names"
    }, { status: 500 });
  }
  
  return Response.json({ success: true, message: "Note deleted successfully" });
}
