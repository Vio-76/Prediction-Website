import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BracketView from "@/components/BracketView";

export default async function PlayoffsPage() {
  const session = await auth();

  const tournament = await prisma.bracketTournament.findFirst({
    include: {
      rounds: {
        orderBy: { order: "asc" },
        include: {
          matches: {
            orderBy: { matchNumber: "asc" },
            include: {
              team1: true,
              team2: true,
              winner: true,
            },
          },
        },
      },
    },
  });

  const userPredictions = session?.user?.id && tournament
    ? await prisma.bracketPrediction.findMany({
        where: { userId: session.user.id, tournamentId: tournament.id },
      })
    : [];

  if (!tournament) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Playoffs</h1>
        <p className="text-zinc-400">The bracket has not been set up yet. Check back later.</p>
      </div>
    );
  }

  const isClosed =
    tournament.isLocked ||
    (tournament.deadline != null && tournament.deadline < new Date());

  const deadlineText = tournament.deadline
    ? new Date(tournament.deadline).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{tournament.name}</h1>

      {isClosed ? (
        <div className="mb-6 rounded-lg bg-zinc-700 px-4 py-3 text-sm text-zinc-300">
          Submissions are closed.{deadlineText && ` Deadline was ${deadlineText}.`}
        </div>
      ) : deadlineText ? (
        <div className="mb-6 rounded-lg bg-indigo-900/40 border border-indigo-700 px-4 py-3 text-sm text-indigo-300">
          Deadline: {deadlineText}
        </div>
      ) : null}

      <BracketView
        tournament={tournament}
        userPredictions={userPredictions}
        isClosed={isClosed}
        isLoggedIn={!!session?.user?.id}
      />
    </div>
  );
}
