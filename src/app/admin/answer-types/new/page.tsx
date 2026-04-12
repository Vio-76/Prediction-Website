"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAnswerTypePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [items, setItems] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateItem(i: number, val: string) {
    setItems((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }

  function addItem() {
    setItems((prev) => [...prev, ""]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      // Create the answer type
      const res = await fetch("/api/answer-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create");
        return;
      }
      const at = await res.json();

      // Add items
      const validItems = items.filter((v) => v.trim());
      await Promise.all(
        validItems.map((itemName) =>
          fetch(`/api/answer-types/${at.id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: itemName }),
          })
        )
      );

      router.push("/admin/answer-types");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">New Answer Type</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Type name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Teams, Players, Maps…"
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Items <span className="text-zinc-500">(add as many as you want, empty rows are ignored)</span>
          </label>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder={`Item ${i + 1}`}
                  className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="rounded-lg bg-zinc-700 px-3 text-zinc-400 hover:bg-zinc-600 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
          >
            + Add item
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Answer Type"}
          </button>
          <a
            href="/admin/answer-types"
            className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
