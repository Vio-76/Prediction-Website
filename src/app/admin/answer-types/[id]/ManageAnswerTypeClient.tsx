"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnswerType, AnswerItem } from "@prisma/client";

type FullAnswerType = AnswerType & {
  items: AnswerItem[];
  _count: { questions: number };
};

export default function ManageAnswerTypeClient({
  answerType: initial,
}: {
  answerType: FullAnswerType;
}) {
  const router = useRouter();
  const [typeName, setTypeName] = useState(initial.name);
  const [items, setItems] = useState(initial.items);
  const [newItem, setNewItem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  async function saveTypeName() {
    const res = await fetch(`/api/answer-types/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: typeName }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to rename");
    } else {
      router.refresh();
    }
  }

  async function addItem() {
    if (!newItem.trim()) return;
    const res = await fetch(`/api/answer-types/${initial.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newItem.trim() }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItem("");
    }
  }

  async function saveItemName(itemId: string) {
    const res = await fetch(`/api/answer-types/${initial.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, name: editingName } : i))
      );
      setEditingId(null);
    }
  }

  async function deleteItem(itemId: string) {
    const res = await fetch(`/api/answer-types/${initial.id}/items/${itemId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to delete");
    }
  }

  async function deleteType() {
    if (!confirm(`Delete "${initial.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/answer-types/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/answer-types");
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to delete");
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold">Manage Answer Type</h1>

      {/* Type name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Type name</label>
        <div className="flex gap-2">
          <input
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={saveTypeName}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Rename
          </button>
        </div>
      </div>

      {/* Items */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Items <span className="text-sm font-normal text-zinc-400">({items.length})</span>
        </h2>

        {/* Add item */}
        <div className="mb-4 flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            placeholder="New item name…"
            className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addItem}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="flex gap-2">
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveItemName(item.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 rounded-lg bg-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => saveItemName(item.id)}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2"
              >
                <span className="flex-1 text-sm">{item.name}</span>
                <button
                  onClick={() => { setEditingId(item.id); setEditingName(item.name); }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Rename
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            )
          )}
          {items.length === 0 && (
            <p className="text-sm text-zinc-500">No items yet.</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
        <a href="/admin/answer-types" className="text-sm text-zinc-400 hover:text-white">
          ← Back to answer types
        </a>
        <button
          onClick={deleteType}
          className="rounded-lg bg-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-800"
        >
          Delete type
        </button>
      </div>
    </div>
  );
}
