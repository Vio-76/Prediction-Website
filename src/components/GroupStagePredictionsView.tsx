"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type GroupTeam = {
  id: string;
  answerItem: { name: string };
  finalPosition: number | null;
};

type TournamentGroup = {
  id: string;
  name: string;
  pointValue: number;
  teams: GroupTeam[];
};

type SavedPrediction = {
  teamId: string;
  predictedPosition: number;
};

function reorderByTeamIds(order: GroupTeam[], fromTeamId: string, toTeamId: string): GroupTeam[] {
  const fromIndex = order.findIndex((team) => team.id === fromTeamId);
  const toIndex = order.findIndex((team) => team.id === toTeamId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return order;
  }

  const nextOrder = [...order];
  const [movedTeam] = nextOrder.splice(fromIndex, 1);
  nextOrder.splice(toIndex, 0, movedTeam);
  return nextOrder;
}

function GroupCard({
  group,
  initialOrder,
  closed,
}: {
  group: TournamentGroup;
  initialOrder: GroupTeam[];
  closed: boolean;
}) {
  const hasResults = group.teams.length > 0 && group.teams.every((t) => t.finalPosition !== null);

  // Ordered list of teams representing the user's predicted ranking
  const [order, setOrder] = useState<GroupTeam[]>(initialOrder);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [draggingTeamId, setDraggingTeamId] = useState<string | null>(null);
  const [dropTargetTeamId, setDropTargetTeamId] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const dropTargetRef = useRef<string | null>(null);

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

  const reorderAndSave = useCallback((fromTeamId: string, toTeamId: string) => {
    if (closed) return;

    const newOrder = reorderByTeamIds(order, fromTeamId, toTeamId);
    if (newOrder === order) return;

    setOrder(newOrder);
    save(newOrder);
  }, [closed, order, save]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    reorderAndSave(order[index].id, order[target].id);
  }

  function clearDragState() {
    draggingRef.current = null;
    dropTargetRef.current = null;
    setDraggingTeamId(null);
    setDropTargetTeamId(null);
  }

  // Document-level listeners for pointermove/pointerup during drag
  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!draggingRef.current) return;
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const row = el?.closest("[data-team-id]") as HTMLElement | null;
      const teamId = row?.dataset.teamId;
      if (teamId) {
        dropTargetRef.current = teamId;
        setDropTargetTeamId(teamId);
      }
    }

    function onPointerUp() {
      const fromTeamId = draggingRef.current;
      const toTeamId = dropTargetRef.current;
      if (fromTeamId && toTeamId && fromTeamId !== toTeamId) {
        reorderAndSave(fromTeamId, toTeamId);
      }
      clearDragState();
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [reorderAndSave]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, teamId: string) {
    if (closed) return;
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    draggingRef.current = teamId;
    dropTargetRef.current = teamId;
    setDraggingTeamId(teamId);
    setDropTargetTeamId(teamId);
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

      {!closed && (
        <p className="mb-2 text-xs text-zinc-500">
          Drag and drop teams to reorder. You can also use the arrow buttons.
        </p>
      )}

      {/* Team rows */}
      <div className="space-y-1.5">
        {order.map((team, idx) => {
          const actualPos = finalMap.get(team.id) ?? null;
          const predictedPos = idx + 1;
          const correct = hasResults && actualPos === predictedPos;
          const wrong = hasResults && actualPos !== null && actualPos !== predictedPos;
          const isDragging = draggingTeamId === team.id;
          const isDropTarget = dropTargetTeamId === team.id;

          return (
            <div
              key={team.id}
              data-team-id={team.id}
              onPointerDown={(event) => handlePointerDown(event, team.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                correct
                  ? "bg-green-900/40 ring-1 ring-green-600"
                  : wrong
                  ? "bg-red-900/30"
                  : "bg-zinc-700/50"
              } ${
                closed ? "" : "cursor-grab active:cursor-grabbing touch-none"
              } ${
                isDragging ? "ring-1 ring-zinc-500 opacity-80" : ""
              } ${
                isDropTarget && !isDragging ? "ring-1 ring-sky-500" : ""
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
  closed,
}: {
  groups: TournamentGroup[];
  savedPredictions: Record<string, SavedPrediction[]>; // groupId → predictions
  closed: boolean;
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
          <GroupCard key={group.id} group={group} initialOrder={initialOrder} closed={closed} />
        );
      })}
    </div>
  );
}
