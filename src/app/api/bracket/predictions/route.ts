import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: fetch all of the current user's bracket predictions
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const predictions = await prisma.bracketPrediction.findMany({
    where: { userId: session.user.id },
  });

  return Response.json(predictions);
}

// POST: upsert a single bracket prediction
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, predictedWinnerId, predictedTeam1Score, predictedTeam2Score } =
    await request.json() as {
      matchId: string;
      predictedWinnerId: string;
      predictedTeam1Score?: number | null;
      predictedTeam2Score?: number | null;
    };

  if (!matchId || !predictedWinnerId) {
    return Response.json({ error: "matchId and predictedWinnerId are required" }, { status: 400 });
  }

  // Verify match exists and bracket is not locked
  const match = await prisma.bracketMatch.findUnique({
    where: { id: matchId },
    include: { round: { include: { tournament: true } } },
  });

  if (!match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  const { tournament } = match.round;
  const isClosed =
    tournament.isLocked ||
    (tournament.deadline != null && tournament.deadline < new Date());
  if (isClosed) {
    return Response.json({ error: "Submissions closed" }, { status: 409 });
  }

  const userId = session.user.id;

  const prediction = await prisma.bracketPrediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    create: {
      userId,
      tournamentId: tournament.id,
      matchId,
      predictedWinnerId,
      predictedTeam1Score: predictedTeam1Score ?? null,
      predictedTeam2Score: predictedTeam2Score ?? null,
    },
    update: {
      predictedWinnerId,
      predictedTeam1Score: predictedTeam1Score ?? null,
      predictedTeam2Score: predictedTeam2Score ?? null,
    },
  });

  return Response.json(prediction);
}
