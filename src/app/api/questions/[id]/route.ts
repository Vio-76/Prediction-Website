import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { scoreQuestion } from "@/lib/scoring";

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

  const data: Record<string, unknown> = {};
  if (body.text !== undefined) data.text = body.text.trim();
  if (body.pointValue !== undefined) data.pointValue = Number(body.pointValue);
  if (body.answerTypeId !== undefined) data.answerTypeId = body.answerTypeId;

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
  if (body.correctAnswerItemIds !== undefined || body.pointValue !== undefined) {
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
