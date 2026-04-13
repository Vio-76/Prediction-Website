"use client";

import { useState, useCallback } from "react";

type GroupTeam = {
  id: string;
  answerItem: { name: string };
  finalPosition: number | null;
};

type TournamentGroup = {
  id: string;
  name: string;
  deadline: string | Date;
  isLocked: boolean;
  pointValue: number;
  teams: GroupTeam[];
};

type SavedPrediction = {
  teamId: string;
  predictedPosition: number;
};

function isClosed(group: TournamentGroup): boolean {
  return group.isLocked || new Date(group.deadline) < new Date();
}

function GroupCard({
  group,
  initialOrder,
}: {
  group: TournamentGroup;
  initialOrder: GroupTeam[];
}) {
  const closed = isClosed(group);
  const hasResults = group.teams.length > 0 && group.teams.every((t) => t.finalPosition !== null);

  // Ordered list of teams representing the user's predicted ranking
  const [order, setOrder] = useState<GroupTeam[]>(initialOrder);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = useCallback(async (newOrder: GroupTeam[]) => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/groups/${group.id}/predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictions: newOrder.map((team, idx) => ({
            teamId: team.id,
            predictedPosition: idx + 1,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }, [group.id]);

  function move(index: number, direction: -1 | 1) {
    const newOrder = [...order];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setOrder(newOrder);
    save(newOrder);
  }

  // Build a map of teamId → finalPosition for result display
  const finalMap = new Map(group.teams.map((t) => [t.id, t.finalPosition]));

  return (
    <div className="rounded-xl bg-zinc-800 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">{group.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {group.pointValue} pt{group.pointValue !== 1 ? "s" : ""} per correct placement
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {closed ? (
            <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">Closed</span>
          ) : (
            <span className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">Open</span>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="mb-2 flex items-center gap-2 px-1 text-xs text-zinc-500">
        <span className="w-6 text-center">Pos</span>
        <span className="flex-1">Team</span>
        {hasResults && <span className="w-16 text-center">Result</span>}
        {!closed && <span className="w-16" />}
      </div>

      {/* Team rows */}
      <div className="space-y-1.5">
        {order.map((team, idx) => {
          const actualPos = finalMap.get(team.id) ?? null;
          const predictedPos = idx + 1;
          const correct = hasResults && actualPos === predictedPos;
          const wrong = hasResults && actualPos !== null && actualPos !== predictedPos;

          return (
            <div
              key={team.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                correct
                  ? "bg-green-900/40 ring-1 ring-green-600"
                  : wrong
                  ? "bg-red-900/30"
                  : "bg-zinc-700/50"
              }`}
            >
              <span className="w-6 text-center text-sm font-bold text-zinc-400">
                {predictedPos}
              </span>
              <span className="flex-1 text-sm">{team.answerItem.name}</span>
              {hasResults && (
                <span className="w-16 text-center text-xs">
                  {correct ? (
                    <span className="text-green-400 font-medium">✓ {actualPos}</span>
                  ) : (
                    <span className="text-zinc-500">Actual: {actualPos}</span>
                  )}
                </span>
              )}
              {!closed && (
                <div className="flex w-16 justify-end gap-1">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded bg-zinc-600 px-1.5 py-0.5 text-xs hover:bg-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === order.length - 1}
                    className="rounded bg-zinc-600 px-1.5 py-0.5 text-xs hover:bg-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div className="mt-2 h-4 text-xs">
        {saving && <span className="text-zinc-400">Saving…</span>}
        {saved && <span className="text-green-400">Saved!</span>}
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </div>
  );
}

export default function GroupStagePredictionsView({
  groups,
  savedPredictions,
}: {
  groups: TournamentGroup[];
  savedPredictions: Record<string, SavedPrediction[]>; // groupId → predictions
}) {
  if (groups.length === 0) {
    return <p className="text-zinc-500">No groups set up yet.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        // Build the initial order: if the user has saved predictions, use them;
        // otherwise show teams in default alphabetical order.
        const saved = savedPredictions[group.id] ?? [];
        let initialOrder: GroupTeam[];

        if (saved.length === group.teams.length) {
          // Sort teams by the saved predictedPosition
          const posMap = new Map(saved.map((p) => [p.teamId, p.predictedPosition]));
          initialOrder = [...group.teams].sort(
            (a, b) => (posMap.get(a.id) ?? 99) - (posMap.get(b.id) ?? 99)
          );
        } else {
          initialOrder = [...group.teams];
        }

        return (
          <GroupCard key={group.id} group={group} initialOrder={initialOrder} />
        );
      })}
    </div>
  );
}
