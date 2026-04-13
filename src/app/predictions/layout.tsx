import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";

const TABS = [
  { href: "/predictions/group-stage", label: "Group Stage" },
  { href: "/predictions/playoffs", label: "Playoffs" },
  { href: "/predictions/stats", label: "Stats" },
];

export default async function PredictionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const admin = isAdmin(session?.user?.discordId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top nav */}
      <nav className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-4">
          <Link href="/predictions/group-stage" className="font-bold text-white">
            Predictions
          </Link>
          <Link href="/leaderboard" className="text-sm text-zinc-400 hover:text-white">
            Leaderboard
          </Link>
          {admin && (
            <Link href="/admin" className="text-sm text-indigo-400 hover:text-indigo-300">
              Admin
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-zinc-400">{session?.user?.name}</span>
            <Link
              href="/api/auth/signout"
              className="text-sm text-zinc-500 hover:text-white"
            >
              Sign out
            </Link>
          </div>
        </div>
        {/* Category tabs */}
        <div className="mx-auto max-w-4xl px-4 flex gap-1 pb-0">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-zinc-600 transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
