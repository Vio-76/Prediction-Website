import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Category } from "@prisma/client";

const CATEGORY_LABELS: Record<Category, string> = {
  GROUP_STAGE: "Group Stage",
  PLAYOFFS: "Playoffs",
  STATS: "General Stats",
};

export default async function AdminDashboard() {
  const [questions, userCount, predictionCount] = await Promise.all([
    prisma.question.findMany({
      include: {
        answerType: true,
        correctAnswers: true,
        _count: { select: { predictions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.prediction.count(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link
          href="/admin/questions/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New Question
        </Link>
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

      {/* Questions by category */}
      {(["GROUP_STAGE", "PLAYOFFS", "STATS"] as Category[]).map((cat) => {
        const qs = questions.filter((q) => q.category === cat);
        if (qs.length === 0) return null;
        return (
          <div key={cat}>
            <h2 className="mb-3 text-lg font-semibold text-zinc-300">
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="space-y-2">
              {qs.map((q) => {
                const closed = q.isLocked || q.deadline < new Date();
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
                      {closed ? (
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

      {questions.length === 0 && (
        <p className="text-zinc-500">No questions yet. Create one to get started.</p>
      )}
    </div>
  );
}
