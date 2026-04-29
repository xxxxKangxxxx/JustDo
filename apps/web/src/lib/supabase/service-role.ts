import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Supabase } from "./client";
import type { Database } from "./database.types";

let cached: Supabase | null = null;

export const getSupabaseServiceRoleClient = (): Supabase => {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Service-role clients may only be created in server-only modules.",
    );
  }

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
};
