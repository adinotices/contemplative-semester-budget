import { auth } from "@/auth";

/** Server-side guard for /api/admin/* routes. Middleware already blocks
 * page navigation for non-admins; this re-checks at the API layer since
 * fetch calls can bypass page-level redirects. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}
