import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id },
    include: { answerItem: true },
  });

  return Response.json(predictions);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { predictions } = await request.json() as {
    predictions: { questionId: string; answerItemId: string }[];
  };

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return Response.json({ error: "No predictions provided" }, { status: 400 });
  }

  const userId = session.user.id;
  const results = [];
  const errors = [];

  for (const { questionId, answerItemId } of predictions) {
    // Verify question exists and is open
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      errors.push({ questionId, error: "Question not found" });
      continue;
    }

    const isClosed = question.isLocked || question.deadline < new Date();
    if (isClosed) {
      errors.push({ questionId, error: "Submissions closed" });
      continue;
    }

    // Verify the answer item belongs to this question's answer type
    const item = await prisma.answerItem.findFirst({
      where: { id: answerItemId, answerTypeId: question.answerTypeId },
    });
    if (!item) {
      errors.push({ questionId, error: "Invalid answer item" });
      continue;
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, answerItemId },
      update: { answerItemId },
    });
    results.push(prediction);
  }

  return Response.json({ saved: results, errors });
}
