"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question, AnswerType, AnswerItem, Category } from "@prisma/client";

type FullQuestion = Question & {
  answerType: AnswerType & { items: AnswerItem[] };
  correctAnswers: AnswerItem[];
};
type FullAnswerType = AnswerType & { items: AnswerItem[] };

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "GROUP_STAGE", label: "Group Stage" },
  { value: "PLAYOFFS", label: "Playoffs" },
  { value: "STATS", label: "General Stats" },
];

function toLocalDatetime(date: Date | string) {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditQuestionClient({
  question,
  answerTypes,
}: {
  question: FullQuestion;
  answerTypes: FullAnswerType[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    text: question.text,
    category: question.category,
    answerTypeId: question.answerTypeId,
    deadline: toLocalDatetime(question.deadline),
    pointValue: String(question.pointValue),
    isLocked: question.isLocked,
  });
  const [correctIds, setCorrectIds] = useState<Set<string>>(
    new Set(question.correctAnswers.map((a) => a.id))
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentAnswerType = answerTypes.find((t) => t.id === form.answerTypeId);

  function toggleCorrect(id: string) {
    setCorrectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pointValue: Number(form.pointValue),
          correctAnswerItemIds: [...correctIds],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        return;
      }
      setSuccess("Saved! Scores recalculated.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/questions/${question.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to delete");
      setDeleting(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit Question</h1>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Question text
          </label>
          <textarea
            required
            rows={3}
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Points</label>
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
          <label className="mb-1 block text-sm font-medium text-zinc-300">Answer type</label>
          <select
            value={form.answerTypeId}
            onChange={(e) => setForm((f) => ({ ...f, answerTypeId: e.target.value }))}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {answerTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Submission deadline</label>
          <input
            type="datetime-local"
            required
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isLocked: !f.isLocked }))}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              form.isLocked
                ? "bg-red-700 text-white hover:bg-red-600"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            {form.isLocked ? "🔒 Submissions closed (click to reopen)" : "🔓 Submissions open (click to close)"}
          </button>
        </div>

        {/* Correct answers */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Correct answers <span className="text-zinc-500">(check all that apply — triggers re-score)</span>
          </label>
          {currentAnswerType ? (
            <div className="space-y-2 rounded-lg bg-zinc-800 p-3">
              {currentAnswerType.items.map((item) => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={correctIds.has(item.id)}
                    onChange={() => toggleCorrect(item.id)}
                    className="h-4 w-4 rounded accent-indigo-500"
                  />
                  <span className="text-sm">{item.name}</span>
                </label>
              ))}
              {currentAnswerType.items.length === 0 && (
                <p className="text-sm text-zinc-500">No items in this answer type.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Select an answer type above.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <a href="/admin" className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600">
            Cancel
          </a>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto rounded-lg bg-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-800 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>
    </div>
  );
}
