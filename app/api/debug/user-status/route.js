import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ 
        error: "No CRM user found",
        message: "User is not found in the users table. Please check if the user exists."
      }, { status: 404 });
    }

    // Get authenticated user from Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    // Get user details from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", crmUser.id)
      .single();

    // Get sales_person details if role is sales
    let salesPersonData = null;
    if (crmUser.role === "sales") {
      const { data: salesPerson, error: spError } = await supabase
        .from("sales_persons")
        .select("*")
        .eq("user_id", crmUser.id)
        .maybeSingle();
      
      salesPersonData = salesPerson;
      
      // Count leads assigned to this sales person
      const { count: leadsCount } = await supabase
        .from("leads_table")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", crmUser.salesPersonId || "NONEXISTENT");
      
      // Count tasks assigned to this sales person
      const { count: tasksCount } = await supabase
        .from("tasks_table")
        .select("*", { count: "exact", head: true })
        .eq("sales_person_id", crmUser.salesPersonId || "NONEXISTENT");
      
      return Response.json({
        success: true,
        crmUser: {
          id: crmUser.id,
          email: crmUser.email,
          role: crmUser.role,
          salesPersonId: crmUser.salesPersonId,
        },
        authUser: {
          id: authUser?.id,
          email: authUser?.email,
        },
        userData: userData,
        salesPerson: salesPersonData,
        counts: {
          leads: leadsCount || 0,
          tasks: tasksCount || 0,
        },
        issues: [
          !crmUser.salesPersonId ? "No sales_person_id found. User needs to be linked to a sales_persons entry." : null,
          !salesPersonData ? "No sales_persons entry found for this user." : null,
          (leadsCount || 0) === 0 ? "No leads assigned to this sales person." : null,
          (tasksCount || 0) === 0 ? "No tasks assigned to this sales person." : null,
        ].filter(Boolean),
      });
    } else {
      // Admin user - count all leads and tasks
      const { count: leadsCount } = await supabase
        .from("leads_table")
        .select("*", { count: "exact", head: true });
      
      const { count: tasksCount } = await supabase
        .from("tasks_table")
        .select("*", { count: "exact", head: true });
      
      return Response.json({
        success: true,
        crmUser: {
          id: crmUser.id,
          email: crmUser.email,
          role: crmUser.role,
        },
        authUser: {
          id: authUser?.id,
          email: authUser?.email,
        },
        userData: userData,
        counts: {
          leads: leadsCount || 0,
          tasks: tasksCount || 0,
        },
      });
    }
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

