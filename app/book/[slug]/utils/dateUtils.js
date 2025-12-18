/**
 * Get user's local timezone
 */
export function getUserTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get local date key for an ISO string (YYYY-MM-DD format in user's timezone)
 */
export function getLocalDateKey(isoString, timeZone = null) {
    const tz = timeZone || getUserTimeZone();
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(isoString));
}

/**
 * Calculate date range for next N days
 * @param {number} days - Number of days to fetch
 * @returns {Object} Object with startDateISO and endDateISO
 */
export function getDateRangeForNextDays(days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    return {
        startDateISO: today.toISOString(),
        endDateISO: endDate.toISOString(),
    };
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString() {
    return new Date().toISOString().split("T")[0];
}

