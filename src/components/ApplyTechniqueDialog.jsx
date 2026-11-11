import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

// Turns a technique into written, project-specific material saved to the project's docs.
export default function ApplyTechniqueDialog({ technique, project, open, onOpenChange, onApplied }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState(project?.id || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (project?.id) setProjectId(project.id); }, [project?.id]);
  useEffect(() => { if (!open) setLoading(false); }, [open]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_for_technique"],
    queryFn: async () => {
      const res = await base44.entities.Project.filter({ isArchived: false }, { sort: "-updated_date", limit: 50 });
      return (res.items || res || []).filter(p => !p.isArchived);
    },
    enabled: open && !project,
  });

  const run = async () => {
    setLoading(true);
    const target = project || projects.find(p => p.id === projectId);
    const res = await base44.entities.Contention.filter({ projectId: target.id }, { sort: "-created_date", limit: 12 }).catch(() => []);
    const contentions = res.items || res || [];
    const material = contentions.map((c, i) => `${i + 1}. ${c.title} (${c.side || "side n/a"}) — Claim: ${c.claim || ""} | Warrant: ${c.warrant || ""} | Impact: ${c.impact || ""}`).join("\n");

    const out = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite debate coach. Apply the technique "${technique.name}" (${technique.def}) to the debater's project and write the finished material — not advice about it.

PROJECT: ${target.name}
FORMAT: ${target.format || "debate"}
RESOLUTION: ${target.resolution || "N/A"}
SIDE: ${target.side || "N/A"}

EXISTING CONTENTIONS:
${material || "none saved yet — apply the technique to the resolution itself"}

Instructions:
- Show exactly how this technique is deployed in THIS project, quoting or rewriting the relevant contention.
- If the project has no suitable contention, write what to add.
- Include the exact words to say in round.
- Ground everything in the resolution; never fabricate statistics or sources.

Reply ONLY with JSON: {"title": "short doc title starting with the technique name", "content": "markdown with sections ## How This Technique Wins, ## Applied Material, ## Say It Like This"}`,
      response_json_schema: {
        type: "object",
        properties: { title: { type: "string" }, content: { type: "string" } },
        required: ["title", "content"],
      },
    });

    await base44.entities.OtherDocument.create({
      ownerUserId: user?.id || target.ownerUserId,
      title: out.title || `${technique.name} — ${target.name}`,
      docLabel: `Technique: ${technique.name}`,
      description: technique.def,
      content: out.content,
      projectId: target.id,
    });

    queryClient.invalidateQueries({ queryKey: ["project_other_documents"] });
    queryClient.invalidateQueries({ queryKey: ["other_documents"] });
    toast({ title: `Applied to ${target.name}`, description: "Saved in the project's All Docs tab." });
    setLoading(false);
    onOpenChange(false);
    onApplied?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Apply "{technique?.name}"</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">{technique?.def}</p>
        {!project && (
          <div>
            <label className="text-xs font-semibold text-slate-600">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Choose a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {project && <p className="text-xs text-slate-500">Applying to <strong>{project.name}</strong></p>}
        <p className="text-xs text-slate-500">The AI coach writes this technique into your actual contentions and saves it as a project document.</p>
        <Button onClick={run} disabled={loading || !projectId} className="gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing it in...</> : <><Wand2 className="w-4 h-4" /> Apply technique</>}
        </Button>
      </DialogContent>
    </Dialog>
  );
}