import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Recompute all four point fields for a single user from scratch.
async function recomputeUserPoints(userId: string): Promise<void> {
  const [correctQuestionPredictions, correctGroupPredictions, bracketPredictions] =
    await Promise.all([
      prisma.prediction.findMany({
        where: { userId, isCorrect: true },
        include: { question: true },
      }),
      prisma.groupPrediction.findMany({
        where: { userId, isCorrect: true },
        include: { group: true },
      }),
      prisma.bracketPrediction.findMany({
        where: { userId },
        include: { match: { include: { round: { include: { tournament: true } } } } },
      }),
    ]);

  const groupStagePoints: number = correctGroupPredictions.reduce(
    (acc: number, p: { group: { pointValue: number } }) => acc + p.group.pointValue,
    0
  );

  const statsPoints: number = correctQuestionPredictions
    .filter((p: { question: { category: Category } }) => p.question.category === Category.STATS)
    .reduce((acc: number, p: { question: { pointValue: number } }) => acc + p.question.pointValue, 0);

  const playoffPoints: number = bracketPredictions.reduce(
    (acc: number, p: {
      isCorrect: boolean | null;
      isScoreCorrect: boolean | null;
      match: { round: { tournament: { pointsPerWinner: number; pointsPerScore: number } } };
    }) => {
      const t = p.match.round.tournament;
      let pts = 0;
      if (p.isCorrect) pts += t.pointsPerWinner;
      if (p.isScoreCorrect) pts += t.pointsPerScore;
      return acc + pts;
    },
    0
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      groupStagePoints,
      playoffPoints,
      statsPoints,
      totalPoints: groupStagePoints + playoffPoints + statsPoints,
    },
  });
}

// Called when admin updates correct answers on a STATS question.
export async function scoreQuestion(questionId: string): Promise<void> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { correctAnswers: true, predictions: true },
  });
  if (!question) return;

  const correctIds = new Set(question.correctAnswers.map((a) => a.id));

  await prisma.$transaction(
    question.predictions.map((prediction) =>
      prisma.prediction.update({
        where: { id: prediction.id },
        data: { isCorrect: correctIds.has(prediction.answerItemId) },
      })
    )
  );

  const affectedUserIds = [...new Set(question.predictions.map((p) => p.userId))];
  await Promise.all(affectedUserIds.map((id) => recomputeUserPoints(id)));
}

// Called when admin sets final positions on a TournamentGroup.
export async function scoreGroup(groupId: string): Promise<void> {
  const group = await prisma.tournamentGroup.findUnique({
    where: { id: groupId },
    include: { teams: true, predictions: true },
  });
  if (!group) return;

  const allSet =
    group.teams.length > 0 &&
    group.teams.every((t: { finalPosition: number | null }) => t.finalPosition !== null);
  if (!allSet) return;

  const finalPositions = new Map<string, number>(
    group.teams
      .filter((t: { finalPosition: number | null }) => t.finalPosition !== null)
      .map((t: { id: string; finalPosition: number | null }) => [t.id, t.finalPosition as number])
  );

  await prisma.$transaction(
    group.predictions.map((pred: { id: string; teamId: string; predictedPosition: number }) => {
      const actual = finalPositions.get(pred.teamId);
      return prisma.groupPrediction.update({
        where: { id: pred.id },
        data: { isCorrect: actual !== undefined && actual === pred.predictedPosition },
      });
    })
  );

  const affectedUserIds = [
    ...new Set(group.predictions.map((p: { userId: string }) => p.userId)),
  ] as string[];
  await Promise.all(affectedUserIds.map((id) => recomputeUserPoints(id)));
}

// Called when admin sets the result of a bracket match.
export async function scoreBracketMatch(matchId: string): Promise<void> {
  const match = await prisma.bracketMatch.findUnique({
    where: { id: matchId },
    include: {
      predictions: true,
      round: { include: { tournament: true } },
    },
  });
  if (!match || !match.winnerId) return;

  const { allowScorePrediction } = match.round.tournament;

  await prisma.$transaction(
    match.predictions.map((pred: {
      id: string;
      predictedWinnerId: string;
      predictedTeam1Score: number | null;
      predictedTeam2Score: number | null;
    }) => {
      const isCorrect = pred.predictedWinnerId === match.winnerId;
      const isScoreCorrect =
        allowScorePrediction &&
        match.team1Score !== null &&
        match.team2Score !== null &&
        pred.predictedTeam1Score === match.team1Score &&
        pred.predictedTeam2Score === match.team2Score;
      return prisma.bracketPrediction.update({
        where: { id: pred.id },
        data: { isCorrect, isScoreCorrect: isScoreCorrect || false },
      });
    })
  );

  const affectedUserIds = [
    ...new Set(match.predictions.map((p: { userId: string }) => p.userId)),
  ] as string[];
  await Promise.all(affectedUserIds.map((id) => recomputeUserPoints(id)));
}
