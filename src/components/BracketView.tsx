"use client";

import { useState, useTransition } from "react";

// ─── Types (mirrored from server) ─────────────────────────────────────────────

type AnswerItem = { id: string; name: string };

type BracketMatch = {
  id: string;
  matchNumber: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  team1Score: number | null;
  team2Score: number | null;
  team1: AnswerItem | null;
  team2: AnswerItem | null;
  winner: AnswerItem | null;
};

type BracketRound = {
  id: string;
  name: string;
  bracketSide: "WINNER" | "LOSER" | "GRAND_FINAL";
  order: number;
  matches: BracketMatch[];
};

type BracketTournament = {
  id: string;
  name: string;
  format: "SINGLE_ELIM" | "DOUBLE_ELIM";
  allowScorePrediction: boolean;
  rounds: BracketRound[];
};

type UserPrediction = {
  matchId: string;
  predictedWinnerId: string;
  predictedTeam1Score: number | null;
  predictedTeam2Score: number | null;
  isCorrect: boolean | null;
  isScoreCorrect: boolean | null;
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function BracketView({
  tournament,
  userPredictions,
  isClosed,
  isLoggedIn,
}: {
  tournament: BracketTournament;
  userPredictions: UserPrediction[];
  isClosed: boolean;
  isLoggedIn: boolean;
}) {
  const predMap = new Map(userPredictions.map((p) => [p.matchId, p]));
  const [localPreds, setLocalPreds] = useState<Map<string, UserPrediction>>(predMap);

  const [, startTransition] = useTransition();

  async function savePrediction(
    matchId: string,
    predictedWinnerId: string,
    predictedTeam1Score?: number | null,
    predictedTeam2Score?: number | null
  ) {
    const res = await fetch("/api/bracket/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, predictedWinnerId, predictedTeam1Score, predictedTeam2Score }),
    });
    if (res.ok) {
      const saved: UserPrediction = await res.json();
      startTransition(() => {
        setLocalPreds((prev) => new Map(prev).set(matchId, saved));
      });
    }
  }

  // Group rounds by bracketSide for double-elim display
  const winnerRounds = tournament.rounds.filter((r) => r.bracketSide === "WINNER");
  const loserRounds = tournament.rounds.filter((r) => r.bracketSide === "LOSER");
  const grandFinalRounds = tournament.rounds.filter((r) => r.bracketSide === "GRAND_FINAL");

  const isDouble = tournament.format === "DOUBLE_ELIM";

  return (
    <div className="space-y-8 overflow-x-auto">
      {/* Winner bracket (or all rounds for single elim) */}
      {winnerRounds.length > 0 && (
        <div>
          {isDouble && (
            <h2 className="mb-3 text-base font-semibold text-zinc-300">Winner Bracket</h2>
          )}
          <div className="flex gap-6 min-w-max">
            {winnerRounds.map((round) => (
              <RoundColumn
                key={round.id}
                round={round}
                localPreds={localPreds}
                allowScorePrediction={tournament.allowScorePrediction}
                isClosed={isClosed}
                isLoggedIn={isLoggedIn}
                onPredict={savePrediction}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loser bracket */}
      {isDouble && loserRounds.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-zinc-300">Loser Bracket</h2>
          <div className="flex gap-6 min-w-max">
            {loserRounds.map((round) => (
              <RoundColumn
                key={round.id}
                round={round}
                localPreds={localPreds}
                allowScorePrediction={tournament.allowScorePrediction}
                isClosed={isClosed}
                isLoggedIn={isLoggedIn}
                onPredict={savePrediction}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grand Final */}
      {grandFinalRounds.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-zinc-300">Grand Final</h2>
          <div className="flex gap-6 min-w-max">
            {grandFinalRounds.map((round) => (
              <RoundColumn
                key={round.id}
                round={round}
                localPreds={localPreds}
                allowScorePrediction={tournament.allowScorePrediction}
                isClosed={isClosed}
                isLoggedIn={isLoggedIn}
                onPredict={savePrediction}
              />
            ))}
          </div>
        </div>
      )}

      {tournament.rounds.length === 0 && (
        <p className="text-zinc-500">No matches have been set up yet.</p>
      )}

      {!isLoggedIn && (
        <p className="text-sm text-zinc-500">Sign in to make predictions.</p>
      )}
    </div>
  );
}

// ─── Round column ─────────────────────────────────────────────────────────────

function RoundColumn({
  round,
  localPreds,
  allowScorePrediction,
  isClosed,
  isLoggedIn,
  onPredict,
}: {
  round: BracketRound;
  localPreds: Map<string, UserPrediction>;
  allowScorePrediction: boolean;
  isClosed: boolean;
  isLoggedIn: boolean;
  onPredict: (
    matchId: string,
    winnerId: string,
    t1Score?: number | null,
    t2Score?: number | null
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-4 min-w-[220px]">
      <h3 className="text-center text-sm font-semibold text-zinc-400">{round.name}</h3>
      {round.matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          prediction={localPreds.get(match.id)}
          allowScorePrediction={allowScorePrediction}
          isClosed={isClosed}
          isLoggedIn={isLoggedIn}
          onPredict={onPredict}
        />
      ))}
      {round.matches.length === 0 && (
        <p className="text-center text-xs text-zinc-600">No matches</p>
      )}
    </div>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
  match,
  prediction,
  allowScorePrediction,
  isClosed,
  isLoggedIn,
  onPredict,
}: {
  match: BracketMatch;
  prediction: UserPrediction | undefined;
  allowScorePrediction: boolean;
  isClosed: boolean;
  isLoggedIn: boolean;
  onPredict: (
    matchId: string,
    winnerId: string,
    t1Score?: number | null,
    t2Score?: number | null
  ) => void;
}) {
  const [t1Score, setT1Score] = useState(
    prediction?.predictedTeam1Score != null ? String(prediction.predictedTeam1Score) : ""
  );
  const [t2Score, setT2Score] = useState(
    prediction?.predictedTeam2Score != null ? String(prediction.predictedTeam2Score) : ""
  );

  const hasResult = match.winnerId != null;
  const canPredict = isLoggedIn && !isClosed && !hasResult;

  function pickWinner(teamId: string) {
    if (!canPredict) return;
    const s1 = t1Score === "" ? null : Number(t1Score);
    const s2 = t2Score === "" ? null : Number(t2Score);
    onPredict(match.id, teamId, s1, s2);
  }

  function saveScores() {
    if (!prediction?.predictedWinnerId || !canPredict) return;
    onPredict(
      match.id,
      prediction.predictedWinnerId,
      t1Score === "" ? null : Number(t1Score),
      t2Score === "" ? null : Number(t2Score)
    );
  }

  const teams = [
    { item: match.team1, id: match.team1Id },
    { item: match.team2, id: match.team2Id },
  ];

  return (
    <div className="rounded-lg bg-zinc-800 overflow-hidden">
      <div className="text-xs text-zinc-500 px-3 pt-2 pb-1">Match {match.matchNumber}</div>

      {teams.map(({ item, id }) => {
        if (!id) {
          return (
            <div key={`tbd-${teams.indexOf({ item, id })}`} className="px-3 py-2 text-sm text-zinc-600 italic border-t border-zinc-700">
              TBD
            </div>
          );
        }

        const isPredicted = prediction?.predictedWinnerId === id;
        const isActualWinner = match.winnerId === id;
        const resultKnown = hasResult;

        let rowStyle = "border-t border-zinc-700 px-3 py-2 text-sm transition-colors";
        if (resultKnown) {
          if (isActualWinner) rowStyle += " bg-green-900/30 text-green-200";
          else rowStyle += " text-zinc-500";
        } else if (isPredicted) {
          rowStyle += " bg-indigo-800/40 text-indigo-200";
        } else {
          rowStyle += " text-zinc-200";
        }

        // correctness badge
        let badge: React.ReactNode = null;
        if (resultKnown && isPredicted) {
          if (prediction?.isCorrect) {
            badge = <span className="ml-auto text-xs text-green-400">✓</span>;
          } else if (prediction?.isCorrect === false) {
            badge = <span className="ml-auto text-xs text-red-400">✗</span>;
          }
        }

        return (
          <button
            key={id}
            type="button"
            disabled={!canPredict}
            onClick={() => pickWinner(id)}
            className={`w-full flex items-center gap-2 text-left ${rowStyle} ${canPredict ? "hover:bg-indigo-700/30 cursor-pointer" : "cursor-default"}`}
          >
            {isPredicted && !resultKnown && (
              <span className="text-indigo-400 text-xs">▶</span>
            )}
            {isActualWinner && <span className="text-green-400 text-xs">★</span>}
            <span className="flex-1 truncate">{item?.name ?? "TBD"}</span>
            {badge}
          </button>
        );
      })}

      {/* Score display / input */}
      {allowScorePrediction && prediction?.predictedWinnerId && (
        <div className="border-t border-zinc-700 px-3 py-2">
          {hasResult ? (
            // Show actual vs predicted score
            <div className="text-xs text-zinc-400">
              {match.team1Score != null && match.team2Score != null && (
                <span>
                  Result: {match.team1Score}–{match.team2Score}
                  {prediction?.isScoreCorrect && (
                    <span className="ml-1 text-green-400">✓ exact score</span>
                  )}
                </span>
              )}
            </div>
          ) : canPredict ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={t1Score}
                onChange={(e) => setT1Score(e.target.value)}
                onBlur={saveScores}
                className="w-10 rounded bg-zinc-700 px-1.5 py-1 text-xs text-center text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-zinc-500 text-xs">-</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={t2Score}
                onChange={(e) => setT2Score(e.target.value)}
                onBlur={saveScores}
                className="w-10 rounded bg-zinc-700 px-1.5 py-1 text-xs text-center text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-zinc-500 ml-1">score</span>
            </div>
          ) : (
            prediction.predictedTeam1Score != null && (
              <div className="text-xs text-zinc-400">
                Your score: {prediction.predictedTeam1Score}–{prediction.predictedTeam2Score}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
