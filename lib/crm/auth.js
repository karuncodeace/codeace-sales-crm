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
      return null;
    }

    // Match email with sales_persons table
    const { data: salesPerson, error: salesPersonError } = await supabase
      .from("sales_persons")
      .select("id, email, roles")
      .eq("email", user.email)
      .single();

    if (salesPersonError || !salesPerson) {
      return null;
    }

    return {
      id: salesPerson.id, // e.g., "SP-01"
      role: salesPerson.roles, // "admin" or "salesperson"
      email: salesPerson.email,
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

  // Admin can see everything
  if (crmUser.role === "admin") {
    return supabase.from(tableName).select("*");
  }

  // Salesperson can only see their assigned data
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

