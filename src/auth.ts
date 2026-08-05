import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase/server";

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
    async jwt({ token, user }) {
      if (user?.email) {
        const { data } = await supabaseAdmin()
          .from("team_members")
          .select("role, name")
          .eq("email", user.email.toLowerCase())
          .maybeSingle();
        token.role = data?.role ?? "viewer";
        token.name = data?.name ?? token.name;
      }
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
