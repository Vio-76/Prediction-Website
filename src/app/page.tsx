import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/predictions/group-stage");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <nav className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <span className="font-bold">Tournament Predictions</span>
          <Link href="/leaderboard" className="text-sm text-zinc-400 hover:text-white">
            Leaderboard
          </Link>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Tournament Predictions
            </h1>
            <p className="text-zinc-400">
              Make your picks, earn points, and climb the leaderboard.
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/predictions/group-stage" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-6 py-3 font-semibold text-white hover:bg-[#4752c4] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.034.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Sign in with Discord
            </button>
          </form>

          <p className="text-xs text-zinc-600">
            Only your Discord username and avatar are used — no email.
          </p>
        </div>
      </main>
    </div>
  );
}
