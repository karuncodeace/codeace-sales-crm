import { supabaseServer } from "../supabase/serverClient";

/**
 * Gets the CRM user information by matching authenticated user's email with users table
 * @returns {Promise<{id: string, role: string, email: string} | null>}
 * Returns null if user is not found in users table
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

    // Match email with users table using case-insensitive comparison
    // Fetch all users and match in JavaScript for better control
    const { data: allUsers, error: fetchError } = await supabase
      .from("users")
      .select("id, email, role");

    if (fetchError) {
      console.error("getCrmUser: Error fetching users:", fetchError);
      return null;
    }

    if (!allUsers || allUsers.length === 0) {
      console.warn("getCrmUser: No users found in table");
      return null;
    }

    // Find matching user by normalizing both emails
    const dbUser = allUsers.find(u => {
      if (!u.email) return false;
      const normalizedDbEmail = u.email.toLowerCase().trim();
      return normalizedDbEmail === normalizedAuthEmail;
    });

    if (!dbUser) {
      console.warn("getCrmUser: User not found in users table", {
        authEmail: normalizedAuthEmail,
        authEmailOriginal: user.email,
        authUserId: user.id,
        availableEmails: allUsers.map(u => ({
          id: u.id,
          original: u.email,
          normalized: u.email?.toLowerCase().trim(),
          matches: u.email?.toLowerCase().trim() === normalizedAuthEmail
        }))
      });
      
      // Try to auto-create user in users table if they don't exist
      try {
        const insertData = {
          email: user.email,
          role: "sales", // Default role, can be updated by admin later
        };
        
        // Try to use auth user ID if users table supports it
        // Some setups use auth.users.id directly, others have separate IDs
        if (user.id) {
          insertData.id = user.id;
        }
        
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert(insertData)
          .select()
          .single();
        
        if (createError) {
          // If user already exists (race condition), try to fetch again
          if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
            const { data: existingUser } = await supabase
              .from("users")
              .select("id, email, role")
              .ilike("email", normalizedAuthEmail)
              .maybeSingle();
            
            if (existingUser) {
              return {
                id: existingUser.id,
                role: (existingUser.role || "sales").toLowerCase().trim(),
                email: existingUser.email,
              };
            }
          }
          
          console.error("getCrmUser: Error creating user:", createError);
          // Don't return null immediately - the user might need to be added manually
          // Return a helpful error structure or null
          return null;
        }
        
        if (newUser) {
          console.log("getCrmUser: Created new user", {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role
          });
          
          return {
            id: newUser.id,
            role: (newUser.role || "sales").toLowerCase().trim(),
            email: newUser.email,
          };
        }
      } catch (createErr) {
        console.error("getCrmUser: Exception creating user:", createErr);
      }
      
      // If we get here, user creation failed or user doesn't exist
      // User needs to be added to users table manually by admin
      return null;
    }

    // Normalize role to lowercase for consistent comparison
    const normalizedRole = (dbUser.role || "").toLowerCase().trim();

    console.log("getCrmUser: Found user", {
      id: dbUser.id,
      role: normalizedRole,
      dbEmail: dbUser.email,
      normalizedDbEmail: dbUser.email?.toLowerCase().trim(),
      authEmail: normalizedAuthEmail,
      match: dbUser.email?.toLowerCase().trim() === normalizedAuthEmail
    });

    // For sales users, also fetch the sales_person_id from sales_persons table
    let salesPersonId = null;
    if (normalizedRole === "sales") {
      try {
        const { data: salesPerson, error: spError } = await supabase
          .from("sales_persons")
          .select("id")
          .eq("user_id", dbUser.id)
          .maybeSingle();
        
        if (!spError && salesPerson) {
          salesPersonId = salesPerson.id;
          console.log("getCrmUser: Found sales_person_id", {
            userId: dbUser.id,
            salesPersonId: salesPersonId
          });
        } else if (spError) {
          console.warn("getCrmUser: Error fetching sales_person", spError);
        }
      } catch (err) {
        console.warn("getCrmUser: Exception fetching sales_person", err);
      }
    }

    return {
      id: dbUser.id,
      role: normalizedRole, // "admin" or "sales" (normalized)
      email: dbUser.email, // Return original email from DB
      salesPersonId: salesPersonId, // sales_persons.id for filtering leads/tasks
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

  // Sales can only see their assigned data (case-insensitive check)
  if (crmUser.role === "sales") {
    // Get sales_person_id from the relationship: users.id -> sales_persons.user_id -> sales_persons.id
    const salesPersonId = crmUser.salesPersonId;
    
    if (!salesPersonId) {
      // If no sales_person_id found, return empty query
      console.warn("getFilteredQuery: No sales_person_id found for user", crmUser.id);
      return supabase.from(tableName).select("*").eq("id", "NONEXISTENT");
    }
    
    if (tableName === "leads_table") {
      // leads_table.assigned_to references sales_persons.id
      // Relationship: users.id -> sales_persons.user_id -> sales_persons.id -> leads_table.assigned_to
      return supabase
        .from("leads_table")
        .select("*")
        .eq("assigned_to", salesPersonId);
    }
    
    if (tableName === "tasks_table") {
      // tasks_table.sales_person_id references sales_persons.id
      return supabase
        .from("tasks_table")
        .select("*")
        .eq("sales_person_id", salesPersonId);
    }
    
    if (tableName === "appointments") {
      // appointments.salesperson_id references sales_persons.id
      return supabase
        .from("appointments")
        .select("*")
        .eq("salesperson_id", salesPersonId);
    }
    
    if (tableName === "stage_notes") {
      // Sales users can see stage_notes for leads assigned to them
      // We'll filter this in the API route using a subquery approach
      // For now, return a query that will be filtered by lead_id in the API
      return supabase.from("stage_notes").select("*");
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

