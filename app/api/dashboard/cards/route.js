import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../../lib/crm/auth";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based filtering
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
    }
    
    // Get filtered queries based on role
    let leadsQuery = getFilteredQuery(supabase, "leads_table", crmUser);
    let tasksQuery = getFilteredQuery(supabase, "tasks_table", crmUser);
    
    // Fetch all counts with role-based filtering
    const [
      { count: leadsGenerated },
      { count: qualifiedLeads },
      { count: firstCallDone },
      { count: meetingScheduled },
      { count: meetingConducted },
      { count: followUpCalls },
      { count: proposalsSent }
    ] = await Promise.all([
      leadsQuery.select("*", { count: "exact", head: true }),
      getFilteredQuery(supabase, "leads_table", crmUser).eq("status", "Qualified").select("*", { count: "exact", head: true }),
      getFilteredQuery(supabase, "tasks_table", crmUser).eq("type", "Call").eq("status", "Completed").select("*", { count: "exact", head: true }),
      getFilteredQuery(supabase, "tasks_table", crmUser).eq("type", "Meeting").eq("status", "Scheduled").select("*", { count: "exact", head: true }),
      getFilteredQuery(supabase, "tasks_table", crmUser).eq("type", "Meeting").eq("status", "Completed").select("*", { count: "exact", head: true }),
      getFilteredQuery(supabase, "tasks_table", crmUser).eq("type", "Follow-Up").select("*", { count: "exact", head: true }),
      getFilteredQuery(supabase, "tasks_table", crmUser).eq("type", "Proposal").select("*", { count: "exact", head: true })
    ]);
    
    // Calculate conversion rate (qualified leads / total leads * 100)
    const conversionRate = leadsGenerated > 0 
      ? ((qualifiedLeads || 0) / leadsGenerated * 100).toFixed(1)
      : 0;
    
    const data = {
      leadsGenerated: leadsGenerated || 0,
      firstCallDone: firstCallDone || 0,
      qualifiedLeads: qualifiedLeads || 0,
      meetingScheduled: meetingScheduled || 0,
      meetingConducted: meetingConducted || 0,
      followUpCalls: followUpCalls || 0,
      proposalsSent: proposalsSent || 0,
      conversionRate: parseFloat(conversionRate)
    };

    return Response.json(data);
  } catch (error) {
    console.error("Cards API Error:", error.message);
    return Response.json(
      { error: "Failed to fetch cards data" },
      { status: 500 }
    );
  }
}








