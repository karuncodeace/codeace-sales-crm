import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

/**
 * GET: Check for unassigned leads and tasks
 * POST: Assign unassigned leads/tasks to the current sales person
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get total counts
    const { count: totalLeads } = await supabase
      .from("leads_table")
      .select("*", { count: "exact", head: true });
    
    const { count: totalTasks } = await supabase
      .from("tasks_table")
      .select("*", { count: "exact", head: true });

    // Get unassigned leads (assigned_to is null)
    const { count: unassignedLeads } = await supabase
      .from("leads_table")
      .select("*", { count: "exact", head: true })
      .is("assigned_to", null);

    // Get unassigned tasks (sales_person_id is null)
    const { count: unassignedTasks } = await supabase
      .from("tasks_table")
      .select("*", { count: "exact", head: true })
      .is("sales_person_id", null);

    // Get leads assigned to current user
    let userLeadsCount = 0;
    let userTasksCount = 0;
    
    if (crmUser.role === "sales" && crmUser.salesPersonId) {
      const { count: leads } = await supabase
        .from("leads_table")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", crmUser.salesPersonId);
      
      const { count: tasks } = await supabase
        .from("tasks_table")
        .select("*", { count: "exact", head: true })
        .eq("sales_person_id", crmUser.salesPersonId);
      
      userLeadsCount = leads || 0;
      userTasksCount = tasks || 0;
    }

    return Response.json({
      success: true,
      summary: {
        totalLeads: totalLeads || 0,
        totalTasks: totalTasks || 0,
        unassignedLeads: unassignedLeads || 0,
        unassignedTasks: unassignedTasks || 0,
        userLeads: userLeadsCount,
        userTasks: userTasksCount,
      },
      canAssign: crmUser.role === "sales" && crmUser.salesPersonId && (unassignedLeads > 0 || unassignedTasks > 0),
      salesPersonId: crmUser.salesPersonId,
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (crmUser.role !== "sales" || !crmUser.salesPersonId) {
      return Response.json({ 
        error: "Only sales users can assign leads/tasks to themselves" 
      }, { status: 403 });
    }

    const salesPersonId = crmUser.salesPersonId;
    let assignedLeads = 0;
    let assignedTasks = 0;

    // Assign unassigned leads to this sales person
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads_table")
      .update({ assigned_to: salesPersonId })
      .is("assigned_to", null)
      .select();

    if (leadsError) {
      console.error("Error assigning leads:", leadsError);
    } else {
      assignedLeads = leadsData?.length || 0;
    }

    // Assign unassigned tasks to this sales person
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks_table")
      .update({ sales_person_id: salesPersonId })
      .is("sales_person_id", null)
      .select();

    if (tasksError) {
      console.error("Error assigning tasks:", tasksError);
    } else {
      assignedTasks = tasksData?.length || 0;
    }

    return Response.json({
      success: true,
      message: `Assigned ${assignedLeads} leads and ${assignedTasks} tasks to you`,
      assigned: {
        leads: assignedLeads,
        tasks: assignedTasks,
      },
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

