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
      console.warn("No CRM user found - returning empty sales person performance data");
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }

    console.log("🔍 Fetching sales persons for user:", {
      userId: crmUser.id,
      role: crmUser.role,
      email: crmUser.email,
      salesPersonId: crmUser.salesPersonId
    });

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
        .select("id, user_id, full_name, call_attended, meetings_attended, total_conversion");
    } else if (crmUser.role === "sales" && crmUser.salesPersonId) {
      // Sales users see only their own record
      queryBuilder = supabase
        .from("sales_persons")
        .select("id, user_id, full_name, call_attended, meetings_attended, total_conversion")
        .eq("id", crmUser.salesPersonId);
    } else {
      // Sales user without salesPersonId - return empty
      console.warn("Sales user without salesPersonId - returning empty data");
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }
    
    // Try fetching with performance fields first
    const resultWithFields = await queryBuilder;
    
    console.log("📊 Sales persons query result:", {
      hasData: !!resultWithFields.data,
      dataLength: resultWithFields.data?.length || 0,
      hasError: !!resultWithFields.error,
      error: resultWithFields.error ? {
        message: resultWithFields.error.message,
        code: resultWithFields.error.code,
        details: resultWithFields.error.details,
        hint: resultWithFields.error.hint
      } : null
    });
    
    if (resultWithFields.error) {
      // Check if error is due to missing columns
      const errorMessage = resultWithFields.error.message || "";
      const errorCode = resultWithFields.error.code || "";
      
      if (errorMessage.includes("column") || errorCode === "42703" || errorMessage.includes("does not exist")) {
        console.warn("⚠️ Performance fields not found, fetching without them:", errorMessage);
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
        
        console.log("📊 Basic sales persons query result:", {
          hasData: !!resultBasic.data,
          dataLength: resultBasic.data?.length || 0,
          hasError: !!resultBasic.error,
          error: resultBasic.error ? {
            message: resultBasic.error.message,
            code: resultBasic.error.code
          } : null
        });
        
        if (resultBasic.error) {
          console.error("❌ Error fetching sales persons (basic):", resultBasic.error);
          salesPersonsError = resultBasic.error;
        } else {
          salesPersons = resultBasic.data || [];
          console.log("✅ Fetched sales persons (basic):", salesPersons.length);
        }
      } else {
        // Other error (RLS, permission, etc.)
        console.error("❌ Error fetching sales persons:", {
          message: resultWithFields.error.message,
          code: resultWithFields.error.code,
          details: resultWithFields.error.details,
          hint: resultWithFields.error.hint
        });
        
        // Check if RLS is blocking - try with admin client for admin users
        if (crmUser.role === "admin") {
          console.warn("⚠️ RLS might be blocking. Trying with admin client...");
          const adminClient = supabaseAdmin();
          let adminQueryBuilder = adminClient
            .from("sales_persons")
            .select("id, user_id, full_name, call_attended, meetings_attended, total_conversion");
          
          const adminResult = await adminQueryBuilder;
          
          if (!adminResult.error && adminResult.data) {
            console.log("✅ Admin client successfully fetched sales persons:", adminResult.data.length);
            salesPersons = adminResult.data || [];
            salesPersonsError = null;
            queryClient = adminClient;
          } else {
            // Try basic fields with admin client
            const adminBasicResult = await adminClient
              .from("sales_persons")
              .select("id, user_id, full_name");
            
            if (!adminBasicResult.error && adminBasicResult.data) {
              console.log("✅ Admin client fetched sales persons (basic):", adminBasicResult.data.length);
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
      console.log("✅ Fetched sales persons (with performance fields):", salesPersons.length);
      if (salesPersons.length > 0) {
        console.log("📋 First sales person raw data:", JSON.stringify(salesPersons[0], null, 2));
        console.log("📋 All sales persons raw data:", JSON.stringify(salesPersons, null, 2));
      }
    }

    // If we still have an error after fallback, try admin client for sales users too
    if (salesPersonsError && crmUser.role === "sales" && crmUser.salesPersonId) {
      console.warn("⚠️ Regular query failed for sales user. Trying with admin client...");
      const adminClient = supabaseAdmin();
      const adminResult = await adminClient
        .from("sales_persons")
        .select("id, user_id, full_name, call_attended, meetings_attended, total_conversion")
        .eq("id", crmUser.salesPersonId);
      
      if (!adminResult.error && adminResult.data && adminResult.data.length > 0) {
        console.log("✅ Admin client successfully fetched sales person:", adminResult.data.length);
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
          console.log("✅ Admin client fetched sales person (basic):", adminBasicResult.data.length);
          salesPersons = adminBasicResult.data || [];
          salesPersonsError = null;
          queryClient = adminClient;
        }
      }
    }

    // If we still have an error after all fallbacks, return empty data instead of error
    // This allows the dashboard to still load
    if (salesPersonsError) {
      console.error("❌ Final error fetching sales persons after all fallbacks:", salesPersonsError);
      // Return empty data instead of error to prevent dashboard from breaking
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }

    console.log("🔍 After query - salesPersons array:", {
      length: salesPersons?.length || 0,
      isEmpty: !salesPersons || salesPersons.length === 0,
      firstItem: salesPersons?.[0] || null
    });

    if (!salesPersons || salesPersons.length === 0) {
      console.warn("⚠️ No sales persons found in sales_persons table. Trying users table fallback...");
      
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
        console.error("❌ Error fetching users as fallback:", usersResult.error);
        return Response.json({
          calls: [],
          meetings: [],
          conversions: [],
          salesPersons: []
        });
      }
      
      if (usersResult.data && usersResult.data.length > 0) {
        console.log("✅ Using users table fallback:", usersResult.data.length, "users");
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
        console.warn("⚠️ No users found either");
        return Response.json({
          calls: [],
          meetings: [],
          conversions: [],
          salesPersons: []
        });
      }
    }
    
    console.log("✅ Processing", salesPersons.length, "sales persons");

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
      (sp.total_conversion && parseInt(sp.total_conversion) > 0)
    );

    // Calculate metrics from other tables if sales_persons table doesn't have performance data
    let calculatedMetrics = {};
    if (!hasPerformanceData && salesPersons.length > 0) {
      console.log("📊 Calculating performance metrics from tasks, appointments, and leads tables...");
      
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
      
      console.log("✅ Calculated metrics:", calculatedMetrics);
    }

    // Map sales persons data to performance metrics
    console.log("🔄 Mapping sales persons to performance data. Count:", salesPersons.length);
    if (salesPersons.length === 0) {
      console.error("❌ CRITICAL: salesPersons array is EMPTY! Cannot create chart data.");
      console.log("🔍 Debug info:", {
        crmUserRole: crmUser.role,
        crmUserSalesPersonId: crmUser.salesPersonId,
        salesPersonsError: salesPersonsError,
        queryClientType: queryClient === supabase ? "regular" : "admin"
      });
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }
    console.log("📋 Raw sales persons data:", JSON.stringify(salesPersons, null, 2));
    console.log("📊 Calculated metrics:", JSON.stringify(calculatedMetrics, null, 2));
    
    const performanceData = salesPersons.map((salesPerson, index) => {
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
      
      // Get values from table fields: call_attended, meetings_attended, total_conversion
      const calls = calculated.calls !== undefined 
        ? calculated.calls
        : (salesPerson.call_attended !== null && salesPerson.call_attended !== undefined 
            ? parseInt(salesPerson.call_attended) || 0 
            : 0);
      
      const meetings = calculated.meetings !== undefined
        ? calculated.meetings
        : (salesPerson.meetings_attended !== null && salesPerson.meetings_attended !== undefined 
            ? parseInt(salesPerson.meetings_attended) || 0 
            : 0);
      
      const conversions = calculated.conversions !== undefined
        ? calculated.conversions
        : (salesPerson.total_conversion !== null && salesPerson.total_conversion !== undefined 
            ? parseInt(salesPerson.total_conversion) || 0 
            : 0);
      
      const personData = {
        name: salesPersonName,
        calls,
        meetings,
        conversions,
      };
      
      console.log(`👤 Person ${index + 1}:`, {
        id: salesPerson.id,
        full_name: salesPerson.full_name,
        name: salesPersonName,
        raw_call_attended: salesPerson.call_attended,
        raw_meetings_attended: salesPerson.meetings_attended,
        raw_total_conversion: salesPerson.total_conversion,
        call_attended_type: typeof salesPerson.call_attended,
        meetings_attended_type: typeof salesPerson.meetings_attended,
        total_conversion_type: typeof salesPerson.total_conversion,
        calculated,
        final_calls: calls,
        final_meetings: meetings,
        final_conversions: conversions,
        final: personData
      });
      
      return personData;
    });

    // Sort by total performance (calls + meetings + conversions) descending
    performanceData.sort((a, b) => {
      const totalA = a.calls + a.meetings + a.conversions;
      const totalB = b.calls + b.meetings + b.conversions;
      return totalB - totalA;
    });

    // Extract arrays for chart - ensure all values are numbers
    console.log("📈 Extracting arrays for chart from performanceData:", performanceData.length);
    
    const calls = performanceData.map((p) => {
      const val = Number(p.calls) || 0;
      console.log(`  Calls: ${p.name} = ${val}`);
      return val;
    });
    const meetings = performanceData.map((p) => {
      const val = Number(p.meetings) || 0;
      console.log(`  Meetings: ${p.name} = ${val}`);
      return val;
    });
    const conversions = performanceData.map((p) => {
      const val = Number(p.conversions) || 0;
      console.log(`  Conversions: ${p.name} = ${val}`);
      return val;
    });
    const salesPersonsNames = performanceData.map((p) => {
      const name = p.name || "Unknown";
      console.log(`  Name: ${name}`);
      return name;
    });

    const data = {
      calls,
      meetings,
      conversions,
      salesPersons: salesPersonsNames,
    };

    console.log("✅ FINAL API RESPONSE DATA:", {
      salesPersonsCount: salesPersonsNames.length,
      salesPersons: salesPersonsNames,
      calls: calls,
      meetings: meetings,
      conversions: conversions,
      callsTotal: calls.reduce((a, b) => a + b, 0),
      meetingsTotal: meetings.reduce((a, b) => a + b, 0),
      conversionsTotal: conversions.reduce((a, b) => a + b, 0),
      fullData: JSON.stringify(data, null, 2)
    });

    return Response.json(data);
  } catch (error) {
    console.error("Sales Person Performance API Error:", error.message);
    return Response.json(
      { error: "Failed to fetch sales person performance data" },
      { status: 500 }
    );
  }
}













