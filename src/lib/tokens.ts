import { randomBytes } from "crypto";

export function generateApprovalToken(): string {
  return randomBytes(32).toString("base64url");
}
