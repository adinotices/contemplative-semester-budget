"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/projected", label: "Projected" },
  { href: "/admin/staff-comp", label: "Staff Compensation" },
  { href: "/admin/reconciliation", label: "Reconciliation" },
];

export function DashboardTabsClient() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-neutral-900 font-medium text-neutral-900 dark:border-neutral-50 dark:text-neutral-50"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
