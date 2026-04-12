import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      totalPoints: true,
      groupStagePoints: true,
      playoffPoints: true,
      statsPoints: true,
    },
    orderBy: { totalPoints: "desc" },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-4">
          <Link href="/" className="font-bold text-white">
            Tournament Predictions
          </Link>
          <Link href="/leaderboard" className="text-sm text-white font-medium">
            Leaderboard
          </Link>
          <Link href="/predictions/group-stage" className="text-sm text-zinc-400 hover:text-white ml-auto">
            My Predictions →
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Leaderboard</h1>

        {users.length === 0 ? (
          <p className="text-zinc-500">No scores yet — check back after the first answers are revealed.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-right">Group Stage</th>
                  <th className="px-4 py-3 text-right">Playoffs</th>
                  <th className="px-4 py-3 text-right">Stats</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-200">Total</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr
                    key={user.id}
                    className={`border-b border-zinc-700/50 last:border-0 ${
                      i === 0 ? "bg-yellow-900/20" : i === 1 ? "bg-zinc-700/20" : i === 2 ? "bg-orange-900/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-zinc-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.image && (
                          <Image
                            src={user.image}
                            alt={user.name ?? "User"}
                            width={28}
                            height={28}
                            className="rounded-full"
                          />
                        )}
                        <span className="font-medium">{user.name ?? "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">{user.groupStagePoints}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{user.playoffPoints}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{user.statsPoints}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{user.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
