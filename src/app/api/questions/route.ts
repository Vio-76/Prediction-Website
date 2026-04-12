import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { Category } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as Category | null;

  const questions = await prisma.question.findMany({
    where: category ? { category } : undefined,
    include: {
      answerType: { include: { items: { orderBy: { name: "asc" } } } },
      correctAnswers: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(questions);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { text, category, answerTypeId, deadline, pointValue } =
    await request.json();

  if (!text?.trim() || !category || !answerTypeId || !deadline) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!Object.values(Category).includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      text: text.trim(),
      category,
      answerTypeId,
      deadline: new Date(deadline),
      pointValue: Number(pointValue) || 1,
    },
    include: {
      answerType: { include: { items: { orderBy: { name: "asc" } } } },
      correctAnswers: true,
    },
  });

  return Response.json(question, { status: 201 });
}
