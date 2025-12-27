import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { supabaseAdmin } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based filtering
    const crmUser = await getCrmUser();
    
    // If no CRM user found, return empty data
    if (!crmUser) {
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }

    // Fetch all sales persons with their performance metrics from the table
    // First try with the performance fields, fallback to basic fields if they don't exist
    let salesPersons = [];
    let salesPersonsError = null;
    let queryClient = supabase;
    
    // For admin users, try to fetch all sales persons
    // For sales users, fetch only their own record
    let queryBuilder;
    if (crmUser.role === "admin") {
      // Admin should see all sales persons
      queryBuilder = supabase
        .from("sales_persons")
        .select("id, user_id, full_name, call_attended, meetings_attended, total_conversions");
    } else if (crmUser.role === "sales" && crmUser.salesPersonId) {
      // Sales users see only their own record
      queryBuilder = supabase
        .from("sales_persons")
        .select("id, user_id, full_name, call_attended, meetings_attended, total_conversions")
        .eq("id", crmUser.salesPersonId);
    } else {
      // Sales user without salesPersonId - return empty
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }
    
    // Try fetching with performance fields first
    const resultWithFields = await queryBuilder;
    
    if (resultWithFields.error) {
      // Check if error is due to missing columns
      const errorMessage = resultWithFields.error.message || "";
      const errorCode = resultWithFields.error.code || "";
      
      if (errorMessage.includes("column") || errorCode === "42703" || errorMessage.includes("does not exist")) {
        // Try fetching without performance fields
        let basicQueryBuilder;
        if (crmUser.role === "admin") {
          basicQueryBuilder = supabase
            .from("sales_persons")
            .select("id, user_id, full_name");
        } else {
          basicQueryBuilder = supabase
            .from("sales_persons")
            .select("id, user_id, full_name")
            .eq("id", crmUser.salesPersonId);
        }
        const resultBasic = await basicQueryBuilder;
        
        if (resultBasic.error) {
          console.error("Error fetching sales persons (basic):", resultBasic.error);
          salesPersonsError = resultBasic.error;
        } else {
          salesPersons = resultBasic.data || [];
        }
      } else {
        // Other error (RLS, permission, etc.)
        // Check if RLS is blocking - try with admin client for admin users
        if (crmUser.role === "admin") {
          const adminClient = supabaseAdmin();
          let adminQueryBuilder = adminClient
            .from("sales_persons")
            .select("id, user_id, full_name, call_attended, meetings_attended, total_conversions");
          
          const adminResult = await adminQueryBuilder;
          
          if (!adminResult.error && adminResult.data) {
            salesPersons = adminResult.data || [];
            salesPersonsError = null;
            queryClient = adminClient;
          } else {
            // Try basic fields with admin client
            const adminBasicResult = await adminClient
              .from("sales_persons")
              .select("id, user_id, full_name");
            
            if (!adminBasicResult.error && adminBasicResult.data) {
              salesPersons = adminBasicResult.data || [];
              salesPersonsError = null;
              queryClient = adminClient;
            } else {
              salesPersonsError = resultWithFields.error;
            }
          }
        } else {
          salesPersonsError = resultWithFields.error;
        }
      }
    } else {
      salesPersons = resultWithFields.data || [];
    }

    // If we still have an error after fallback, try admin client for sales users too
    if (salesPersonsError && crmUser.role === "sales" && crmUser.salesPersonId) {
      const adminClient = supabaseAdmin();
      const adminResult = await adminClient
        .from("sales_persons")
        .select("id, user_id, full_name, call_attended, meetings_attended, total_conversions")
        .eq("id", crmUser.salesPersonId);
      
      if (!adminResult.error && adminResult.data && adminResult.data.length > 0) {
        salesPersons = adminResult.data || [];
        salesPersonsError = null;
        queryClient = adminClient;
      } else {
        // Try basic fields
        const adminBasicResult = await adminClient
          .from("sales_persons")
          .select("id, user_id, full_name")
          .eq("id", crmUser.salesPersonId);
        
        if (!adminBasicResult.error && adminBasicResult.data && adminBasicResult.data.length > 0) {
          salesPersons = adminBasicResult.data || [];
          salesPersonsError = null;
          queryClient = adminClient;
        }
      }
    }

    // If we still have an error after all fallbacks, return empty data instead of error
    if (salesPersonsError) {
      console.error("Error fetching sales persons:", salesPersonsError);
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }

    if (!salesPersons || salesPersons.length === 0) {
      
      // Fallback: Fetch from users table if sales_persons is empty
      let usersQueryBuilder;
      if (crmUser.role === "admin") {
        usersQueryBuilder = queryClient
          .from("users")
          .select("id, name, email, role")
          .in("role", ["sales", "admin"]);
      } else {
        // Sales users see only themselves
        usersQueryBuilder = queryClient
          .from("users")
          .select("id, name, email, role")
          .eq("id", crmUser.id);
      }
      
      const usersResult = await usersQueryBuilder;
      
      if (usersResult.error) {
        console.error("Error fetching users as fallback:", usersResult.error);
        return Response.json({
          calls: [],
          meetings: [],
          conversions: [],
          salesPersons: []
        });
      }
      
      if (usersResult.data && usersResult.data.length > 0) {
        // Map users to sales_persons format
        salesPersons = usersResult.data.map(user => ({
          id: user.id,
          user_id: user.id,
          full_name: user.name || user.email?.split("@")[0] || "Unknown",
          call_attended: 0, // Default to 0 since we don't have this data
          meetings_attended: 0,
          total_conversion: 0
        }));
      } else {
        return Response.json({
          calls: [],
          meetings: [],
          conversions: [],
          salesPersons: []
        });
      }
    }

    // Fetch user names for sales persons
    const userIds = salesPersons.map(sp => sp.user_id).filter(Boolean);
    const userNamesMap = {};
    
    if (userIds.length > 0) {
      const { data: users } = await queryClient
        .from("users")
        .select("id, name, email")
        .in("id", userIds);
      
      if (users) {
        users.forEach(user => {
          userNamesMap[user.id] = user.name || user.email?.split("@")[0] || "Unknown";
        });
      }
    }

    // If performance metrics are all zero, try to calculate from other tables
    const hasPerformanceData = salesPersons.some(sp => 
      (sp.call_attended && parseInt(sp.call_attended) > 0) ||
      (sp.meetings_attended && parseInt(sp.meetings_attended) > 0) ||
      (sp.total_conversions && parseInt(sp.total_conversions) > 0)
    );

    // Calculate metrics from other tables if sales_persons table doesn't have performance data
    let calculatedMetrics = {};
    if (!hasPerformanceData && salesPersons.length > 0) {
      const salesPersonIds = salesPersons.map(sp => sp.id).filter(Boolean);
      
      // Count completed calls (tasks with type='Call' and status='Completed')
      const { data: completedCalls } = await queryClient
        .from("tasks_table")
        .select("sales_person_id")
        .eq("type", "Call")
        .eq("status", "Completed")
        .in("sales_person_id", salesPersonIds);
      
      // Count completed meetings (appointments with status='completed')
      const { data: completedMeetings } = await queryClient
        .from("appointments")
        .select("salesperson_id")
        .eq("status", "completed")
        .in("salesperson_id", salesPersonIds);
      
      // Count converted leads (leads with status='Converted' or 'Closed Won')
      const { data: convertedLeads } = await queryClient
        .from("leads_table")
        .select("assigned_to")
        .in("status", ["Converted", "Closed Won", "Won"])
        .in("assigned_to", salesPersonIds);
      
      // Aggregate by sales_person_id
      salesPersonIds.forEach(spId => {
        calculatedMetrics[spId] = {
          calls: completedCalls?.filter(t => t.sales_person_id === spId).length || 0,
          meetings: completedMeetings?.filter(a => a.salesperson_id === spId).length || 0,
          conversions: convertedLeads?.filter(l => l.assigned_to === spId).length || 0,
        };
      });
    }

    // Map sales persons data to performance metrics
    if (salesPersons.length === 0) {
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }
    
    const performanceData = salesPersons.map((salesPerson) => {
      // Use full_name from sales_persons table, fallback to users table or id
      let salesPersonName = salesPerson.full_name;
      if (!salesPersonName && salesPerson.user_id) {
        salesPersonName = userNamesMap[salesPerson.user_id];
      }
      if (!salesPersonName) {
        salesPersonName = salesPerson.id || "Unknown";
      }

      // Use calculated metrics if available, otherwise use table values
      const calculated = calculatedMetrics[salesPerson.id] || {};
      
      // Get values from table fields: call_attended, meetings_attended, total_conversions
      // Prioritize table values over calculated metrics
      const calls = salesPerson.call_attended !== null && salesPerson.call_attended !== undefined 
        ? parseInt(salesPerson.call_attended) || 0 
        : (calculated.calls !== undefined ? calculated.calls : 0);
      
      const meetings = salesPerson.meetings_attended !== null && salesPerson.meetings_attended !== undefined 
        ? parseInt(salesPerson.meetings_attended) || 0 
        : (calculated.meetings !== undefined ? calculated.meetings : 0);
      
      const conversions = salesPerson.total_conversions !== null && salesPerson.total_conversions !== undefined 
        ? parseInt(salesPerson.total_conversions) || 0 
        : (calculated.conversions !== undefined ? calculated.conversions : 0);
      
      return {
        name: salesPersonName,
        calls,
        meetings,
        conversions,
      };
    });

    // Sort by total performance (calls + meetings + conversions) descending
    performanceData.sort((a, b) => {
      const totalA = a.calls + a.meetings + a.conversions;
      const totalB = b.calls + b.meetings + b.conversions;
      return totalB - totalA;
    });

    // Extract arrays for chart - ensure all values are numbers
    const calls = performanceData.map((p) => Number(p.calls) || 0);
    const meetings = performanceData.map((p) => Number(p.meetings) || 0);
    const conversions = performanceData.map((p) => Number(p.conversions) || 0);
    const salesPersonsNames = performanceData.map((p) => p.name || "Unknown");

    return Response.json({
      calls,
      meetings,
      conversions,
      salesPersons: salesPersonsNames,
    });
  } catch (error) {
    console.error("Sales Person Performance API Error:", error.message);
    return Response.json(
      { error: "Failed to fetch sales person performance data" },
      { status: 500 }
    );
  }
}













