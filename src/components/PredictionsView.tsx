"use client";

import { useState, useEffect, useCallback } from "react";
import type { Question, AnswerType, AnswerItem, Prediction } from "@prisma/client";

type FullQuestion = Question & {
  answerType: AnswerType & { items: AnswerItem[] };
  correctAnswers: AnswerItem[];
};

type UserPrediction = Prediction & { answerItem: AnswerItem };

export default function PredictionsView({
  questions,
  initialPredictions,
  closed,
}: {
  questions: FullQuestion[];
  initialPredictions: UserPrediction[];
  closed: boolean;
}) {
  // Map: questionId → answerItemId
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialPredictions.map((p) => [p.questionId, p.answerItemId]))
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const savePrediction = useCallback(
    async (questionId: string, answerItemId: string) => {
      setSaving((s) => ({ ...s, [questionId]: true }));
      setSaved((s) => ({ ...s, [questionId]: false }));
      setErrors((e) => ({ ...e, [questionId]: "" }));
      try {
        const res = await fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            predictions: [{ questionId, answerItemId }],
          }),
        });
        const data = await res.json();
        const err = data.errors?.find(
          (e: { questionId: string }) => e.questionId === questionId
        );
        if (err) {
          setErrors((s) => ({ ...s, [questionId]: err.error }));
        } else {
          setSaved((s) => ({ ...s, [questionId]: true }));
          setTimeout(() => setSaved((s) => ({ ...s, [questionId]: false })), 2000);
        }
      } catch {
        setErrors((s) => ({ ...s, [questionId]: "Network error" }));
      } finally {
        setSaving((s) => ({ ...s, [questionId]: false }));
      }
    },
    []
  );

  function handleSelect(questionId: string, answerItemId: string) {
    setSelected((s) => ({ ...s, [questionId]: answerItemId }));
    savePrediction(questionId, answerItemId);
  }

  if (questions.length === 0) {
    return (
      <p className="text-zinc-500">No questions in this category yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q) => {
        const mySelection = selected[q.id];
        const correctIds = new Set(q.correctAnswers.map((a) => a.id));
        const hasResults = q.correctAnswers.length > 0;

        return (
          <div key={q.id} className="rounded-xl bg-zinc-800 p-5">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-4">
              <h3 className="font-semibold leading-snug">{q.text}</h3>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                  {q.pointValue} pt{q.pointValue !== 1 ? "s" : ""}
                </span>
                {closed ? (
                  <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                    Closed
                  </span>
                ) : (
                  <span className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">
                    Open
                  </span>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {q.answerType.items.map((item) => {
                const isSelected = mySelection === item.id;
                const isCorrect = hasResults && correctIds.has(item.id);
                const isWrong = hasResults && isSelected && !isCorrect;

                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      closed ? "cursor-default" : ""
                    } ${
                      isCorrect
                        ? "bg-green-900/40 ring-1 ring-green-600"
                        : isWrong
                        ? "bg-red-900/40 ring-1 ring-red-600"
                        : isSelected
                        ? "bg-indigo-900/50 ring-1 ring-indigo-500"
                        : "bg-zinc-700/50 hover:bg-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={item.id}
                      checked={isSelected}
                      disabled={closed}
                      onChange={() => !closed && handleSelect(q.id, item.id)}
                      className="accent-indigo-500"
                    />
                    <span className="flex-1 text-sm">{item.name}</span>
                    {isCorrect && (
                      <span className="text-xs text-green-400 font-medium">✓ Correct</span>
                    )}
                    {isWrong && (
                      <span className="text-xs text-red-400 font-medium">✗ Wrong</span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Status */}
            <div className="mt-2 h-4 text-xs">
              {saving[q.id] && <span className="text-zinc-400">Saving…</span>}
              {saved[q.id] && <span className="text-green-400">Saved!</span>}
              {errors[q.id] && <span className="text-red-400">{errors[q.id]}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
