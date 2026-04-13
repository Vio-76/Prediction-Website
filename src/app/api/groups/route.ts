import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const groups = await prisma.tournamentGroup.findMany({
    include: {
      teams: {
        include: { answerItem: { select: { name: true } } },
        orderBy: { answerItem: { name: "asc" } },
      },
      _count: { select: { predictions: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(groups);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, pointValue, teamItemIds } = await request.json() as {
    name: string;
    pointValue: number;
    teamItemIds: string[];
  };

  if (!name?.trim() || !Array.isArray(teamItemIds) || teamItemIds.length < 2) {
    return Response.json(
      { error: "name and at least 2 team IDs are required" },
      { status: 400 }
    );
  }

  // Validate all provided IDs belong to an AnswerType named "Teams"
  const teamsAnswerType = await prisma.answerType.findUnique({
    where: { name: "Teams" },
    include: { items: { select: { id: true } } },
  });

  if (!teamsAnswerType) {
    return Response.json(
      { error: 'No "Teams" answer type exists. Create one first.' },
      { status: 400 }
    );
  }

  const validIds = new Set(teamsAnswerType.items.map((i) => i.id));
  const invalid = teamItemIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return Response.json(
      { error: "Some team IDs do not belong to the Teams answer type" },
      { status: 400 }
    );
  }

  const group = await prisma.tournamentGroup.create({
    data: {
      name: name.trim(),
      pointValue: pointValue ?? 1,
      teams: {
        create: teamItemIds.map((answerItemId) => ({ answerItemId })),
      },
    },
    include: {
      teams: { include: { answerItem: { select: { name: true } } } },
    },
  });

  return Response.json(group, { status: 201 });
}
