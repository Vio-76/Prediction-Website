import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { totalPoints: { gt: 0 } },
    select: {
      id: true,
      name: true,
      image: true,
      totalPoints: true,
      groupStagePoints: true,
      playoffPoints: true,
      statsPoints: true,
    },
    orderBy: { totalPoints: "desc" },
    take: 10,
  });

  return Response.json(users);
}
