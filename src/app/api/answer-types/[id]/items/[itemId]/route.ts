import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await params;
  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const item = await prisma.answerItem.update({
    where: { id: itemId },
    data: { name: name.trim() },
  });
  return Response.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await params;

  const predictionCount = await prisma.prediction.count({
    where: { answerItemId: itemId },
  });
  if (predictionCount > 0) {
    return Response.json(
      { error: "Cannot delete: item has existing predictions. Rename it instead." },
      { status: 409 }
    );
  }

  await prisma.answerItem.delete({ where: { id: itemId } });
  return new Response(null, { status: 204 });
}
