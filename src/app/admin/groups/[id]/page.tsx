import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditGroupClient from "./EditGroupClient";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const group = await prisma.tournamentGroup.findUnique({
    where: { id },
    include: {
      teams: {
        include: { answerItem: { select: { name: true } } },
        orderBy: { answerItem: { name: "asc" } },
      },
    },
  });

  if (!group) notFound();

  return <EditGroupClient group={group} />;
}
