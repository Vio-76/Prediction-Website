import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditQuestionClient from "./EditQuestionClient";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [question, answerTypes] = await Promise.all([
    prisma.question.findUnique({
      where: { id },
      include: {
        answerType: { include: { items: { orderBy: { name: "asc" } } } },
        correctAnswers: true,
      },
    }),
    prisma.answerType.findMany({
      include: { items: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!question) notFound();

  return <EditQuestionClient question={question} answerTypes={answerTypes} />;
}
