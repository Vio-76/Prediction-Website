import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!isAdmin(session?.user?.discordId)) redirect("/");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
          <span className="font-bold text-indigo-400">Admin</span>
          <Link href="/admin" className="text-sm text-zinc-300 hover:text-white">
            Dashboard
          </Link>
          <Link href="/admin/questions/new" className="text-sm text-zinc-300 hover:text-white">
            New Question
          </Link>
          <Link href="/admin/answer-types" className="text-sm text-zinc-300 hover:text-white">
            Answer Types
          </Link>
          <Link href="/predictions/group-stage" className="ml-auto text-sm text-zinc-400 hover:text-white">
            ← Back to site
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
