import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { appendToPad } from "@/lib/jotDownPad";

const PRIORITY = { 1: "Must say", 2: "Should say", 3: "Drop first" };
const PRIORITY_CLS = {
  1: "bg-red-100 text-red-700 border-red-200",
  2: "bg-amber-100 text-amber-700 border-amber-200",
  3: "bg-slate-100 text-slate-600 border-slate-200",
};

const SCHEMA = {
  type: "object",
  properties: {
    notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          priority: { type: "integer" },
          evidence: { type: "string" },
        },
        required: ["text", "priority"],
      },
    },
  },
  required: ["notes"],
};

export default function AIJotDownDialog({ open, onOpenChange, contention }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const evidenceList = (contention?.evidence || [])
        .map((e) => [e.text, e.source].filter(Boolean).join(" — "))
        .join("\n");
      const prompt = `You are a debate coach writing a JOT-DOWN sheet: the shorthand a debater actually glances at while speaking, not a script.

Contention:
Title: ${contention?.title || ""}
Side: ${contention?.side || ""}
Claim: ${contention?.claim || ""}
Warrant: ${contention?.warrant || ""}
Impact: ${contention?.impact || ""}
Evidence on hand:
${evidenceList || "(none)"}
Prepared answers: ${(contention?.rebuttalResponses || []).join(" | ") || "(none)"}

Write 5 to 8 notes in speaking order: signpost, claim in one breath, warrant in one phrase, the evidence tag to cite, the impact, a weighing line, and one pre-emptive answer to the likeliest attack.

Rules:
- Each note is at most 12 words, written the way you'd whisper it to yourself ("they never warrant jobs — turn it").
- Use "you"/"they" shorthand, no full sentences, no filler.
- priority 1 = must say, 2 = should say, 3 = drop first when time is short. Mark at most two notes as 1.
- evidence: the source tag to cite for that note, or "" if none.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
      setNotes(Array.isArray(res?.notes) ? res.notes : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setNotes([]);
    generate();
  }, [open, contention?.id]);

  const allText = notes.map((n) => `[P${n.priority}] ${n.text}${n.evidence ? ` (${n.evidence})` : ""}`).join("\n");

  const copyAll = async () => {
    await navigator.clipboard.writeText(allText);
    toast({ title: "Jot-down notes copied" });
  };

  const sendToPad = () => {
    if (!contention?.projectId) {
      toast({ title: "Save this contention to a project first.", variant: "destructive" });
      return;
    }
    appendToPad(
      contention.projectId,
      notes.map((n, i) => ({
        id: `${Date.now()}-${i}`,
        text: n.text,
        evidence: n.evidence || "",
        priority: Math.min(3, Math.max(1, Number(n.priority) || 2)),
        contentionId: contention.id || "",
        done: false,
      }))
    );
    toast({ title: `${notes.length} notes added to Jot-Down` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" /> AI Jot-Down
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Condensing this contention into shorthand…
          </div>
        ) : notes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No notes came back. Try generating again.</p>
        ) : (
          <div className="space-y-1.5">
            {notes.map((n, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${PRIORITY_CLS[n.priority] || PRIORITY_CLS[2]}`}>
                  {PRIORITY[n.priority] || PRIORITY[2]}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{n.text}</p>
                  {n.evidence && <p className="text-[11px] text-slate-500 mt-0.5">cite: {n.evidence}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" /> Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={copyAll} disabled={!notes.length} className="gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
          <Button size="sm" onClick={sendToPad} disabled={!notes.length} className="gap-1.5 text-xs">
            Send to Jot-Down <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}