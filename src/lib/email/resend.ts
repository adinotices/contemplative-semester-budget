import { Resend } from "resend";

let client: Resend | null = null;

export function resend(): Resend {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY environment variable");
  client = new Resend(key);
  return client;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "budget@contemplativesemester.org";
export const APPROVER_EMAIL = process.env.APPROVER_EMAIL; // Aditya
export const ACCOUNTANT_EMAILS = (process.env.ACCOUNTANT_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean); // Jaycel/Melissa
