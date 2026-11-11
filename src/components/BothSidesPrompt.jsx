import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { generateBatch } from "@/components/ProjectContentionGenerator";
import { Scale, Sparkles, Loader2, X } from "lucide-react";

// One-off migration offer for projects that were created before two-sided prep shipped.
const CUTOFF = "2026-11-11";
const WINDOW_DAYS = 7;
const PRO_SIDES = ["government", "affirmative", "sponsor", "pro"];

const sidesFor = (format) => {
  if (format === "parliamentary") return { pro: "government", opp: "opposition", proLabel: "Gov", oppLabel: "Opp" };
  if (format === "model_congress") return { pro: "sponsor", opp: "opposition", proLabel: "Sponsor", oppLabel: "Opposition" };
  if (format === "model_un") return { pro: "affirmative", opp: "negative", proLabel: "Affirmative", oppLabel: "Negative" };
  return { pro: "affirmative", opp: "negative", proLabel: "Pro", oppLabel: "Con" };
};

export default function BothSidesPrompt({ project, contentions = [], aiMode = "full", conferenceContext = "" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState(false);
  const [generating, setGenerating] = useState(false);

  const storageKey = `both_sides_mig_${project?.id}`;
  const handled = typeof localStorage !== "undefined" && ["done", "dismissed"].includes(localStorage.getItem(storageKey));
  const expired = Date.now() > new Date(CUTOFF).getTime() + WINDOW_DAYS * 86400000;
  const isExistingProject = project?.created_date && new Date(project.created_date).getTime() < new Date(CUTOFF).getTime();

  const sides = sidesFor(project?.format);
  const proCount = contentions.filter(c => PRO_SIDES.includes((c.side || "").toLowerCase())).length;
  const oppCount = contentions.length - proCount;
  const missingSide = proCount === 0 && oppCount > 0 ? "pro" : oppCount === 0 && proCount > 0 ? "opp" : null;

  if (hidden || handled || expired || !isExistingProject || !missingSide) return null;

  const missingLabel = missingSide === "pro" ? sides.proLabel : sides.oppLabel;
  const existingLabel = missingSide === "pro" ? sides.oppLabel : sides.proLabel;

  const stop = (value) => {
    localStorage.setItem(storageKey, value);
    setHidden(true);
  };

  const generate = async () => {
    setGenerating(true);
    const format = project?.format === "parliamentary" ? "parliamentary" : "public_forum";
    const form = {
      resolution: project?.resolution || project?.name || "",
      side: missingSide === "pro" ? sides.pro : sides.opp,
      count: "2",
      difficulty: "intermediate",
      evidencePreference: "academic",
      context: ""
    };
    try {
      const generated = await generateBatch(2, form, format, aiMode, conferenceContext, project?.format);
      if (!generated.length) throw new Error("Nothing generated");
      await Promise.all(generated.map(c => base44.entities.Contention.create({
        ownerUserId: user?.id,
        title: c.title,
        format,
        resolution: form.resolution,
        side: form.side,
        claim: c.claim, warrant: c.warrant, impact: c.impact, evidence: c.evidence,
        possibleRebuttals: c.possibleRebuttals, rebuttalResponses: c.rebuttalResponses,
        crossfireQuestions: c.crossfireQuestions, crossfireAnswers: c.crossfireAnswers,
        strategicNotes: c.strategicNotes, difficulty: form.difficulty,
        projectId: project.id,
      })));
      queryClient.invalidateQueries({ queryKey: ['project_contentions', project.id] });
      stop("done");
      toast({ title: `${generated.length} ${missingLabel} contentions added — this project now covers both sides.` });
    } catch (e) {
      toast({ title: "Could not generate the other side. Try the generator above.", variant: "destructive" });
    }
    setGenerating(false);
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shrink-0">
          <Scale className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 font-heading text-sm">Now you can prep both sides</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            This project only has {existingLabel} contentions. Add a matching {missingLabel} case so both sides live in one project. This one-time offer goes away in 7 days.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button size="sm" onClick={generate} disabled={generating} className="gap-1.5 text-xs">
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generating ? `Generating ${missingLabel} contentions...` : "Re-generate to Both Sides"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => stop("dismissed")} disabled={generating} className="text-xs text-slate-500">
              Not now
            </Button>
          </div>
        </div>
        <button onClick={() => stop("dismissed")} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/70 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}