import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const answerType = await prisma.answerType.update({
      where: { id },
      data: { name: name.trim() },
      include: { items: { orderBy: { name: "asc" } } },
    });
    return Response.json(answerType);
  } catch {
    return Response.json({ error: "Name already exists" }, { status: 409 });
  }
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

  const questionCount = await prisma.question.count({
    where: { answerTypeId: id },
  });
  if (questionCount > 0) {
    return Response.json(
      { error: "Cannot delete: answer type is used by existing questions" },
      { status: 409 }
    );
  }

  await prisma.answerType.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
