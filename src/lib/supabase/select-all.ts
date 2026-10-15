import type { PostgrestError } from "@supabase/supabase-js";

type Page<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/**
 * PostgREST caps every response at 1,000 rows (the project's max-rows
 * setting) and truncates silently, so a plain `select` over the whole ledger
 * would under-count totals once it outgrows that. This pages through with
 * `.range()` until a short page comes back.
 *
 * `page` must build a fresh query each call and include a stable `.order()`
 * (ending in a unique column such as `id`), or rows can repeat or go missing
 * between pages. Returns the same `{ data, error }` shape as a single query.
 */
export async function selectAll<T>(
  page: (from: number, to: number) => Page<T>,
  pageSize = 1000,
): Promise<{ data: T[] | null; error: PostgrestError | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}
