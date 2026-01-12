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

    // Calculate metrics from leads_table for each sales person
    // Use admin client to bypass RLS and get all leads
    const adminClient = supabaseAdmin();
    const salesPersonIds = salesPersons.map(sp => sp.id).filter(Boolean);
    
    let calculatedMetrics = {};
    
    if (salesPersonIds.length > 0) {
      // Fetch all leads assigned to these sales persons
      const { data: allLeads, error: leadsError } = await adminClient
        .from("leads_table")
        .select("id, assigned_to, first_call_done, meeting_status, status")
        .in("assigned_to", salesPersonIds);
      
      if (!leadsError && allLeads) {
        // Initialize metrics for each sales person
        salesPersonIds.forEach(spId => {
          calculatedMetrics[spId] = {
            calls: 0,
            meetings: 0,
            conversions: 0,
          };
        });
        
        // Count metrics for each lead
        allLeads.forEach(lead => {
          const spId = lead.assigned_to;
          if (!spId || !calculatedMetrics[spId]) return;
          
          // Count calls: first_call_done = "Done" (handle multiple formats: boolean true, string "Done"/"done"/"DONE")
          const firstCallDone = lead.first_call_done;
          if (
            firstCallDone === true ||
            firstCallDone === 1 ||
            String(firstCallDone || "").toLowerCase().trim() === "done"
          ) {
            calculatedMetrics[spId].calls++;
          }
          
          // Count meetings: meeting_status = "Completed" (case-insensitive)
          const meetingStatus = String(lead.meeting_status || "").toLowerCase();
          if (meetingStatus === "completed") {
            calculatedMetrics[spId].meetings++;
          }
          
          // Count conversions: status = "Won"
          if (lead.status === "Won") {
            calculatedMetrics[spId].conversions++;
          }
        });
      }
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

      // Use calculated metrics from leads_table
      const calculated = calculatedMetrics[salesPerson.id] || {};
      
      // Get values from leads_table calculations
      const calls = calculated.calls !== undefined ? calculated.calls : 0;
      const meetings = calculated.meetings !== undefined ? calculated.meetings : 0;
      const conversions = calculated.conversions !== undefined ? calculated.conversions : 0;
      
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
    return Response.json(
      { error: "Failed to fetch sales person performance data" },
      { status: 500 }
    );
  }
}













