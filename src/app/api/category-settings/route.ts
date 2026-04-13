import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";

const ALL_CATEGORIES: Category[] = ["GROUP_STAGE", "PLAYOFFS", "STATS"];

// Ensure all category rows exist, return all of them
async function ensureDefaults() {
  await prisma.$transaction(
    ALL_CATEGORIES.map((category) =>
      prisma.categorySettings.upsert({
        where: { category },
        create: { category },
        update: {},
      })
    )
  );
  return prisma.categorySettings.findMany();
}

export async function GET() {
  const settings = await ensureDefaults();
  return Response.json(settings);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // TODO: check admin role when role field is added
  const { category, deadline, isLocked } = await request.json() as {
    category: Category;
    deadline?: string | null;
    isLocked?: boolean;
  };

  if (!ALL_CATEGORIES.includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const updated = await prisma.categorySettings.upsert({
    where: { category },
    create: {
      category,
      deadline: deadline ? new Date(deadline) : null,
      isLocked: isLocked ?? false,
    },
    update: {
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      ...(isLocked !== undefined && { isLocked }),
    },
  });

  return Response.json(updated);
}
