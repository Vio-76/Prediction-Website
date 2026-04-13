import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { scoreGroup } from "@/lib/scoring";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const group = await prisma.tournamentGroup.findUnique({
    where: { id },
    include: {
      teams: {
        include: { answerItem: { select: { name: true } } },
        orderBy: { answerItem: { name: "asc" } },
      },
    },
  });
  if (!group) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(group);
}

// PATCH: update group metadata or set final team positions
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json() as {
    name?: string;
    pointValue?: number;
    finalPositions?: { teamId: string; finalPosition: number }[];
  };

  const { name, pointValue, finalPositions } = body;

  await prisma.tournamentGroup.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(pointValue !== undefined && { pointValue }),
    },
  });

  if (finalPositions && finalPositions.length > 0) {
    await prisma.$transaction(
      finalPositions.map(({ teamId, finalPosition }) =>
        prisma.groupTeam.update({
          where: { id: teamId },
          data: { finalPosition },
        })
      )
    );
    await scoreGroup(id);
  }

  const updated = await prisma.tournamentGroup.findUnique({
    where: { id },
    include: {
      teams: {
        include: { answerItem: { select: { name: true } } },
        orderBy: { answerItem: { name: "asc" } },
      },
    },
  });
  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  // GroupTeam and GroupPrediction cascade-delete via schema onDelete: Cascade
  await prisma.tournamentGroup.delete({ where: { id } });
  return Response.json({ ok: true });
}
