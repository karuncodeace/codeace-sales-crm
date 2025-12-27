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

    // Fetch all tasks from tasks_table - filter by type field
    // within the current fiscal year
    const { data: allTasks, error: fetchError } = await supabase
      .from("tasks_table")
      .select("type, created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (fetchError) {
      return Response.json({
        calls: [0, 0, 0, 0],
        meetings: [0, 0, 0, 0],
        conversions: [0, 0, 0, 0],
        categories: ["Q1", "Q2", "Q3", "Q4"]
      });
    }

    // Filter tasks by type field (case-insensitive)
    const tasks = (allTasks || []).filter(task => {
      const typeLower = (task.type || "").toLowerCase();
      return typeLower === "call" || 
             typeLower === "meetings" || 
             typeLower === "meeting" ||
             typeLower === "conversion";
    });

    // Initialize quarter counters
    const quarterData = {
      1: { calls: 0, meetings: 0, conversions: 0 }, // Q1: April - June
      2: { calls: 0, meetings: 0, conversions: 0 }, // Q2: July - September
      3: { calls: 0, meetings: 0, conversions: 0 }, // Q3: October - December
      4: { calls: 0, meetings: 0, conversions: 0 }, // Q4: January - March
    };

    // Process each task and group by quarter
    if (tasks && tasks.length > 0) {
      tasks.forEach((task) => {
        if (!task.created_at) return;
        
        const taskDate = new Date(task.created_at);
        const quarter = getQuarter(taskDate);
        const typeLower = (task.type || "").toLowerCase();

        // Count by type
        if (typeLower === "call") {
          quarterData[quarter].calls++;
        } else if (typeLower === "meetings" || typeLower === "meeting") {
          quarterData[quarter].meetings++;
        } else if (typeLower === "conversion") {
          quarterData[quarter].conversions++;
        }
      });
    }

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

    // Ensure all arrays have exactly 4 elements
    while (data.calls.length < 4) data.calls.push(0);
    while (data.meetings.length < 4) data.meetings.push(0);
    while (data.conversions.length < 4) data.conversions.push(0);

    return Response.json(data);
  } catch (error) {
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
