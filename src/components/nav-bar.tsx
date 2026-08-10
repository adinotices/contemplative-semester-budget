import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ThemeToggle } from "./theme-toggle";

export async function NavBar() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            CS Budget
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-50">
              Dashboard
            </Link>
            <Link href="/reimburse" className="hover:text-neutral-900 dark:hover:text-neutral-50">
              Reimburse
            </Link>
            <Link href="/chat" className="hover:text-neutral-900 dark:hover:text-neutral-50">
              Chat
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
          <ThemeToggle />
          <span>{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="hover:text-neutral-900 dark:hover:text-neutral-50">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
