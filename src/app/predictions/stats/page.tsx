import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PredictionsView from "@/components/PredictionsView";

export default async function StatsPage() {
  const session = await auth();

  const [questions, predictions, categorySettings] = await Promise.all([
    prisma.question.findMany({
      where: { category: "STATS" },
      include: {
        answerType: { include: { items: { orderBy: { name: "asc" } } } },
        correctAnswers: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    session?.user?.id
      ? prisma.prediction.findMany({
          where: {
            userId: session.user.id,
            question: { category: "STATS" },
          },
          include: { answerItem: true },
        })
      : Promise.resolve([]),
    prisma.categorySettings.findUnique({ where: { category: "STATS" } }),
  ]);

  const isClosed =
    categorySettings?.isLocked ||
    (categorySettings?.deadline != null && categorySettings.deadline < new Date());

  const deadlineText = categorySettings?.deadline
    ? new Date(categorySettings.deadline).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Stats Predictions</h1>

      {isClosed ? (
        <div className="mb-6 rounded-lg bg-zinc-700 px-4 py-3 text-sm text-zinc-300">
          Submissions are closed.{deadlineText && ` Deadline was ${deadlineText}.`}
        </div>
      ) : deadlineText ? (
        <div className="mb-6 rounded-lg bg-indigo-900/40 border border-indigo-700 px-4 py-3 text-sm text-indigo-300">
          Deadline: {deadlineText}
        </div>
      ) : null}

      <PredictionsView questions={questions} initialPredictions={predictions} closed={isClosed ?? false} />
    </div>
  );
}
