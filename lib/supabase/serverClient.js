import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

/**
 * Creates a Supabase client with service role key that bypasses RLS
 * Use this for server-side operations that need to bypass row-level security
 */
export function supabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is not set");
  }
  
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  }
  
  try {
    const client = createClient(supabaseUrl, serviceRoleKey);
    if (!client) {
      throw new Error("Failed to create Supabase client");
    }
    return client;
  } catch (error) {
    console.error("Error creating Supabase admin client:", error);
    throw new Error(`Failed to initialize Supabase admin client: ${error.message}`);
  }
}
