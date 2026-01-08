import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

/**
 * GET: Simple check - just get all tasks without filtering to see what exists
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const salesPersonId = crmUser.salesPersonId || "SP-02";

    // Try to get ALL tasks without any filters to see what's actually in the table
    const { data: allTasks, error: allTasksError } = await supabase
      .from("tasks_table")
      .select("*")
      .limit(100);

    // If that works, check what columns exist by looking at the first task
    let columnNames = [];
    let sampleTask = null;
    
    if (allTasks && allTasks.length > 0) {
      sampleTask = allTasks[0];
      columnNames = Object.keys(sampleTask);
    }

    // Try querying with sales_person_id
    const { data: tasksWithSalesPersonId, error: error1 } = await supabase
      .from("tasks_table")
      .select("*")
      .eq("sales_person_id", salesPersonId)
      .limit(10);

    // Try querying without any filter to see total count
    const { count: totalCount } = await supabase
      .from("tasks_table")
      .select("*", { count: "exact", head: true });

    return Response.json({
      success: true,
      salesPersonId: salesPersonId,
      tableInfo: {
        totalTasksInTable: totalCount || 0,
        tasksReturned: allTasks?.length || 0,
        error: allTasksError?.message,
        columnNames: columnNames,
        sampleTask: sampleTask,
      },
      queryResults: {
        withSalesPersonIdFilter: {
          count: tasksWithSalesPersonId?.length || 0,
          tasks: tasksWithSalesPersonId || [],
          error: error1?.message,
        },
      },
      allTasksSample: allTasks?.slice(0, 5) || [],
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}





