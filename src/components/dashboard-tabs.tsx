import { auth } from "@/auth";
import { DashboardTabsClient } from "./dashboard-tabs-client";

export async function DashboardTabs() {
  const session = await auth();
  if (session?.user?.role !== "admin") return null;
  return <DashboardTabsClient />;
}
