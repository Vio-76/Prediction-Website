import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { scoreQuestion } from "@/lib/scoring";
import { Category } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Build update payload from provided fields
  const data: Record<string, unknown> = {};
  if (body.text !== undefined) data.text = body.text.trim();
  if (body.category !== undefined) {
    if (!Object.values(Category).includes(body.category)) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = body.category;
  }
  if (body.deadline !== undefined) data.deadline = new Date(body.deadline);
  if (body.pointValue !== undefined) data.pointValue = Number(body.pointValue);
  if (body.isLocked !== undefined) data.isLocked = Boolean(body.isLocked);

  // Handle setting correct answers
  if (body.correctAnswerItemIds !== undefined) {
    data.correctAnswers = {
      set: (body.correctAnswerItemIds as string[]).map((id: string) => ({ id })),
    };
  }

  const question = await prisma.question.update({
    where: { id },
    data,
    include: {
      answerType: { include: { items: { orderBy: { name: "asc" } } } },
      correctAnswers: true,
    },
  });

  // Re-score whenever correct answers or point value changes
  if (
    body.correctAnswerItemIds !== undefined ||
    body.pointValue !== undefined
  ) {
    await scoreQuestion(id);
  }

  return Response.json(question);
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

  const predictionCount = await prisma.prediction.count({
    where: { questionId: id },
  });
  if (predictionCount > 0) {
    return Response.json(
      { error: "Cannot delete: question has existing predictions" },
      { status: 409 }
    );
  }

  await prisma.question.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
