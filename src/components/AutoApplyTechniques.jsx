import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, Wand2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { techniquesPromptText } from "@/lib/debateTechniques";

// One-tap coach playbook: the AI picks the highest-leverage techniques for the
// project's actual contentions, writes them in, and saves the result as a doc.
export default function AutoApplyTechniques({ project, onApplied }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState(project?.id || "");
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_for_auto_techniques"],
    queryFn: async () => {
      const res = await base44.entities.Project.filter({ isArchived: false }, { sort: "-updated_date", limit: 50 });
      return (res.items || res || []).filter((p) => !p.isArchived);
    },
    enabled: !project,
  });

  const target = project || projects.find((p) => p.id === projectId);

  const run = async () => {
    if (!target) return;
    setLoading(true);
    setPicked(null);
    const res = await base44.entities.Contention.filter({ projectId: target.id }, { sort: "-created_date", limit: 20 }).catch(() => []);
    const contentions = res.items || res || [];
    const material = contentions
      .map((c, i) => `${i + 1}. ${c.title} (${c.side || "side n/a"}) — Claim: ${c.claim || ""} | Warrant: ${c.warrant || ""} | Impact: ${c.impact || ""} | Evidence: ${(c.evidence || []).map((e) => e.source || "").filter(Boolean).join(", ") || "none"}`)
      .join("\n");

    try {
      const out = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an elite debate coach. Choose the 3-4 techniques that would most improve THIS project, then apply them to the debater's actual material.

PROJECT: ${target.name}
FORMAT: ${(target.format || "debate").replace(/_/g, " ")}
RESOLUTION: ${target.resolution || "N/A"}
SIDE: ${target.side || "N/A"}

CURRENT CONTENTIONS:
${material || "none saved yet — apply the techniques to the resolution itself"}

AVAILABLE TECHNIQUES:
${techniquesPromptText()}

Rules:
- Pick only techniques that fix a real gap in the material above (missing weighing, no pre-emption, weak impacts, etc.). Name them exactly as written in the list.
- For each pick, give one sentence on why it matters for this project.
- Then write the finished material: quote or rewrite the specific contention, and give the exact words to say in round.
- Never fabricate statistics or sources.

Reply ONLY with JSON: {"title": "short doc title starting with Coach Playbook", "techniques": [{"name": "...", "why": "..."}], "content": "markdown with ## Where You're Vulnerable, ## The Fixes, ## Say It Like This"}`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            techniques: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, why: { type: "string" } },
                required: ["name", "why"],
              },
            },
            content: { type: "string" },
          },
          required: ["title", "techniques", "content"],
        },
      });

      await base44.entities.OtherDocument.create({
        ownerUserId: user?.id || target.ownerUserId,
        title: out.title || `Coach Playbook — ${target.name}`,
        docLabel: "Coach Playbook",
        description: (out.techniques || []).map((t) => t.name).join(", "),
        content: out.content || "",
        projectId: target.id,
      });

      queryClient.invalidateQueries({ queryKey: ["project_other_documents"] });
      queryClient.invalidateQueries({ queryKey: ["other_documents"] });
      setPicked(out);
      toast({ title: `Applied to ${target.name}`, description: "Saved in the project's All Docs tab." });
      onApplied?.();
    } catch {
      toast({ title: "Couldn't apply techniques. Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-white to-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Wand2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 font-heading">Choose & Apply for Me</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            The coach reads {target ? target.name : "your project"}'s contentions, picks the techniques you're missing, and writes them in.
          </p>
        </div>
      </div>

      {!project && (
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-3 w-full h-9 rounded-md border border-input bg-white px-2 text-sm text-black"
        >
          <option value="">Choose a project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <Button onClick={run} disabled={loading || !target} className="w-full mt-3 h-12 gap-2 text-sm font-semibold">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? "Finding your best techniques..." : "Find the best techniques and apply them"}
      </Button>

      {picked && (
        <div className="mt-3 bg-white rounded-xl border border-slate-200 p-3 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applied</div>
          <div className="flex flex-wrap gap-1.5">
            {(picked.techniques || []).map((t, i) => (
              <span key={i} title={t.why} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> {t.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500">Saved to the All Docs tab as a Coach Playbook.</p>
        </div>
      )}
    </div>
  );
}