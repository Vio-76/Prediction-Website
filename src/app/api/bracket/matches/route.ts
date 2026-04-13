import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getTeamsIds(): Promise<Set<string> | null> {
  const teamsType = await prisma.answerType.findUnique({
    where: { name: "Teams" },
    include: { items: { select: { id: true } } },
  });
  if (!teamsType) return null;
  return new Set(teamsType.items.map((i) => i.id));
}

// POST: create a new match in a round
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roundId, matchNumber, team1Id, team2Id } = await request.json() as {
    roundId: string;
    matchNumber: number;
    team1Id?: string | null;
    team2Id?: string | null;
  };

  if (!roundId || matchNumber == null) {
    return Response.json({ error: "roundId and matchNumber are required" }, { status: 400 });
  }

  // Validate team IDs belong to the "Teams" answer type (null = TBD, always allowed)
  if (team1Id || team2Id) {
    const validIds = await getTeamsIds();
    if (!validIds) {
      return Response.json({ error: "Teams answer type not found" }, { status: 400 });
    }
    if (team1Id && !validIds.has(team1Id)) {
      return Response.json({ error: "team1Id must belong to the Teams answer type" }, { status: 400 });
    }
    if (team2Id && !validIds.has(team2Id)) {
      return Response.json({ error: "team2Id must belong to the Teams answer type" }, { status: 400 });
    }
  }

  const match = await prisma.bracketMatch.create({
    data: {
      roundId,
      matchNumber,
      team1Id: team1Id ?? null,
      team2Id: team2Id ?? null,
    },
    include: { team1: true, team2: true, winner: true },
  });

  return Response.json(match, { status: 201 });
}
