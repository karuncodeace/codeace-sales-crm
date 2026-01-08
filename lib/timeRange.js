/**
 * Time range normalization utility
 * Converts relative time ranges (today, this_week, etc.) into actual date ranges
 * The AI must NEVER send real dates - only relative time ranges
 */

/**
 * Converts time_range filter to actual date range
 * @param {string} timeRange - e.g., "today", "this_week", "last_week", "this_month", "last_month"
 * @returns {{startDate: Date, endDate: Date}}
 */
export function convertTimeRangeToDates(timeRange) {
  const now = new Date();
  let endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date(now);

  switch (timeRange) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "this_week":
      const dayOfWeek = now.getDay();
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "last_week":
      const lastWeekDay = now.getDay();
      startDate.setDate(now.getDate() - lastWeekDay - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - lastWeekDay - 1);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "last_7_days":
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "last_30_days":
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;

    default:
      // Default to last 7 days if unknown
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

/**
 * Formats date range for display in AI responses
 * @param {string} timeRange - The original time range string
 * @returns {string} - Human-readable time range description
 */
export function formatTimeRange(timeRange) {
  const timeRangeMap = {
    "today": "today",
    "this_week": "this week",
    "last_week": "last week",
    "this_month": "this month",
    "last_month": "last month",
    "last_7_days": "the last 7 days",
    "last_30_days": "the last 30 days"
  };

  return timeRangeMap[timeRange] || timeRange;
}

