import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ManageAnswerTypeClient from "./ManageAnswerTypeClient";

export default async function ManageAnswerTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const answerType = await prisma.answerType.findUnique({
    where: { id },
    include: {
      items: { orderBy: { name: "asc" } },
      _count: { select: { questions: true } },
    },
  });

  if (!answerType) notFound();

  return <ManageAnswerTypeClient answerType={answerType} />;
}
