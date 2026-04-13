import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST: create a new round in the bracket tournament
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await prisma.bracketTournament.findFirst();
  if (!tournament) {
    return Response.json({ error: "No bracket exists" }, { status: 404 });
  }

  const { name, bracketSide, order } = await request.json() as {
    name: string;
    bracketSide: "WINNER" | "LOSER" | "GRAND_FINAL";
    order: number;
  };

  if (!name || !bracketSide || order == null) {
    return Response.json({ error: "name, bracketSide, and order are required" }, { status: 400 });
  }

  const round = await prisma.bracketRound.create({
    data: { tournamentId: tournament.id, name, bracketSide, order },
  });

  return Response.json(round, { status: 201 });
}
