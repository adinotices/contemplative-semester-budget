import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase/server";

/** How stale a cached role claim may get before it's re-read from team_members. */
const ROLE_REFRESH_MS = 5 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * Allowlist gate: only emails present in team_members may sign in.
     * This is the app-layer half of the two-layer access control in §7 —
     * Postgres RLS (supabase/migrations/0001_init.sql) is the backstop.
     */
    async signIn({ user }) {
      if (!user.email) return false;
      const { data, error } = await supabaseAdmin()
        .from("team_members")
        .select("id")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();
      if (error) {
        console.error("signIn allowlist check failed", error);
        return false;
      }
      return Boolean(data);
    },
    /**
     * Roles were previously resolved only at sign-in, so revoking someone's
     * admin access (or removing them from team_members entirely) had no
     * effect until their JWT expired. Re-check periodically instead of on
     * every request — this callback runs on each session read, and a lookup
     * per request is more load than an org this size needs.
     */
    async jwt({ token, user }) {
      const email = (user?.email ?? token.email) as string | undefined;
      if (!email) return token;

      const lastChecked = (token.roleCheckedAt as number | undefined) ?? 0;
      const isFreshLogin = Boolean(user?.email);
      if (!isFreshLogin && Date.now() - lastChecked < ROLE_REFRESH_MS) return token;

      const { data, error } = await supabaseAdmin()
        .from("team_members")
        .select("role, name")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      // On a lookup failure keep the existing claims rather than silently
      // downgrading a real admin because the database blipped.
      if (error) {
        console.error("jwt role refresh failed", error);
        return token;
      }

      token.role = data?.role ?? "viewer";
      token.name = data?.name ?? token.name;
      token.roleCheckedAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as string | undefined) ?? "viewer";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
