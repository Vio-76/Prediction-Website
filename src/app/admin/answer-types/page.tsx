import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AnswerTypesPage() {
  const answerTypes = await prisma.answerType.findMany({
    include: {
      items: { orderBy: { name: "asc" } },
      _count: { select: { questions: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Answer Types</h1>
        <Link
          href="/admin/answer-types/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New Answer Type
        </Link>
      </div>

      {answerTypes.length === 0 && (
        <p className="text-zinc-500">
          No answer types yet. Create one to start building questions.
        </p>
      )}

      <div className="space-y-4">
        {answerTypes.map((at) => (
          <div key={at.id} className="rounded-lg bg-zinc-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold">{at.name}</h2>
                <p className="text-xs text-zinc-400">
                  {at.items.length} item{at.items.length !== 1 ? "s" : ""} ·{" "}
                  {at._count.questions} question{at._count.questions !== 1 ? "s" : ""}
                </p>
              </div>
              <Link
                href={`/admin/answer-types/${at.id}`}
                className="rounded bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600"
              >
                Manage
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {at.items.map((item) => (
                <span
                  key={item.id}
                  className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300"
                >
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
