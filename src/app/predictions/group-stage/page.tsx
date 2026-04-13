import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import GroupStagePredictionsView from "@/components/GroupStagePredictionsView";

export default async function GroupStagePage() {
  const session = await auth();

  const [groups, categorySettings, savedPredsList] = await Promise.all([
    prisma.tournamentGroup.findMany({
      include: {
        teams: {
          include: { answerItem: { select: { id: true, name: true } } },
          orderBy: { answerItem: { name: "asc" } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.categorySettings.findUnique({ where: { category: "GROUP_STAGE" } }),
    session?.user?.id
      ? prisma.groupPrediction.findMany({
          where: { userId: session.user.id },
          select: { groupId: true, teamId: true, predictedPosition: true },
        })
      : Promise.resolve([]),
  ]);

  const savedPredictions: Record<string, { teamId: string; predictedPosition: number }[]> = {};
  for (const pred of savedPredsList) {
    if (!savedPredictions[pred.groupId]) savedPredictions[pred.groupId] = [];
    savedPredictions[pred.groupId].push({
      teamId: pred.teamId,
      predictedPosition: pred.predictedPosition,
    });
  }

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
      <h1 className="mb-4 text-2xl font-bold">Group Stage Predictions</h1>

      {isClosed ? (
        <div className="mb-6 rounded-lg bg-zinc-700 px-4 py-3 text-sm text-zinc-300">
          Submissions are closed.{deadlineText && ` Deadline was ${deadlineText}.`}
        </div>
      ) : deadlineText ? (
        <div className="mb-6 rounded-lg bg-indigo-900/40 border border-indigo-700 px-4 py-3 text-sm text-indigo-300">
          Deadline: {deadlineText}
        </div>
      ) : null}

      <p className="mb-6 text-sm text-zinc-400">
        Predict the final standings for each group. Use the ▲ ▼ buttons to reorder teams — your ranking saves automatically.
      </p>
      <GroupStagePredictionsView groups={groups} savedPredictions={savedPredictions} closed={isClosed ?? false} />
    </div>
  );
}
