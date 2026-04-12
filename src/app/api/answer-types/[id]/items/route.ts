import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: answerTypeId } = await params;
  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const item = await prisma.answerItem.create({
    data: { name: name.trim(), answerTypeId },
  });
  return Response.json(item, { status: 201 });
}
