"use client";

import { useState, useEffect } from "react";

type CategorySettings = {
  category: "GROUP_STAGE" | "PLAYOFFS" | "STATS";
  deadline: string | null;
  isLocked: boolean;
};

const LABELS: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  PLAYOFFS: "Playoffs (bracket has its own deadline)",
  STATS: "Stats",
};

function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CategorySettingsPage() {
  const [settings, setSettings] = useState<CategorySettings[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/category-settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  async function handleSave(cat: CategorySettings, deadline: string, isLocked: boolean) {
    setSaving(cat.category);
    setMessages((m) => ({ ...m, [cat.category]: "" }));
    const res = await fetch("/api/category-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: cat.category,
        deadline: deadline || null,
        isLocked,
      }),
    });
    setSaving(null);
    if (res.ok) {
      const updated: CategorySettings = await res.json();
      setSettings((prev) =>
        prev.map((s) => (s.category === cat.category ? updated : s))
      );
      setMessages((m) => ({ ...m, [cat.category]: "Saved!" }));
    } else {
      setMessages((m) => ({ ...m, [cat.category]: "Failed to save" }));
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Category Deadlines</h1>
        <a href="/admin" className="text-sm text-zinc-400 hover:text-zinc-300">
          ← Back
        </a>
      </div>

      {settings
        .filter((s) => s.category !== "PLAYOFFS")
        .map((s) => (
          <CategoryRow
            key={s.category}
            settings={s}
            label={LABELS[s.category]}
            saving={saving === s.category}
            message={messages[s.category] ?? ""}
            onSave={(deadline, isLocked) => handleSave(s, deadline, isLocked)}
          />
        ))}

      <p className="text-xs text-zinc-500">
        The Playoffs deadline is managed on the{" "}
        <a href="/admin/bracket" className="underline hover:text-zinc-300">
          Bracket page
        </a>
        .
      </p>
    </div>
  );
}

function CategoryRow({
  settings,
  label,
  saving,
  message,
  onSave,
}: {
  settings: CategorySettings;
  label: string;
  saving: boolean;
  message: string;
  onSave: (deadline: string, isLocked: boolean) => void;
}) {
  const [deadline, setDeadline] = useState(toLocalDatetime(settings.deadline));
  const [isLocked, setIsLocked] = useState(settings.isLocked);

  // Sync if parent reloads
  useEffect(() => {
    setDeadline(toLocalDatetime(settings.deadline));
    setIsLocked(settings.isLocked);
  }, [settings.deadline, settings.isLocked]);

  return (
    <div className="rounded-lg bg-zinc-800 p-4 space-y-4">
      <h2 className="font-semibold text-zinc-200">{label}</h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Submission deadline
        </label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full rounded-lg bg-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-zinc-500">Leave empty for no deadline.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsLocked((l) => !l)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            isLocked
              ? "bg-red-700 text-white hover:bg-red-600"
              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          }`}
        >
          {isLocked ? "🔒 Locked (click to unlock)" : "🔓 Open (click to lock)"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onSave(deadline, isLocked)}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message && (
          <span
            className={`text-sm ${message === "Saved!" ? "text-green-400" : "text-red-400"}`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
