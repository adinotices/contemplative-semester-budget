import { ReimburseForm } from "./reimburse-form";

export const metadata = { title: "Request a Reimbursement — CS Budget" };

export default function ReimbursePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Request a Reimbursement</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Submit your expense below. Requests are reviewed weekly.
        </p>
        <ReimburseForm />
      </div>
    </div>
  );
}
