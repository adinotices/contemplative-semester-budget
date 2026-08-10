import { ReimburseForm } from "./reimburse-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Request a Reimbursement — CS Budget" };

export default function ReimbursePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">Request a Reimbursement</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Submit your expense below. Requests are reviewed weekly.
        </p>
        <ReimburseForm />
      </div>
    </div>
  );
}
