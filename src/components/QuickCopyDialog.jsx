import { useState } from "react";
import { ClipboardList, Loader2, Copy, Printer } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import ExportDocButton from "@/components/ExportDocButton";
import { contentionsToMarkdown } from "@/lib/exportDoc";

const SPEEDS = [
  { id: 15, label: "Slow handwriting (~15 wpm)" },
  { id: 25, label: "Average handwriting (~25 wpm)" },
  { id: 35, label: "Fast writer (~35 wpm)" },
  { id: 40, label: "Typing (~40 wpm)" },
];
const INCLUDES = [
  ["evidence", "Evidence & sources"],
  ["rebuttals", "Rebuttals + responses"],
  ["crossfire", "Crossfire questions"],
  ["weighing", "Weighing"],
];

export default function QuickCopyDialog({ contentions, title = "Quick Copy Sheet", label = "Quick Copy", iconOnly = false }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [wpm, setWpm] = useState(25);
  const [inc, setInc] = useState({ evidence: true, rebuttals: true, crossfire: false, weighing: true });
  const [shorthand, setShorthand] = useState(true);
  const [restrictions, setRestrictions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const budget = Math.max(30, Math.round(minutes * wpm * 0.85));

  const build = async () => {
    setLoading(true);
    const source = contentionsToMarkdown(contentions, 2);
    const text = await base44.integrations.Core.InvokeLLM({
      prompt: `You are formatting an existing set of debate contentions into a "copy-down sheet" for a debater who must hand-copy it in a no-devices debate.

STRICT RULES:
- DO NOT invent new arguments, evidence, statistics, or sources. Use ONLY what is in the source below. Reformat and condense wording only.
- The debater has ${minutes} minutes to copy at ~${wpm} words per minute, so the ENTIRE sheet must be at most ${budget} words. If the source is longer, keep the highest-value content (claim, warrant, impact first), and cut the least important detail.
- ${shorthand ? "Use common shorthand (w/, b/c, →, ↑, ↓, =, vs., &, impt) to speed copying." : "Do not use shorthand; write plain words."}
- Include: claim/warrant/impact for each contention${inc.evidence ? "; key evidence with source name (short quotes)" : "; NO evidence"}${inc.rebuttals ? "; top rebuttals with responses" : "; NO rebuttals"}${inc.crossfire ? "; crossfire questions" : "; NO crossfire"}${inc.weighing ? "; one-line weighing" : "; NO weighing"}.
- Layout: easy to copy by hand. Short numbered headings, one idea per line, no tables, no decoration, no markdown bold.
${restrictions.trim() ? `- Additional restrictions from the user (follow exactly): ${restrictions.trim()}` : ""}
- End with a line: "~N words" with your word count.

SOURCE CONTENTIONS:
${source}`,
    });
    setResult(typeof text === "string" ? text : JSON.stringify(text));
    setLoading(false);
  };

  const copy = () => { navigator.clipboard.writeText(result); toast({ title: "Copied" }); };

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size={iconOnly ? "icon" : "sm"} onClick={() => setOpen(true)} className="gap-1.5 text-xs h-8" title="Quick Copy sheet">
        <ClipboardList className="w-3 h-3" />{!iconOnly && label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500">Formats your existing contentions into one sheet sized to how long you have to copy it. No new arguments are created.</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Minutes to copy</label>
              <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Writing speed</label>
              <select value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="w-full h-9 rounded-md border border-input bg-white px-2 text-sm">
                {SPEEDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">Sheet limit: about <strong>{budget} words</strong>.</p>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {INCLUDES.map(([k, l]) => (
              <label key={k} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input type="checkbox" checked={inc[k]} onChange={(e) => setInc({ ...inc, [k]: e.target.checked })} /> {l}
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              <input type="checkbox" checked={shorthand} onChange={(e) => setShorthand(e.target.checked)} /> Use shorthand
            </label>
          </div>

          <Textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)} placeholder="Other restrictions, e.g. 'must fit on one index card', 'no more than 3 evidence cards', 'no arrows'" className="bg-white min-h-[60px]" />

          <Button onClick={build} disabled={loading || !contentions?.length} className="gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Formatting...</> : <><ClipboardList className="w-4 h-4" /> Build copy sheet ({contentions?.length || 0} contention{contentions?.length === 1 ? "" : "s"})</>}
          </Button>

          {result && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 text-xs h-8"><Copy className="w-3 h-3" /> Copy</Button>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5 text-xs h-8"><Printer className="w-3 h-3" /> Print</Button>
                <ExportDocButton title={title} getMarkdown={() => result} />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </span>
  );
}