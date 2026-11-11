import { useState, useEffect, useMemo } from "react";
import { PenLine, Play, Pause, RotateCcw, Plus, Trash2, Clock, Save, AlertTriangle, Tag, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { readPad, padKey } from "@/lib/jotDownPad";

/**
 * Jot-Down: the quick-note pad you scribble on during a round.
 * Shorthand entries with an evidence name, a priority, and a time budget that
 * re-splits across whatever you still have to say.
 */
const PRIORITIES = [
  { id: 1, label: "Must say", cls: "bg-red-100 text-red-700 border-red-200" },
  { id: 2, label: "Should say", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: 3, label: "Drop first", cls: "bg-slate-100 text-slate-600 border-slate-200" },
];

const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export default function ProjectJotDown({ project, contentions = [] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const storageKey = padKey(project?.id);

  const [speechMinutes, setSpeechMinutes] = useState(7);
  const [remaining, setRemaining] = useState(420);
  const [running, setRunning] = useState(false);
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [evidence, setEvidence] = useState("");
  const [priority, setPriority] = useState(1);
  const [contentionId, setContentionId] = useState("");
  const [saving, setSaving] = useState(false);

  // The evidence library is the source pool Jot-Down suggests from.
  const { data: library = [] } = useQuery({
    queryKey: ["evidence"],
    queryFn: async () => {
      const res = await base44.entities.Evidence.filter({}, { sort: "-created_date", limit: 200 });
      return res.items || [];
    },
  });

  // load per-project pad
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries)) setEntries(parsed.entries);
      if (parsed.speechMinutes) {
        setSpeechMinutes(parsed.speechMinutes);
        setRemaining(parsed.speechMinutes * 60);
      }
    } catch { /* ignore bad local data */ }
  }, [storageKey]);

  // notes generated from a contention land in the same pad — pick them up
  useEffect(() => {
    const onUpdate = (e) => {
      const from = e.detail?.projectId;
      if (from && project?.id && from !== project.id) return;
      const pad = readPad(project?.id);
      if (Array.isArray(pad.entries)) setEntries(pad.entries);
    };
    window.addEventListener("jotdown-updated", onUpdate);
    return () => window.removeEventListener("jotdown-updated", onUpdate);
  }, [project?.id]);

  // autosave pad
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify({ entries, speechMinutes })); } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [entries, speechMinutes, storageKey]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && running) setRunning(false);
  }, [remaining, running]);

  const total = speechMinutes * 60;
  const undone = entries.filter((e) => !e.done);
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  // A note's time comes from its own words at ~150 wpm, so a one-word jot reads
  // as ~1s instead of inheriting whatever is left on the clock.
  const secFor = (t) => {
    const words = String(t || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round((words / 150) * 60));
  };
  const plannedSec = undone.reduce((a, e) => a + secFor(e.text), 0);
  const slack = remaining - plannedSec;

  const barColor = pct > 0.5 ? "bg-emerald-500" : pct > 0.2 ? "bg-amber-500" : "bg-red-500";
  const hint = remaining === 0
    ? "Time. Stop adding, weigh your top impact, and sit down."
    : slack < 0
      ? `${Math.abs(slack)}s over what fits (${plannedSec}s of notes on ${remaining}s). Cut the "Drop first" notes or compress the top one.`
      : `${slack}s of room left after ${undone.length} note${undone.length === 1 ? "" : "s"} (~${plannedSec}s to say).`;

  const labelFor = (item) => (item.source ? `${item.title} — ${item.source}` : item.title);

  const evidenceNames = useMemo(() => {
    const set = new Set(entries.map((e) => e.evidence).filter(Boolean));
    library.forEach((item) => set.add(labelFor(item)));
    contentions.forEach((c) => (c.evidence || []).forEach((ev) => { if (ev.source) set.add(ev.source); }));
    return [...set].slice(0, 60);
  }, [entries, contentions, library]);

  // Saved sources that fit the note being written: words in the note, then the
  // contention it belongs to. With nothing to match, the newest saves are offered.
  const evidenceSuggestions = useMemo(() => {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
    const scored = library.map((item) => {
      const hay = `${item.title} ${item.content} ${item.category || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
      let score = 0;
      words.forEach((w) => { if (hay.includes(w)) score += 1; });
      if (contentionId && item.contentionId === contentionId) score += 3;
      return { id: item.id, label: labelFor(item), score };
    });
    const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    return (matched.length > 0 ? matched : scored).slice(0, 5);
  }, [library, text, contentionId]);

  const add = () => {
    if (!text.trim()) return;
    setEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        text: text.trim(),
        evidence: evidence.trim(),
        priority,
        contentionId,
        done: false,
      },
    ]);
    setText("");
    setEvidence("");
  };

  const patch = (id, data) => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  const remove = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const resetTimer = () => {
    setRunning(false);
    setRemaining(total);
  };

  const dropPriorityThrees = () => setEntries((prev) => prev.filter((e) => e.priority !== 3));

  const saveDoc = async () => {
    if (!entries.length) return;
    setSaving(true);
    const content = `# Jot-Down — ${project?.name || "Round"}\n\nSpeech length: ${speechMinutes} min\n\n` +
      [...entries]
        .sort((a, b) => a.priority - b.priority)
        .map((e) => `- **[P${e.priority}]** ${e.text}${e.evidence ? ` _(evidence: ${e.evidence})_` : ""}${e.done ? " ✓" : ""}`)
        .join("\n");
    await base44.entities.OtherDocument.create({
      ownerUserId: user?.id || project?.ownerUserId,
      title: `Jot-Down — ${project?.name || "Round"}`,
      docLabel: "Jot-Down",
      description: "Quick round notes with evidence tags and priorities.",
      content,
      projectId: project?.id,
    });
    setSaving(false);
    toast({ title: "Jot sheet saved to your documents" });
  };

  const sorted = [...entries].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-4">
      {/* Timer + adaptive guidance */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5" /> Jot-Down Sheet
            </div>
            <div className="text-3xl font-bold font-heading tabular-nums mt-1">{fmt(remaining)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRunning(!running)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl text-sm font-semibold">
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {running ? "Pause" : "Start"}
            </button>
            <button onClick={resetTimer} className="p-2 bg-white/15 hover:bg-white/25 rounded-xl" title="Reset timer">
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs bg-white/10 px-2.5 py-2 rounded-xl">
              <Clock className="w-3.5 h-3.5" />
              <input
                type="number" min={0.5} max={30} step={0.5} value={speechMinutes}
                onChange={(e) => {
                  const v = Math.min(30, Math.max(0.5, +e.target.value || 0.5));
                  setSpeechMinutes(v);
                  setRemaining(v * 60);
                  setRunning(false);
                }}
                className="w-12 bg-transparent text-white text-sm outline-none"
              />
              min
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/15 overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct * 100}%` }} />
        </div>
        <p className="text-xs text-slate-300 mt-2 flex items-start gap-1.5">
          {remaining === 0 ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : null}
          {hint}
        </p>
      </div>

      {/* Quick add */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="Jot it: 'they never answer warrant on jobs — turn it'"
            className="flex-1 text-sm"
          />
          <Button onClick={add} className="gap-1.5 shrink-0"><Plus className="w-4 h-4" /> Add</Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              list="jot-evidence-names"
              placeholder="Evidence name (e.g. Brookings 2024)"
              className="pl-8 text-sm"
            />
            <datalist id="jot-evidence-names">
              {evidenceNames.map((n) => <option key={n} value={n} />)}
            </datalist>
            {evidenceSuggestions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[11px] text-slate-400 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Your library:</span>
                {evidenceSuggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setEvidence(s.label)}
                    className="text-[11px] bg-primary/5 border border-primary/20 text-primary px-2 py-0.5 rounded-full hover:bg-primary/10 max-w-[13rem] truncate"
                    title={s.label}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={contentionId}
            onChange={(e) => setContentionId(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-white px-2 text-sm text-black"
          >
            <option value="">Tie to a contention (optional)</option>
            {contentions.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <div className="flex gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPriority(p.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${priority === p.id ? p.cls : "bg-white text-slate-500 border-slate-200"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jot list */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <PenLine className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nothing jotted yet. During a round, write the short version here — not the whole flow.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pct <= 0.2 && entries.some((e) => e.priority === 3 && !e.done) && (
            <button onClick={dropPriorityThrees} className="text-xs text-red-600 hover:underline flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Time's short — drop all "Drop first" notes
            </button>
          )}
          {sorted.map((e) => {
            const p = PRIORITIES.find((x) => x.id === e.priority) || PRIORITIES[0];
            const linked = contentions.find((c) => c.id === e.contentionId);
            return (
              <div key={e.id} className={`bg-white rounded-xl border p-3 shadow-sm ${e.done ? "opacity-60 border-slate-100" : "border-slate-200"}`}>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!!e.done}
                    onChange={(ev) => patch(e.id, { done: ev.target.checked })}
                    className="mt-1 w-4 h-4 accent-primary shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm text-slate-800 ${e.done ? "line-through" : ""}`}>{e.text}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full border font-semibold ${p.cls}`}>{p.label}</span>
                      {e.evidence && <span className="text-[11px] bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{e.evidence}</span>}
                      {linked && <span className="text-[11px] text-slate-400 truncate max-w-[12rem]">{linked.title}</span>}
                      {!e.done && <span className="text-[11px] text-primary font-semibold ml-auto flex items-center gap-1"><Clock className="w-2.5 h-2.5" />~{secFor(e.text)}s</span>}
                    </div>
                  </div>
                  <button onClick={() => remove(e.id)} className="p-1 text-slate-300 hover:text-red-400 rounded-lg shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={saveDoc} disabled={saving} className="gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save jot sheet to project docs"}
          </Button>
        </div>
      )}
    </div>
  );
}