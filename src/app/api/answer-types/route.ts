import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const answerTypes = await prisma.answerType.findMany({
    include: { items: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return Response.json(answerTypes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const answerType = await prisma.answerType.create({
      data: { name: name.trim() },
      include: { items: true },
    });
    return Response.json(answerType, { status: 201 });
  } catch {
    return Response.json({ error: "Name already exists" }, { status: 409 });
  }
}
