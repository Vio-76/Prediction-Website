"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type AnswerItem = { id: string; name: string };
type AnswerType = { id: string; name: string; items: AnswerItem[] };

export default function NewGroupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", pointValue: "1" });
  const [teamsPool, setTeamsPool] = useState<AnswerItem[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/answer-types")
      .then((r) => r.json())
      .then((data: AnswerType[]) => {
        const teams = data.find((t) => t.name === "Teams");
        setTeamsPool(teams ? teams.items.sort((a, b) => a.name.localeCompare(b.name)) : []);
      });
  }, []);

  function toggleTeam(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selectedIds.size < 2) {
      setError("Select at least 2 teams.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          pointValue: Number(form.pointValue),
          teamItemIds: [...selectedIds],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create group");
        return;
      }
      router.push("/admin/groups");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New Group</h1>

      {teamsPool !== null && teamsPool.length === 0 && (
        <div className="mb-4 rounded-lg bg-amber-900/30 border border-amber-700 p-4 text-sm text-amber-300">
          No &ldquo;Teams&rdquo; answer type exists yet.{" "}
          <a href="/admin/answer-types/new" className="underline">
            Create one first
          </a>{" "}
          and name it exactly <strong>Teams</strong>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Group name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Group A"
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Points per correct placement
            </label>
            <input
              type="number"
              min="1"
              required
              value={form.pointValue}
              onChange={(e) => setForm((f) => ({ ...f, pointValue: e.target.value }))}
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Teams in this group{" "}
            <span className="text-zinc-500">(select from the Teams pool)</span>
          </label>
          {teamsPool === null ? (
            <p className="text-sm text-zinc-500">Loading teams…</p>
          ) : teamsPool.length === 0 ? (
            <p className="text-sm text-zinc-500">No teams available.</p>
          ) : (
            <div className="space-y-1.5">
              {teamsPool.map((item) => (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    selectedIds.has(item.id)
                      ? "bg-indigo-900/50 ring-1 ring-indigo-500"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleTeam(item.id)}
                    className="accent-indigo-500"
                  />
                  <span className="text-sm">{item.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || teamsPool === null || teamsPool.length === 0}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Group"}
          </button>
          <a
            href="/admin/groups"
            className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
