import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

/**
 * GET: Detailed check of tasks and their sales_person_id values
 * This helps debug why tasks aren't showing up
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

    // Get ALL tasks to see what's in the database - first try without specifying columns to see what exists
    const { data: allTasksRaw, error: allTasksErrorRaw } = await supabase
      .from("tasks_table")
      .select("*")
      .limit(50);
    
    // If that fails, try to get column info
    let allTasks = allTasksRaw;
    let allTasksError = allTasksErrorRaw;
    
    if (allTasksErrorRaw) {
      console.log("Error fetching all tasks:", allTasksErrorRaw);
      // Try with minimal columns
      const { data: minimalTasks, error: minimalError } = await supabase
        .from("tasks_table")
        .select("id")
        .limit(1);
      
      if (!minimalError && minimalTasks && minimalTasks.length > 0) {
        // Table exists but we need to find the right column names
        // Try common variations
        const columnVariations = [
          "id, title, sales_person_id, lead_id, status, created_at",
          "id, title, salesperson_id, lead_id, status, created_at",
          "id, title, assigned_to, lead_id, status, created_at",
          "id, title, lead_id, status, created_at",
        ];
        
        for (const cols of columnVariations) {
          const { data: testData, error: testError } = await supabase
            .from("tasks_table")
            .select(cols)
            .limit(5);
          
          if (!testError && testData) {
            allTasks = testData;
            allTasksError = null;
            break;
          }
        }
      }
    }

    // Get tasks that should match using sales_person_id
    const { data: matchingTasks1, error: matchingError1 } = await supabase
      .from("tasks_table")
      .select("id, title, sales_person_id, salesperson_id, lead_id, status, created_at")
      .eq("sales_person_id", salesPersonId);

    // Get tasks that should match using salesperson_id (alternative field name)
    const { data: matchingTasks2, error: matchingError2 } = await supabase
      .from("tasks_table")
      .select("id, title, sales_person_id, salesperson_id, lead_id, status, created_at")
      .eq("salesperson_id", salesPersonId);

    // Get unique sales_person_id values
    const uniqueSalesPersonIds = allTasks 
      ? [...new Set(allTasks.map(t => t.sales_person_id).filter(Boolean))]
      : [];

    // Get unique salesperson_id values (alternative field)
    const uniqueSalespersonIds = allTasks 
      ? [...new Set(allTasks.map(t => t.salesperson_id).filter(Boolean))]
      : [];

    // Check for tasks with similar but not exact matches
    const similarMatches = allTasks?.filter(task => {
      const spId1 = task.sales_person_id ? String(task.sales_person_id).trim() : null;
      const spId2 = task.salesperson_id ? String(task.salesperson_id).trim() : null;
      const target = String(salesPersonId).trim();
      
      return (spId1 && (spId1.toLowerCase() === target.toLowerCase() || spId1.includes(target) || target.includes(spId1))) ||
             (spId2 && (spId2.toLowerCase() === target.toLowerCase() || spId2.includes(target) || target.includes(spId2)));
    }) || [];

    return Response.json({
      success: true,
      salesPersonId: salesPersonId,
      salesPersonIdType: typeof salesPersonId,
      queryResults: {
        usingSalesPersonId: {
          count: matchingTasks1?.length || 0,
          tasks: matchingTasks1 || [],
          error: matchingError1?.message,
        },
        usingSalespersonId: {
          count: matchingTasks2?.length || 0,
          tasks: matchingTasks2 || [],
          error: matchingError2?.message,
        },
      },
      databaseState: {
        totalTasksChecked: allTasks?.length || 0,
        uniqueSalesPersonIdValues: uniqueSalesPersonIds,
        uniqueSalespersonIdValues: uniqueSalespersonIds,
        similarMatches: similarMatches.map(t => ({
          id: t.id,
          title: t.title,
          sales_person_id: t.sales_person_id,
          salesperson_id: t.salesperson_id,
          lead_id: t.lead_id,
          status: t.status,
        })),
        allTasksSample: allTasks?.slice(0, 10).map(t => ({
          id: t.id,
          title: t.title,
          sales_person_id: t.sales_person_id,
          salesperson_id: t.salesperson_id,
          sales_person_id_type: typeof t.sales_person_id,
          salesperson_id_type: typeof t.salesperson_id,
          lead_id: t.lead_id,
          status: t.status,
        })) || [],
      },
      diagnostics: {
        comparison: {
          salesPersonId: salesPersonId,
          salesPersonIdAsString: String(salesPersonId),
          salesPersonIdTrimmed: String(salesPersonId).trim(),
        },
        potentialIssues: [
          (!matchingTasks1 || matchingTasks1.length === 0) && (!matchingTasks2 || matchingTasks2.length === 0) 
            ? "No exact matches found using either sales_person_id or salesperson_id" 
            : null,
          uniqueSalesPersonIds.length === 0 && uniqueSalespersonIds.length === 0 
            ? "No tasks have sales_person_id or salesperson_id values" 
            : null,
          uniqueSalesPersonIds.length > 0 && !uniqueSalesPersonIds.includes(salesPersonId) && 
          uniqueSalespersonIds.length > 0 && !uniqueSalespersonIds.includes(salesPersonId)
            ? `sales_person_id values in DB don't match SP-02. Found in sales_person_id: ${JSON.stringify(uniqueSalesPersonIds)}, Found in salesperson_id: ${JSON.stringify(uniqueSalespersonIds)}` 
            : null,
          similarMatches.length > 0 && (!matchingTasks1 || matchingTasks1.length === 0) && (!matchingTasks2 || matchingTasks2.length === 0)
            ? "Found similar matches but exact query failed - possible data type or field name issue" 
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

