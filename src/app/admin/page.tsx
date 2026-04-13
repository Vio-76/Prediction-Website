import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Category } from "@prisma/client";

const CATEGORY_LABELS: Record<Category, string> = {
  GROUP_STAGE: "Group Stage",
  PLAYOFFS: "Playoffs",
  STATS: "Stats",
};

function formatDeadline(d: Date | null | undefined): string {
  if (!d) return "No deadline";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminDashboard() {
  const [questions, groups, userCount, predictionCount, categorySettings, bracket] =
    await Promise.all([
      prisma.question.findMany({
        include: {
          answerType: true,
          correctAnswers: true,
          _count: { select: { predictions: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tournamentGroup.findMany({
        include: {
          teams: { select: { finalPosition: true } },
          _count: { select: { predictions: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.count(),
      prisma.prediction.count(),
      prisma.categorySettings.findMany(),
      prisma.bracketTournament.findFirst({
        select: { id: true, name: true, deadline: true, isLocked: true },
      }),
    ]);

  type CS = { category: string; deadline: Date | null; isLocked: boolean };
  const groupSettings = (categorySettings as CS[]).find((s) => s.category === "GROUP_STAGE");
  const statsSettings = (categorySettings as CS[]).find((s) => s.category === "STATS");

  const groupStageClosed =
    groupSettings?.isLocked ||
    (groupSettings?.deadline != null && groupSettings.deadline < new Date());
  const statsClosed =
    statsSettings?.isLocked ||
    (statsSettings?.deadline != null && statsSettings.deadline < new Date());
  const bracketClosed =
    bracket?.isLocked ||
    (bracket?.deadline != null && bracket.deadline < new Date());

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/groups/new"
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600"
          >
            + New Group
          </Link>
          <Link
            href="/admin/questions/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + New Question
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: userCount },
          { label: "Total Questions", value: questions.length },
          { label: "Total Predictions", value: predictionCount },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">{s.label}</p>
            <p className="text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Deadlines card */}
      <div className="rounded-lg bg-zinc-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-200">Deadlines &amp; Locks</h2>
          <Link href="/admin/category-settings" className="text-xs text-zinc-500 hover:text-zinc-300">
            Edit →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {(
            [
              { label: "Group Stage", deadline: groupSettings?.deadline, closed: groupStageClosed, href: "/admin/category-settings" },
              {
                label: "Playoffs (bracket)",
                deadline: bracket?.deadline,
                closed: bracketClosed,
                href: "/admin/bracket",
              },
              { label: "Stats", deadline: statsSettings?.deadline, closed: statsClosed, href: "/admin/category-settings" },
            ] as { label: string; deadline: Date | null | undefined; closed: boolean | null | undefined; href: string }[]
          ).map(({ label, deadline, closed, href }) => (
            <Link key={label} href={href} className="rounded-lg bg-zinc-700 p-3 hover:bg-zinc-600 transition-colors">
              <p className="text-xs text-zinc-400 mb-1">{label}</p>
              <p className="text-zinc-200 text-xs">{formatDeadline(deadline)}</p>
              <span
                className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${
                  closed ? "bg-zinc-600 text-zinc-400" : "bg-green-900 text-green-300"
                }`}
              >
                {closed ? "Closed" : "Open"}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bracket management shortcut */}
      <div className="flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-3">
        <div>
          <p className="font-medium">
            {bracket ? bracket.name : "Playoffs Bracket"}
          </p>
          <p className="text-xs text-zinc-400">
            {bracket ? "Manage rounds, matches and results" : "No bracket created yet"}
          </p>
        </div>
        <Link
          href="/admin/bracket"
          className="rounded bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600"
        >
          {bracket ? "Manage" : "Create"}
        </Link>
      </div>

      {/* Group Stage groups */}
      {groups.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-300">Group Stage</h2>
            <Link href="/admin/groups" className="text-xs text-zinc-500 hover:text-zinc-300">
              Manage all →
            </Link>
          </div>
          <div className="space-y-2">
            {groups.map((group) => {
              const hasResults = group.teams.every(
                (t: { finalPosition: number | null }) => t.finalPosition !== null
              );
              return (
                <div
                  key={group.id}
                  className="flex items-center gap-4 rounded-lg bg-zinc-800 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{group.name}</p>
                    <p className="text-xs text-zinc-400">
                      {group.teams.length} teams · {group.pointValue} pt
                      {group.pointValue !== 1 ? "s" : ""} per placement ·{" "}
                      {group._count.predictions} prediction
                      {group._count.predictions !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {groupStageClosed ? (
                      <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">Closed</span>
                    ) : (
                      <span className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">Open</span>
                    )}
                    {hasResults ? (
                      <span className="rounded bg-indigo-900 px-2 py-0.5 text-xs text-indigo-300">Results set</span>
                    ) : (
                      <span className="rounded bg-amber-900 px-2 py-0.5 text-xs text-amber-300">Pending</span>
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
      )}

      {/* Questions by category (STATS only now — PLAYOFFS handled by bracket) */}
      {(["STATS"] as Category[]).map((cat) => {
        const qs = questions.filter((q: { category: Category }) => q.category === cat);
        if (qs.length === 0) return null;
        const catClosed = cat === "STATS" ? statsClosed : false;
        return (
          <div key={cat}>
            <h2 className="mb-3 text-lg font-semibold text-zinc-300">
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="space-y-2">
              {qs.map((q: { id: string; text: string; answerType: { name: string }; pointValue: number; correctAnswers: unknown[]; _count: { predictions: number } }) => {
                const answered = q.correctAnswers.length > 0;
                return (
                  <div
                    key={q.id}
                    className="flex items-center gap-4 rounded-lg bg-zinc-800 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{q.text}</p>
                      <p className="text-xs text-zinc-400">
                        {q.answerType.name} · {q.pointValue} pt
                        {q.pointValue !== 1 ? "s" : ""} ·{" "}
                        {q._count.predictions} prediction
                        {q._count.predictions !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {catClosed ? (
                        <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                          Closed
                        </span>
                      ) : (
                        <span className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">
                          Open
                        </span>
                      )}
                      {answered ? (
                        <span className="rounded bg-indigo-900 px-2 py-0.5 text-xs text-indigo-300">
                          Answered
                        </span>
                      ) : (
                        <span className="rounded bg-amber-900 px-2 py-0.5 text-xs text-amber-300">
                          Pending
                        </span>
                      )}
                      <Link
                        href={`/admin/questions/${q.id}`}
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
      })}

      {questions.length === 0 && groups.length === 0 && !bracket && (
        <p className="text-zinc-500">No groups, questions, or bracket yet. Create one to get started.</p>
      )}
    </div>
  );
}
