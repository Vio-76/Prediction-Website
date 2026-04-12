import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PredictionsView from "@/components/PredictionsView";

export default async function PlayoffsPage() {
  const session = await auth();

  const [questions, predictions] = await Promise.all([
    prisma.question.findMany({
      where: { category: "PLAYOFFS" },
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
            question: { category: "PLAYOFFS" },
          },
          include: { answerItem: true },
        })
      : [],
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Playoff Predictions</h1>
      <PredictionsView questions={questions} initialPredictions={predictions} />
    </div>
  );
}
