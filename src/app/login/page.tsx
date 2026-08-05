import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">
          Contemplative Semester Budget
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          Sign in with your organization Google account.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl || "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sign in with Google
          </button>
        </form>
        <p className="mt-6 text-xs text-neutral-400">
          Access is limited to allowlisted team members.
        </p>
      </div>
    </div>
  );
}
