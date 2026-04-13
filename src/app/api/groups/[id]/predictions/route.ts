import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: fetch the current user's predictions for a specific group
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  const predictions = await prisma.groupPrediction.findMany({
    where: { userId: session.user.id, groupId },
  });

  return Response.json(predictions);
}

// POST: save/update the current user's predicted order for a group
// Body: { predictions: [{ teamId, predictedPosition }] }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;
  const { predictions } = await request.json() as {
    predictions: { teamId: string; predictedPosition: number }[];
  };

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return Response.json({ error: "No predictions provided" }, { status: 400 });
  }

  const group = await prisma.tournamentGroup.findUnique({ where: { id: groupId } });
  if (!group) return Response.json({ error: "Group not found" }, { status: 404 });

  const categorySettings = await prisma.categorySettings.findUnique({
    where: { category: "GROUP_STAGE" },
  });
  const isClosed =
    categorySettings?.isLocked ||
    (categorySettings?.deadline != null && categorySettings.deadline < new Date());
  if (isClosed) {
    return Response.json({ error: "Submissions closed" }, { status: 409 });
  }

  const userId = session.user.id;

  const saved = await prisma.$transaction(
    predictions.map(({ teamId, predictedPosition }) =>
      prisma.groupPrediction.upsert({
        where: { userId_groupId_teamId: { userId, groupId, teamId } },
        create: { userId, groupId, teamId, predictedPosition },
        update: { predictedPosition },
      })
    )
  );

  return Response.json({ saved });
}
