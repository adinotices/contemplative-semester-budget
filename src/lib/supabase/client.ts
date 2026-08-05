"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client using the anon key. Subject to RLS —
 * safe to expose to the client bundle.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
