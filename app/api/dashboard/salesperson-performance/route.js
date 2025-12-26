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
        .select("id, sales_person_id, user_id, name, call_attended, meetings_attended, total_conversions");
    } else if (crmUser.role === "sales" && crmUser.salesPersonId) {
      // Sales users see only their own record
      queryBuilder = supabase
        .from("sales_persons")
        .select("id, sales_person_id, user_id, name, call_attended, meetings_attended, total_conversions")
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
            .select("id, sales_person_id, user_id, name");
        } else {
          basicQueryBuilder = supabase
            .from("sales_persons")
            .select("id, sales_person_id, user_id, name")
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
            .select("id, sales_person_id, user_id, name, call_attended, meetings_attended, total_conversions");
          
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
              .select("id, sales_person_id, user_id, name");
            
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
    }

    // If we still have an error after fallback, return empty data instead of error
    // This allows the dashboard to still load
    if (salesPersonsError) {
      console.error("❌ Final error fetching sales persons:", salesPersonsError);
      // Return empty data instead of error to prevent dashboard from breaking
      return Response.json({
        calls: [],
        meetings: [],
        conversions: [],
        salesPersons: []
      });
    }

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
          sales_person_id: user.id,
          user_id: user.id,
          name: user.name || user.email?.split("@")[0] || "Unknown",
          call_attended: 0, // Default to 0 since we don't have this data
          meetings_attended: 0,
          total_conversions: 0
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

    // Map sales persons data to performance metrics
    const performanceData = salesPersons.map((salesPerson) => {
      // Get name from sales_persons.name, or from users table, or use sales_person_id
      let salesPersonName = salesPerson.name;
      if (!salesPersonName && salesPerson.user_id) {
        salesPersonName = userNamesMap[salesPerson.user_id];
      }
      if (!salesPersonName) {
        salesPersonName = salesPerson.sales_person_id || "Unknown";
      }

      return {
        name: salesPersonName,
        calls: salesPerson.call_attended !== null && salesPerson.call_attended !== undefined 
          ? parseInt(salesPerson.call_attended) || 0 
          : 0,
        meetings: salesPerson.meetings_attended !== null && salesPerson.meetings_attended !== undefined 
          ? parseInt(salesPerson.meetings_attended) || 0 
          : 0,
        conversions: salesPerson.total_conversions !== null && salesPerson.total_conversions !== undefined 
          ? parseInt(salesPerson.total_conversions) || 0 
          : 0,
      };
    });

    // Sort by total performance (calls + meetings + conversions) descending
    performanceData.sort((a, b) => {
      const totalA = a.calls + a.meetings + a.conversions;
      const totalB = b.calls + b.meetings + b.conversions;
      return totalB - totalA;
    });

    // Extract arrays for chart
    const calls = performanceData.map((p) => p.calls);
    const meetings = performanceData.map((p) => p.meetings);
    const conversions = performanceData.map((p) => p.conversions);
    const salesPersonsNames = performanceData.map((p) => p.name);

    const data = {
      calls,
      meetings,
      conversions,
      salesPersons: salesPersonsNames,
    };

    return Response.json(data);
  } catch (error) {
    console.error("Sales Person Performance API Error:", error.message);
    return Response.json(
      { error: "Failed to fetch sales person performance data" },
      { status: 500 }
    );
  }
}













