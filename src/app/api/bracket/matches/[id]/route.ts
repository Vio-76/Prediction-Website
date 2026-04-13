import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scoreBracketMatch } from "@/lib/scoring";

async function getTeamsIds(): Promise<Set<string> | null> {
  const teamsType = await prisma.answerType.findUnique({
    where: { name: "Teams" },
    include: { items: { select: { id: true } } },
  });
  if (!teamsType) return null;
  return new Set(teamsType.items.map((i) => i.id));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { team1Id, team2Id, winnerId, team1Score, team2Score } = await request.json() as {
    team1Id?: string | null;
    team2Id?: string | null;
    winnerId?: string | null;
    team1Score?: number | null;
    team2Score?: number | null;
  };

  // Validate team IDs belong to the "Teams" answer type (null = TBD, always allowed)
  const settingTeam = (team1Id !== undefined && team1Id !== null) || (team2Id !== undefined && team2Id !== null);
  if (settingTeam) {
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

  const match = await prisma.bracketMatch.update({
    where: { id },
    data: {
      ...(team1Id !== undefined && { team1Id }),
      ...(team2Id !== undefined && { team2Id }),
      ...(winnerId !== undefined && { winnerId }),
      ...(team1Score !== undefined && { team1Score }),
      ...(team2Score !== undefined && { team2Score }),
    },
    include: { team1: true, team2: true, winner: true },
  });

  // If a winner was just set, trigger scoring
  if (winnerId && match.winnerId) {
    await scoreBracketMatch(id);
  }

  return Response.json(match);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.bracketMatch.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
