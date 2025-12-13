import { supabaseServer } from "../supabase/serverClient";

/**
 * Gets the CRM user information by matching authenticated user's email with sales_persons table
 * @returns {Promise<{id: string, role: string, email: string} | null>}
 * Returns null if user is not found in sales_persons table
 */
export async function getCrmUser() {
  try {
    const supabase = await supabaseServer();
    
    // Get authenticated user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || !user.email) {
      console.warn("getCrmUser: No authenticated user found", { authError, hasUser: !!user, email: user?.email });
      return null;
    }

    // Normalize the auth email: lowercase and trim whitespace
    const normalizedAuthEmail = user.email.toLowerCase().trim();
    console.log("getCrmUser: Normalized auth email:", normalizedAuthEmail);

    // Match email with sales_persons table using case-insensitive comparison
    // Fetch all sales persons and match in JavaScript for better control
    const { data: allSalesPersons, error: fetchError } = await supabase
      .from("sales_persons")
      .select("id, email, roles");

    if (fetchError) {
      console.error("getCrmUser: Error fetching sales_persons:", fetchError);
      return null;
    }

    if (!allSalesPersons || allSalesPersons.length === 0) {
      console.warn("getCrmUser: No sales persons found in table");
      return null;
    }

    // Find matching sales person by normalizing both emails
    const salesPerson = allSalesPersons.find(sp => {
      if (!sp.email) return false;
      const normalizedDbEmail = sp.email.toLowerCase().trim();
      return normalizedDbEmail === normalizedAuthEmail;
    });

    if (!salesPerson) {
      console.warn("getCrmUser: Sales person not found", {
        authEmail: normalizedAuthEmail,
        authEmailOriginal: user.email,
        availableEmails: allSalesPersons.map(sp => ({
          id: sp.id,
          original: sp.email,
          normalized: sp.email?.toLowerCase().trim(),
          matches: sp.email?.toLowerCase().trim() === normalizedAuthEmail
        }))
      });
      return null;
    }

    // Normalize role to lowercase for consistent comparison
    const normalizedRole = (salesPerson.roles || "").toLowerCase().trim();

    console.log("getCrmUser: Found user", {
      id: salesPerson.id,
      role: normalizedRole,
      dbEmail: salesPerson.email,
      normalizedDbEmail: salesPerson.email?.toLowerCase().trim(),
      authEmail: normalizedAuthEmail,
      match: salesPerson.email?.toLowerCase().trim() === normalizedAuthEmail
    });

    return {
      id: salesPerson.id, // e.g., "SP-01"
      role: normalizedRole, // "admin" or "salesperson" (normalized)
      email: salesPerson.email, // Return original email from DB
    };
  } catch (error) {
    console.error("Error getting CRM user:", error);
    return null;
  }
}

/**
 * Returns a filtered Supabase query based on user role
 * @param {object} supabase - Supabase client instance
 * @param {string} tableName - Table name (e.g., "leads_table", "tasks_table", "appointments")
 * @param {object} crmUser - CRM user object with {id, role}
 * @returns {object} - Supabase query builder
 */
export function getFilteredQuery(supabase, tableName, crmUser) {
  if (!crmUser) {
    // If no user, return empty query (will fail)
    return supabase.from(tableName).select("*").eq("id", "NONEXISTENT");
  }

  // Admin can see everything (case-insensitive check)
  if (crmUser.role === "admin") {
    return supabase.from(tableName).select("*");
  }

  // Salesperson can only see their assigned data (case-insensitive check)
  if (crmUser.role === "salesperson") {
    if (tableName === "leads_table") {
      return supabase
        .from("leads_table")
        .select("*")
        .eq("assigned_to", crmUser.id);
    }
    
    if (tableName === "tasks_table") {
      return supabase
        .from("tasks_table")
        .select("*")
        .eq("sales_person_id", crmUser.id);
    }
    
    if (tableName === "appointments") {
      return supabase
        .from("appointments")
        .select("*")
        .eq("salesperson_id", crmUser.id);
    }
    
    // For other tables, return empty query if no specific rule
    return supabase.from(tableName).select("*").eq("id", "NONEXISTENT");
  }

  // Unknown role, return empty query
  return supabase.from(tableName).select("*").eq("id", "NONEXISTENT");
}

/**
 * Checks if user is authorized to access CRM
 * @returns {Promise<boolean>}
 */
export async function isAuthorized() {
  const crmUser = await getCrmUser();
  return crmUser !== null;
}

