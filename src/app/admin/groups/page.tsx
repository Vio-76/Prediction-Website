import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminGroupsPage() {
  const groups = await prisma.tournamentGroup.findMany({
    include: {
      teams: {
        include: { answerItem: { select: { name: true } } },
        orderBy: { answerItem: { name: "asc" } },
      },
      _count: { select: { predictions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Group Stage Groups</h1>
        <Link
          href="/admin/groups/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New Group
        </Link>
      </div>

      {groups.length === 0 && (
        <p className="text-zinc-500">No groups yet. Create one to get started.</p>
      )}

      <div className="space-y-3">
        {groups.map((group) => {
          const closed = group.isLocked || group.deadline < new Date();
          const hasResults = group.teams.every((t) => t.finalPosition !== null);
          return (
            <div
              key={group.id}
              className="flex items-center gap-4 rounded-lg bg-zinc-800 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-zinc-400">
                  {group.teams.length} teams · {group.pointValue} pt
                  {group.pointValue !== 1 ? "s" : ""} per correct placement ·{" "}
                  {group._count.predictions} prediction
                  {group._count.predictions !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {closed ? (
                  <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">Closed</span>
                ) : (
                  <span className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">Open</span>
                )}
                {hasResults ? (
                  <span className="rounded bg-indigo-900 px-2 py-0.5 text-xs text-indigo-300">Results set</span>
                ) : (
                  <span className="rounded bg-amber-900 px-2 py-0.5 text-xs text-amber-300">Pending results</span>
                )}
                <Link
                  href={`/admin/groups/${group.id}`}
                  className="rounded bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600"
                >
                  Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
