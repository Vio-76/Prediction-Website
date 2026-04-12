import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function scoreQuestion(questionId: string): Promise<void> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      correctAnswers: true,
      predictions: true,
    },
  });

  if (!question) return;

  const correctIds = new Set(question.correctAnswers.map((a) => a.id));

  // Mark each prediction correct or incorrect
  await prisma.$transaction(
    question.predictions.map((prediction) =>
      prisma.prediction.update({
        where: { id: prediction.id },
        data: { isCorrect: correctIds.has(prediction.answerItemId) },
      })
    )
  );

  // Recompute all point fields for each affected user
  const affectedUserIds = [
    ...new Set(question.predictions.map((p) => p.userId)),
  ];

  await Promise.all(
    affectedUserIds.map(async (userId) => {
      const correctPredictions = await prisma.prediction.findMany({
        where: { userId, isCorrect: true },
        include: { question: true },
      });

      const sum = (cat: Category | null) =>
        correctPredictions
          .filter((p) => (cat ? p.question.category === cat : true))
          .reduce((acc, p) => acc + p.question.pointValue, 0);

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalPoints: sum(null),
          groupStagePoints: sum(Category.GROUP_STAGE),
          playoffPoints: sum(Category.PLAYOFFS),
          statsPoints: sum(Category.STATS),
        },
      });
    })
  );
}
