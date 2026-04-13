import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, bracketSide, order } = await request.json() as {
    name?: string;
    bracketSide?: "WINNER" | "LOSER" | "GRAND_FINAL";
    order?: number;
  };

  const round = await prisma.bracketRound.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(bracketSide !== undefined && { bracketSide }),
      ...(order !== undefined && { order }),
    },
  });

  return Response.json(round);
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
  await prisma.bracketRound.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
