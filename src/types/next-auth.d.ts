import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    /** Epoch ms of the last team_members role lookup — see the jwt callback in src/auth.ts. */
    roleCheckedAt?: number;
  }
}
