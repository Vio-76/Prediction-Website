import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: fetch the single bracket tournament (with rounds and matches)
export async function GET() {
  const tournament = await prisma.bracketTournament.findFirst({
    include: {
      rounds: {
        orderBy: { order: "asc" },
        include: {
          matches: {
            orderBy: { matchNumber: "asc" },
            include: {
              team1: true,
              team2: true,
              winner: true,
            },
          },
        },
      },
    },
  });
  return Response.json(tournament ?? null);
}

// POST: create the bracket tournament (admin only)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.bracketTournament.findFirst();
  if (existing) {
    return Response.json({ error: "Bracket already exists" }, { status: 409 });
  }

  const { name, format, allowScorePrediction, pointsPerWinner, pointsPerScore } =
    await request.json() as {
      name: string;
      format: "SINGLE_ELIM" | "DOUBLE_ELIM";
      allowScorePrediction?: boolean;
      pointsPerWinner?: number;
      pointsPerScore?: number;
    };

  if (!name || !format) {
    return Response.json({ error: "name and format are required" }, { status: 400 });
  }

  const tournament = await prisma.bracketTournament.create({
    data: {
      name,
      format,
      allowScorePrediction: allowScorePrediction ?? false,
      pointsPerWinner: pointsPerWinner ?? 1,
      pointsPerScore: pointsPerScore ?? 1,
    },
  });

  return Response.json(tournament, { status: 201 });
}

// PATCH: update bracket settings (admin only)
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await prisma.bracketTournament.findFirst();
  if (!tournament) {
    return Response.json({ error: "No bracket exists" }, { status: 404 });
  }

  const { name, allowScorePrediction, pointsPerWinner, pointsPerScore, deadline, isLocked } =
    await request.json() as {
      name?: string;
      allowScorePrediction?: boolean;
      pointsPerWinner?: number;
      pointsPerScore?: number;
      deadline?: string | null;
      isLocked?: boolean;
    };

  const updated = await prisma.bracketTournament.update({
    where: { id: tournament.id },
    data: {
      ...(name !== undefined && { name }),
      ...(allowScorePrediction !== undefined && { allowScorePrediction }),
      ...(pointsPerWinner !== undefined && { pointsPerWinner }),
      ...(pointsPerScore !== undefined && { pointsPerScore }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      ...(isLocked !== undefined && { isLocked }),
    },
  });

  return Response.json(updated);
}
