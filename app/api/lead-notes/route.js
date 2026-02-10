import { supabaseServer, supabaseAdmin } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";

/**
 * GET - Fetch notes from lead_notes table for a lead
 */
export async function GET(request) {
  const supabase = await supabaseServer();
  const adminSupabase = supabaseAdmin();
  
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const { searchParams } = new URL(request.url);
  // lead_id is optional: when provided we filter for that lead, otherwise return notes for all accessible leads
  const leadId = searchParams.get("lead_id");
  
  // Build query with role-based filtering
  // Try both possible table names to be robust: "leads_notes" and "lead_notes"
  const tableCandidates = ["leads_notes", "lead_notes"];
  let data = null;
  let lastError = null;

  for (const tableName of tableCandidates) {
    try {
      let query = adminSupabase.from(tableName).select("*");

      // For sales, only show notes for leads assigned to them
      if (crmUser.role === "sales") {
        const salesPersonId = crmUser.salesPersonId;
        
        if (!salesPersonId) {
          console.warn("Lead Notes API: No sales_person_id found for user", crmUser.id);
          return Response.json([]);
        }
        
        // Get all lead_ids assigned to this sales person
        const { data: assignedLeads } = await adminSupabase
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

      const result = await query;
      if (result.error) {
        lastError = result.error;
        // try next table candidate
        continue;
      }

      data = result.data || [];
      break; // success
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  if (lastError && data === null) {
    console.error("Lead Notes API error:", lastError);
    return Response.json({ error: lastError.message || "Failed to fetch lead notes" }, { status: 500 });
  }
  // If no notes found, attempt to resolve alternate lead identifiers (slug vs internal id)
  if ((!data || data.length === 0) && leadId) {
    try {
      // Try to find the lead in leads_table by several fallbacks
      let canonicalLead = null;

      // 1) exact match on id
      let res = await adminSupabase.from("leads_table").select("id,assigned_to").eq("id", leadId).limit(1);
      if (res && res.data && res.data.length > 0) canonicalLead = res.data[0];

      // 2) exact match on lead_id column (if present)
      if (!canonicalLead) {
        res = await adminSupabase.from("leads_table").select("id,assigned_to").eq("lead_id", leadId).limit(1);
        if (res && res.data && res.data.length > 0) canonicalLead = res.data[0];
      }

      // 3) fuzzy match on lead_name (fallback)
      if (!canonicalLead) {
        res = await adminSupabase.from("leads_table").select("id,assigned_to").ilike("lead_name", `%${leadId}%`).limit(1);
        if (res && res.data && res.data.length > 0) canonicalLead = res.data[0];
      }

      if (canonicalLead && canonicalLead.id) {
        // For sales role, ensure the sales person is assigned to this lead
        if (crmUser.role === "sales") {
          const salesPersonId = crmUser.salesPersonId;
          if (!salesPersonId || canonicalLead.assigned_to !== salesPersonId) {
            // Not allowed to view notes for this lead
            return Response.json([]);
          }
        }

        // Re-run notes lookup using canonicalLead.id
        const tableCandidates2 = ["leads_notes", "lead_notes"];
        for (const tableName of tableCandidates2) {
          try {
            const q = supabase.from(tableName).select("*").eq("lead_id", canonicalLead.id).order("created_at", { ascending: false });
            const r = await q;
            if (!r.error && r.data && r.data.length > 0) {
              return Response.json(r.data || []);
            }
          } catch (err) {
            // try next candidate
            continue;
          }
        }
      }
    } catch (err) {
      console.warn("Lead Notes API fallback lookup failed:", err);
    }
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
  const adminSupabase = supabaseAdmin();

  // Try inserting into either table name
  const tableCandidates = ["leads_notes", "lead_notes"];
  let created = null;
  let lastInsertError = null;
  for (const tableName of tableCandidates) {
    try {
      const { data, error } = await adminSupabase
        .from(tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        lastInsertError = error;
        continue;
      }
      created = data;
      break;
    } catch (err) {
      lastInsertError = err;
      continue;
    }
  }

  if (lastInsertError && !created) {
    console.error("❌ Lead Notes API - Database error:", lastInsertError);
    if (lastInsertError.message && (lastInsertError.message.includes('does not exist') || lastInsertError.message.includes('relation') || lastInsertError.code === '42P01')) {
      return Response.json({ 
        error: "leads_notes table does not exist. Please create the table.",
        details: lastInsertError.message,
        hint: "Run this SQL in Supabase SQL Editor: CREATE TABLE IF NOT EXISTS leads_notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id TEXT NOT NULL, notes TEXT NOT NULL, notes_type TEXT DEFAULT 'general', created_at TIMESTAMP DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_leads_notes_lead_id ON leads_notes(lead_id);"
      }, { status: 500 });
    }
    if (lastInsertError.code === '42501' || lastInsertError.message.includes('permission denied') || lastInsertError.message.includes('policy')) {
      return Response.json({ 
        error: "Permission denied. Check Row Level Security (RLS) policies for leads_notes table.",
        details: lastInsertError.message,
        hint: "Ensure RLS policies allow INSERT for authenticated users or create a policy: CREATE POLICY \"Allow authenticated users to insert leads_notes\" ON leads_notes FOR INSERT TO authenticated WITH CHECK (true);"
      }, { status: 500 });
    }

    return Response.json({ 
      error: lastInsertError.message || "Failed to save note",
      code: lastInsertError.code,
      details: lastInsertError.details || lastInsertError.hint || "Check database schema and column names"
    }, { status: 500 });
  }

  return Response.json({ success: true, note: created });
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

  // Try updating in either table
  const tableCandidates = ["leads_notes", "lead_notes"];
  let updated = null;
  let lastUpdateError = null;
  for (const tableName of tableCandidates) {
    try {
      const { data, error } = await adminSupabase
        .from(tableName)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        lastUpdateError = error;
        continue;
      }
      updated = data;
      break;
    } catch (err) {
      lastUpdateError = err;
      continue;
    }
  }

  if (lastUpdateError && !updated) {
    console.error("❌ Lead Notes API - Update error:", lastUpdateError);
    return Response.json({ 
      error: lastUpdateError.message || "Failed to update note",
      code: lastUpdateError.code,
      details: lastUpdateError.details || lastUpdateError.hint || "Check database schema and column names"
    }, { status: 500 });
  }

  return Response.json({ success: true, note: updated });
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
  
  const tableCandidates = ["leads_notes", "lead_notes"];
  let deletedOk = false;
  let lastDeleteError = null;
  for (const tableName of tableCandidates) {
    try {
      const { error } = await adminSupabase
        .from(tableName)
        .delete()
        .eq("id", id);

      if (error) {
        lastDeleteError = error;
        continue;
      }
      deletedOk = true;
      break;
    } catch (err) {
      lastDeleteError = err;
      continue;
    }
  }

  if (!deletedOk) {
    console.error("❌ Lead Notes API - Delete error:", lastDeleteError);
    return Response.json({ 
      error: lastDeleteError?.message || "Failed to delete note",
      code: lastDeleteError?.code,
      details: lastDeleteError?.details || lastDeleteError?.hint || "Check database schema and column names"
    }, { status: 500 });
  }

  return Response.json({ success: true, message: "Note deleted successfully" });
}
