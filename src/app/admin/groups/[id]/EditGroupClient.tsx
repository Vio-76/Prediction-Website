"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export default function EditGroupClient({ group }: { group: TournamentGroup }) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: group.name,
    pointValue: String(group.pointValue),
  });

  // resultOrder: teams ordered by their final position (or alphabetically if not set yet)
  const [resultOrder, setResultOrder] = useState<GroupTeam[]>(() => {
    const hasResults = group.teams.every((t) => t.finalPosition !== null);
    if (hasResults) {
      return [...group.teams].sort((a, b) => (a.finalPosition ?? 0) - (b.finalPosition ?? 0));
    }
    return [...group.teams].sort((a, b) => a.answerItem.name.localeCompare(b.answerItem.name));
  });

  const [saving, setSaving] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [error, setError] = useState("");
  const [resultsError, setResultsError] = useState("");
  const [resultsSaved, setResultsSaved] = useState(false);
  const [draggingTeamId, setDraggingTeamId] = useState<string | null>(null);
  const [dropTargetTeamId, setDropTargetTeamId] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const dropTargetRef = useRef<string | null>(null);

  function moveResult(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= resultOrder.length) return;
    const next = [...resultOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setResultOrder(next);
    setResultsSaved(false);
  }

  function clearDragState() {
    draggingRef.current = null;
    dropTargetRef.current = null;
    setDraggingTeamId(null);
    setDropTargetTeamId(null);
  }

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
      const fromId = draggingRef.current;
      const toId = dropTargetRef.current;
      if (fromId && toId && fromId !== toId) {
        setResultOrder((prev) => {
          const fromIdx = prev.findIndex((t) => t.id === fromId);
          const toIdx = prev.findIndex((t) => t.id === toId);
          if (fromIdx < 0 || toIdx < 0) return prev;
          const next = [...prev];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return next;
        });
        setResultsSaved(false);
      }
      clearDragState();
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, teamId: string) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    draggingRef.current = teamId;
    dropTargetRef.current = teamId;
    setDraggingTeamId(teamId);
    setDropTargetTeamId(teamId);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          pointValue: Number(form.pointValue),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveResults(e: React.FormEvent) {
    e.preventDefault();
    setResultsError("");
    setResultsSaved(false);

    const positions = resultOrder.map((team, idx) => ({
      teamId: team.id,
      finalPosition: idx + 1,
    }));

    setSavingResults(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalPositions: positions }),
      });
      if (!res.ok) {
        const d = await res.json();
        setResultsError(d.error ?? "Failed to save results");
        return;
      }
      setResultsSaved(true);
      router.refresh();
    } finally {
      setSavingResults(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete group "${group.name}" and all its predictions? This cannot be undone.`)) return;
    await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
    router.push("/admin/groups");
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Group: {group.name}</h1>
        <button
          onClick={handleDelete}
          className="rounded-lg bg-red-900 px-3 py-1.5 text-sm text-red-300 hover:bg-red-800"
        >
          Delete
        </button>
      </div>

      {/* Settings */}
      <form onSubmit={handleSaveSettings} className="space-y-4 rounded-xl bg-zinc-800 p-5">
        <h2 className="font-semibold text-zinc-300">Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Group name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg bg-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Points per correct placement</label>
            <input
              type="number"
              min="1"
              required
              value={form.pointValue}
              onChange={(e) => setForm((f) => ({ ...f, pointValue: e.target.value }))}
              className="w-full rounded-lg bg-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Deadline and lock are managed in{" "}
          <a href="/admin/category-settings" className="underline hover:text-zinc-300">
            Category Settings
          </a>
          .
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>

      {/* Set results */}
      <form onSubmit={handleSaveResults} className="space-y-4 rounded-xl bg-zinc-800 p-5">
        <div>
          <h2 className="font-semibold text-zinc-300">Final Standings</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Order teams by their actual final placement. Saving triggers automatic scoring.
          </p>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-2 px-1 text-xs text-zinc-500">
          <span className="w-6 text-center">Pos</span>
          <span className="flex-1">Team</span>
          <span className="w-16" />
        </div>

        <div className="space-y-1.5">
          {resultOrder.map((team, idx) => (
            <div
              key={team.id}
              data-team-id={team.id}
              onPointerDown={(event) => handlePointerDown(event, team.id)}
              className={`flex items-center gap-2 rounded-lg bg-zinc-700/50 px-3 py-2 cursor-grab active:cursor-grabbing touch-none ${
                draggingTeamId === team.id ? "ring-1 ring-zinc-500 opacity-80" : ""
              } ${
                dropTargetTeamId === team.id && draggingTeamId !== team.id ? "ring-1 ring-sky-500" : ""
              }`}
            >
              <span className="w-6 text-center text-sm font-bold text-zinc-400">{idx + 1}</span>
              <span className="flex-1 text-sm">{team.answerItem.name}</span>
              <div className="flex w-16 justify-end gap-1">
                <button
                  type="button"
                  onClick={() => moveResult(idx, -1)}
                  disabled={idx === 0}
                  className="rounded bg-zinc-600 px-1.5 py-0.5 text-xs hover:bg-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveResult(idx, 1)}
                  disabled={idx === resultOrder.length - 1}
                  className="rounded bg-zinc-600 px-1.5 py-0.5 text-xs hover:bg-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>

        {resultsError && <p className="text-sm text-red-400">{resultsError}</p>}
        {resultsSaved && <p className="text-sm text-green-400">Results saved and scores updated!</p>}
        <button
          type="submit"
          disabled={savingResults}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {savingResults ? "Saving…" : "Save results & score"}
        </button>
      </form>

      <a href="/admin/groups" className="block text-sm text-zinc-500 hover:text-zinc-300">
        ← Back to groups
      </a>
    </div>
  );
}
