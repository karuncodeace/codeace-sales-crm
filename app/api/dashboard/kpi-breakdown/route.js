import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

/**
 * Helper function to determine which quarter a date belongs to
 * Q1: April - June
 * Q2: July - September
 * Q3: October - December
 * Q4: January - March
 */
function getQuarter(date) {
  const month = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
  if (month >= 4 && month <= 6) return 1; // April - June
  if (month >= 7 && month <= 9) return 2; // July - September
  if (month >= 10 && month <= 12) return 3; // October - December
  return 4; // January - March
}

/**
 * Helper function to get the current fiscal year
 * Fiscal year starts in April, so if we're in Jan-Mar, the fiscal year is the previous calendar year
 */
function getCurrentFiscalYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  // If we're in Q4 (Jan-Mar), fiscal year is previous year
  return month >= 1 && month <= 3 ? year - 1 : year;
}

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get current fiscal year
    const fiscalYear = getCurrentFiscalYear();
    
    // Calculate date range for the current fiscal year (April of fiscal year to March of next year)
    const startDate = new Date(fiscalYear, 3, 1); // April 1
    const endDate = new Date(fiscalYear + 1, 2, 31, 23, 59, 59); // March 31 of next year

    console.log("📊 KPI Breakdown - Fetching data for fiscal year:", fiscalYear);
    console.log("📅 Date range:", {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    // Fetch all task_activities - we'll filter by type in JavaScript to handle case variations
    // within the current fiscal year
    const { data: allActivities, error: fetchError } = await supabase
      .from("task_activities")
      .select("type, created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (fetchError) {
      console.error("❌ Error fetching task_activities:", fetchError);
      // Return empty data instead of error
      return Response.json({
        calls: [0, 0, 0, 0],
        meetings: [0, 0, 0, 0],
        conversions: [0, 0, 0, 0],
        categories: ["Q1", "Q2", "Q3", "Q4"]
      });
    }

    console.log("📊 Fetched all activities count:", allActivities?.length || 0);

    // Filter activities by type (case-insensitive matching)
    // Support both "Call"/"call", "Meetings"/"meetings"/"meeting", "Conversion"/"conversion"
    const activities = (allActivities || []).filter(activity => {
      if (!activity.type) return false;
      const typeLower = activity.type.toLowerCase();
      return typeLower === "call" || 
             typeLower === "meetings" || 
             typeLower === "meeting" ||
             typeLower === "conversion";
    });

    console.log("📊 Filtered activities count (Call/Meetings/Conversion):", activities.length);
    
    // Log unique types found for debugging
    const uniqueTypes = [...new Set((allActivities || []).map(a => a.type))];
    console.log("📊 Unique types found in database:", uniqueTypes);

    // Initialize quarter counters
    const quarterData = {
      1: { calls: 0, meetings: 0, conversions: 0 }, // Q1: April - June
      2: { calls: 0, meetings: 0, conversions: 0 }, // Q2: July - September
      3: { calls: 0, meetings: 0, conversions: 0 }, // Q3: October - December
      4: { calls: 0, meetings: 0, conversions: 0 }, // Q4: January - March
    };

    // Process each activity and group by quarter
    if (activities && activities.length > 0) {
      activities.forEach((activity) => {
        if (!activity.created_at) return;
        
        const activityDate = new Date(activity.created_at);
        const quarter = getQuarter(activityDate);
        const type = activity.type?.toLowerCase(); // Normalize to lowercase for comparison

        if (type === "call") {
          quarterData[quarter].calls++;
        } else if (type === "meetings" || type === "meeting") {
          quarterData[quarter].meetings++;
        } else if (type === "conversion") {
          quarterData[quarter].conversions++;
        }
      });
    }

    console.log("📊 Quarter data:", quarterData);

    // Format data for chart (Q1, Q2, Q3, Q4 order)
    const data = {
      calls: [
        quarterData[1].calls,
        quarterData[2].calls,
        quarterData[3].calls,
        quarterData[4].calls,
      ],
      meetings: [
        quarterData[1].meetings,
        quarterData[2].meetings,
        quarterData[3].meetings,
        quarterData[4].meetings,
      ],
      conversions: [
        quarterData[1].conversions,
        quarterData[2].conversions,
        quarterData[3].conversions,
        quarterData[4].conversions,
      ],
      categories: ["Q1", "Q2", "Q3", "Q4"],
    };

    console.log("✅ Final KPI Breakdown data:", data);

    return Response.json(data);
  } catch (error) {
    console.error("❌ KPI Breakdown API Error:", error.message);
    return Response.json(
      {
        calls: [0, 0, 0, 0],
        meetings: [0, 0, 0, 0],
        conversions: [0, 0, 0, 0],
        categories: ["Q1", "Q2", "Q3", "Q4"],
      },
      { status: 500 }
    );
  }
}
