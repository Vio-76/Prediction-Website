"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type AnswerType = { id: string; name: string };

const CATEGORIES = [
  { value: "GROUP_STAGE", label: "Group Stage" },
  { value: "PLAYOFFS", label: "Playoffs" },
  { value: "STATS", label: "General Stats" },
];

export default function NewQuestionPage() {
  const router = useRouter();
  const [answerTypes, setAnswerTypes] = useState<AnswerType[]>([]);
  const [form, setForm] = useState({
    text: "",
    category: "GROUP_STAGE",
    answerTypeId: "",
    deadline: "",
    pointValue: "1",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/answer-types")
      .then((r) => r.json())
      .then((data: AnswerType[]) => {
        setAnswerTypes(data);
        if (data.length > 0) setForm((f) => ({ ...f, answerTypeId: data[0].id }));
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pointValue: Number(form.pointValue),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create question");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New Question</h1>

      {answerTypes.length === 0 && (
        <div className="mb-4 rounded-lg bg-amber-900/30 border border-amber-700 p-4 text-sm text-amber-300">
          No answer types exist yet.{" "}
          <a href="/admin/answer-types/new" className="underline">
            Create one first.
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Question text
          </label>
          <textarea
            required
            rows={3}
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Which team will win the longest game?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Points
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

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Answer type (the pool of choices)
          </label>
          <select
            value={form.answerTypeId}
            onChange={(e) => setForm((f) => ({ ...f, answerTypeId: e.target.value }))}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">Select an answer type…</option>
            {answerTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Submission deadline
          </label>
          <input
            type="datetime-local"
            required
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !form.answerTypeId}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Question"}
          </button>
          <a
            href="/admin"
            className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
