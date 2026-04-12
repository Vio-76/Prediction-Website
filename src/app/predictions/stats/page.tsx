import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PredictionsView from "@/components/PredictionsView";

export default async function StatsPage() {
  const session = await auth();

  const [questions, predictions] = await Promise.all([
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
      : [],
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">General Stats Predictions</h1>
      <PredictionsView questions={questions} initialPredictions={predictions} />
    </div>
  );
}
