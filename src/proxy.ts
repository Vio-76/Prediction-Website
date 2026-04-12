import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — no auth needed
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/leaderboard") ||
    pathname.startsWith("/api/auth");

  if (isPublic) return NextResponse.next();

  const session = await auth();

  // Unauthenticated — redirect to landing
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Admin-only paths
  const isAdminPath =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminPath) {
    const discordId = (session.user as { discordId?: string | null }).discordId;
    if (discordId !== process.env.ADMIN_DISCORD_ID) {
      return NextResponse.redirect(new URL("/predictions/group-stage", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
