"use client";

import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type AnswerItem = { id: string; name: string };

type BracketMatch = {
  id: string;
  matchNumber: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  team1Score: number | null;
  team2Score: number | null;
  team1: AnswerItem | null;
  team2: AnswerItem | null;
  winner: AnswerItem | null;
};

type BracketRound = {
  id: string;
  name: string;
  bracketSide: "WINNER" | "LOSER" | "GRAND_FINAL";
  order: number;
  matches: BracketMatch[];
};

type BracketTournament = {
  id: string;
  name: string;
  format: "SINGLE_ELIM" | "DOUBLE_ELIM";
  allowScorePrediction: boolean;
  pointsPerWinner: number;
  pointsPerScore: number;
  deadline: string | null;
  isLocked: boolean;
  rounds: BracketRound[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SIDE_LABELS: Record<string, string> = {
  WINNER: "Winner bracket",
  LOSER: "Loser bracket",
  GRAND_FINAL: "Grand Final",
};

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminBracketPage() {
  const [tournament, setTournament] = useState<BracketTournament | null | undefined>(undefined);
  const [teams, setTeams] = useState<AnswerItem[]>([]);
  const [noTeamsType, setNoTeamsType] = useState(false);

  useEffect(() => {
    fetch("/api/bracket")
      .then((r) => r.json())
      .then(setTournament);
    // Items are already included in the /api/answer-types response
    fetch("/api/answer-types")
      .then((r) => r.json())
      .then((types: { id: string; name: string; items: AnswerItem[] }[]) => {
        const teamsType = types.find((t) => t.name === "Teams");
        if (teamsType) {
          setTeams(teamsType.items);
        } else {
          setNoTeamsType(true);
        }
      });
  }, []);

  if (tournament === undefined) return <p className="text-zinc-400">Loading…</p>;

  const teamsWarning = noTeamsType ? (
    <div className="mb-6 rounded-lg bg-amber-900/30 border border-amber-700 px-4 py-3 text-sm text-amber-300">
      No &quot;Teams&quot; answer type found. Match team dropdowns will be empty.{" "}
      <a href="/admin/answer-types/new" className="underline hover:text-amber-200">
        Create it first
      </a>
      , then add teams as items.
    </div>
  ) : null;

  if (!tournament) {
    return (
      <>
        {teamsWarning}
        <CreateBracketForm onCreate={setTournament} />
      </>
    );
  }

  return (
    <>
      {teamsWarning}
      <BracketManager
        tournament={tournament}
        teams={teams}
        onUpdate={setTournament}
      />
    </>
  );
}

// ─── Create bracket form ─────────────────────────────────────────────────────

function CreateBracketForm({ onCreate }: { onCreate: (t: BracketTournament) => void }) {
  const [form, setForm] = useState({
    name: "",
    format: "SINGLE_ELIM" as "SINGLE_ELIM" | "DOUBLE_ELIM",
    allowScorePrediction: false,
    pointsPerWinner: "1",
    pointsPerScore: "1",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        pointsPerWinner: Number(form.pointsPerWinner),
        pointsPerScore: Number(form.pointsPerScore),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const t = await res.json();
      onCreate({ ...t, rounds: [] });
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to create");
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bracket</h1>
        <a href="/admin" className="text-sm text-zinc-400 hover:text-zinc-300">← Back</a>
      </div>
      <p className="mb-4 text-zinc-400 text-sm">No bracket exists yet. Create one to get started.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. MSI 2025 Playoffs"
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Format</label>
          <select
            value={form.format}
            onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as "SINGLE_ELIM" | "DOUBLE_ELIM" }))}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="SINGLE_ELIM">Single Elimination</option>
            <option value="DOUBLE_ELIM">Double Elimination</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Points per correct winner</label>
            <input
              type="number" min="0" required
              value={form.pointsPerWinner}
              onChange={(e) => setForm((f) => ({ ...f, pointsPerWinner: e.target.value }))}
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Points per exact score</label>
            <input
              type="number" min="0" required
              value={form.pointsPerScore}
              onChange={(e) => setForm((f) => ({ ...f, pointsPerScore: e.target.value }))}
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="allowScore"
            type="checkbox"
            checked={form.allowScorePrediction}
            onChange={(e) => setForm((f) => ({ ...f, allowScorePrediction: e.target.checked }))}
            className="h-4 w-4 rounded accent-indigo-500"
          />
          <label htmlFor="allowScore" className="text-sm text-zinc-300">Allow score predictions</label>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create Bracket"}
        </button>
      </form>
    </div>
  );
}

// ─── Bracket manager ─────────────────────────────────────────────────────────

function BracketManager({
  tournament,
  teams,
  onUpdate,
}: {
  tournament: BracketTournament;
  teams: AnswerItem[];
  onUpdate: (t: BracketTournament) => void;
}) {
  const [deadline, setDeadline] = useState(toLocalDatetime(tournament.deadline));
  const [isLocked, setIsLocked] = useState(tournament.isLocked);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  async function saveSettings() {
    setSettingsSaving(true);
    setSettingsMsg("");
    const res = await fetch("/api/bracket", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadline: deadline || null, isLocked }),
    });
    setSettingsSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onUpdate({ ...tournament, ...updated });
      setSettingsMsg("Saved!");
    } else {
      setSettingsMsg("Failed to save");
    }
  }

  async function addRound(name: string, bracketSide: string, order: number) {
    const res = await fetch("/api/bracket/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bracketSide, order }),
    });
    if (res.ok) {
      const round: BracketRound = { ...(await res.json()), matches: [] };
      onUpdate({ ...tournament, rounds: [...tournament.rounds, round].sort((a, b) => a.order - b.order) });
    }
  }

  async function deleteRound(roundId: string) {
    if (!confirm("Delete this round and all its matches?")) return;
    await fetch(`/api/bracket/rounds/${roundId}`, { method: "DELETE" });
    onUpdate({ ...tournament, rounds: tournament.rounds.filter((r) => r.id !== roundId) });
  }

  async function addMatch(roundId: string, matchNumber: number) {
    const res = await fetch("/api/bracket/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, matchNumber }),
    });
    if (res.ok) {
      const match: BracketMatch = await res.json();
      onUpdate({
        ...tournament,
        rounds: tournament.rounds.map((r) =>
          r.id === roundId ? { ...r, matches: [...r.matches, match] } : r
        ),
      });
    }
  }

  async function updateMatch(matchId: string, data: Partial<BracketMatch>) {
    const res = await fetch(`/api/bracket/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated: BracketMatch = await res.json();
      onUpdate({
        ...tournament,
        rounds: tournament.rounds.map((r) => ({
          ...r,
          matches: r.matches.map((m) => (m.id === matchId ? updated : m)),
        })),
      });
    }
  }

  async function deleteMatch(matchId: string) {
    await fetch(`/api/bracket/matches/${matchId}`, { method: "DELETE" });
    onUpdate({
      ...tournament,
      rounds: tournament.rounds.map((r) => ({
        ...r,
        matches: r.matches.filter((m) => m.id !== matchId),
      })),
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <a href="/admin" className="text-sm text-zinc-400 hover:text-zinc-300">← Back</a>
      </div>

      {/* Settings */}
      <div className="rounded-lg bg-zinc-800 p-4 space-y-4">
        <h2 className="font-semibold text-zinc-200">Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Submission deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg bg-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => setIsLocked((l) => !l)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isLocked ? "bg-red-700 text-white hover:bg-red-600" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              }`}
            >
              {isLocked ? "🔒 Locked" : "🔓 Open"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-400">
            Format: <span className="text-zinc-200">{tournament.format === "SINGLE_ELIM" ? "Single Elimination" : "Double Elimination"}</span>
            {" · "}
            {tournament.pointsPerWinner} pt/winner
            {tournament.allowScorePrediction && ` · ${tournament.pointsPerScore} pt/score`}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveSettings}
            disabled={settingsSaving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {settingsSaving ? "Saving…" : "Save Settings"}
          </button>
          {settingsMsg && (
            <span className={`text-sm ${settingsMsg === "Saved!" ? "text-green-400" : "text-red-400"}`}>
              {settingsMsg}
            </span>
          )}
        </div>
      </div>

      {/* Rounds */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-zinc-300">Rounds &amp; Matches</h2>

        {tournament.rounds.map((round) => (
          <RoundCard
            key={round.id}
            round={round}
            teams={teams}
            allowScorePrediction={tournament.allowScorePrediction}
            onAddMatch={() => addMatch(round.id, round.matches.length + 1)}
            onUpdateMatch={updateMatch}
            onDeleteMatch={deleteMatch}
            onDeleteRound={() => deleteRound(round.id)}
          />
        ))}

        <AddRoundForm
          nextOrder={tournament.rounds.length + 1}
          showLoserSide={tournament.format === "DOUBLE_ELIM"}
          onAdd={addRound}
        />
      </div>
    </div>
  );
}

// ─── Round card ───────────────────────────────────────────────────────────────

function RoundCard({
  round,
  teams,
  allowScorePrediction,
  onAddMatch,
  onUpdateMatch,
  onDeleteMatch,
  onDeleteRound,
}: {
  round: BracketRound;
  teams: AnswerItem[];
  allowScorePrediction: boolean;
  onAddMatch: () => void;
  onUpdateMatch: (matchId: string, data: Partial<BracketMatch>) => void;
  onDeleteMatch: (matchId: string) => void;
  onDeleteRound: () => void;
}) {
  return (
    <div className="rounded-lg bg-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-zinc-200">{round.name}</span>
          <span className="ml-2 text-xs text-zinc-500">{SIDE_LABELS[round.bracketSide]} · order {round.order}</span>
        </div>
        <button
          onClick={onDeleteRound}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Delete round
        </button>
      </div>

      <div className="space-y-2">
        {round.matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            teams={teams}
            allowScorePrediction={allowScorePrediction}
            onUpdate={(data) => onUpdateMatch(match.id, data)}
            onDelete={() => onDeleteMatch(match.id)}
          />
        ))}
      </div>

      <button
        onClick={onAddMatch}
        className="text-sm text-indigo-400 hover:text-indigo-300"
      >
        + Add match
      </button>
    </div>
  );
}

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchRow({
  match,
  teams,
  allowScorePrediction,
  onUpdate,
  onDelete,
}: {
  match: BracketMatch;
  teams: AnswerItem[];
  allowScorePrediction: boolean;
  onUpdate: (data: Partial<BracketMatch>) => void;
  onDelete: () => void;
}) {
  const [t1Score, setT1Score] = useState(String(match.team1Score ?? ""));
  const [t2Score, setT2Score] = useState(String(match.team2Score ?? ""));

  function saveScores() {
    const t1 = t1Score === "" ? null : Number(t1Score);
    const t2 = t2Score === "" ? null : Number(t2Score);
    onUpdate({ team1Score: t1, team2Score: t2 });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded bg-zinc-700 px-3 py-2 text-sm">
      <span className="text-zinc-400 w-6">#{match.matchNumber}</span>

      {/* Team 1 */}
      <select
        value={match.team1Id ?? ""}
        onChange={(e) => onUpdate({ team1Id: e.target.value || null })}
        className="rounded bg-zinc-600 px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">TBD</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <span className="text-zinc-500">vs</span>

      {/* Team 2 */}
      <select
        value={match.team2Id ?? ""}
        onChange={(e) => onUpdate({ team2Id: e.target.value || null })}
        className="rounded bg-zinc-600 px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">TBD</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      {/* Winner */}
      <select
        value={match.winnerId ?? ""}
        onChange={(e) => onUpdate({ winnerId: e.target.value || null })}
        className="rounded bg-zinc-600 px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">No result yet</option>
        {match.team1 && <option value={match.team1.id}>{match.team1.name} wins</option>}
        {match.team2 && <option value={match.team2.id}>{match.team2.name} wins</option>}
      </select>

      {/* Score (only if enabled) */}
      {allowScorePrediction && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            placeholder="0"
            value={t1Score}
            onChange={(e) => setT1Score(e.target.value)}
            className="w-12 rounded bg-zinc-600 px-2 py-1 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-zinc-500">-</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={t2Score}
            onChange={(e) => setT2Score(e.target.value)}
            className="w-12 rounded bg-zinc-600 px-2 py-1 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={saveScores}
            className="text-xs text-indigo-400 hover:text-indigo-300 ml-1"
          >
            Save score
          </button>
        </div>
      )}

      <button
        onClick={onDelete}
        className="ml-auto text-xs text-red-400 hover:text-red-300"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Add round form ───────────────────────────────────────────────────────────

function AddRoundForm({
  nextOrder,
  showLoserSide,
  onAdd,
}: {
  nextOrder: number;
  showLoserSide: boolean;
  onAdd: (name: string, bracketSide: string, order: number) => void;
}) {
  const [name, setName] = useState("");
  const [bracketSide, setBracketSide] = useState("WINNER");
  const [order, setOrder] = useState(String(nextOrder));

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), bracketSide, Number(order));
    setName("");
    setOrder(String(Number(order) + 1));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-800 px-4 py-3">
      <input
        placeholder="Round name (e.g. Quarterfinals)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 min-w-40 rounded bg-zinc-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {showLoserSide && (
        <select
          value={bracketSide}
          onChange={(e) => setBracketSide(e.target.value)}
          className="rounded bg-zinc-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="WINNER">Winner bracket</option>
          <option value="LOSER">Loser bracket</option>
          <option value="GRAND_FINAL">Grand Final</option>
        </select>
      )}
      <input
        type="number"
        min="1"
        value={order}
        onChange={(e) => setOrder(e.target.value)}
        className="w-16 rounded bg-zinc-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Display order"
      />
      <button
        onClick={handleAdd}
        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        + Add Round
      </button>
    </div>
  );
}
