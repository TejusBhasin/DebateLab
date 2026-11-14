import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Gavel, Loader2, RefreshCw, Trash2, Link2 } from "lucide-react";
import { tailorContentions } from "@/lib/judgeTailoring";
import JudgeContentionCard from "@/components/JudgeContentionCard";

export default function JudgeTailoredTab({ profile, project, contentions = [], onDeleted }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [working, setWorking] = useState(false);
  const items = profile.tailoredContentions || [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["judge_profiles", project.id] });

  const saveItem = async (updated) => {
    await base44.entities.JudgeProfile.update(profile.id, {
      tailoredContentions: items.map((c) => (c.id === updated.id ? updated : c)),
    });
    refresh();
    toast({ title: "Contention updated" });
  };

  const deleteItem = async (id) => {
    await base44.entities.JudgeProfile.update(profile.id, {
      tailoredContentions: items.filter((c) => c.id !== id),
    });
    refresh();
  };

  const regenerate = async () => {
    if (!confirm(`Re-tailor every contention for ${profile.judgeName}? Your hand edits will be replaced.`)) return;
    setWorking(true);
    try {
      const result = await tailorContentions(project, contentions, profile);
      await base44.entities.JudgeProfile.update(profile.id, {
        judgeSummary: result.judgeSummary,
        tailoredContentions: result.tailoredContentions,
      });
      refresh();
      toast({ title: `Re-tailored to ${profile.judgeName}` });
    } finally {
      setWorking(false);
    }
  };

  const removeTab = async () => {
    if (!confirm(`Delete the "${profile.judgeName}" tailored tab?`)) return;
    await base44.entities.JudgeProfile.delete(profile.id);
    refresh();
    onDeleted?.();
    toast({ title: "Tailored tab deleted" });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2 min-w-0">
            <Gavel className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 font-heading text-sm">Tailored to {profile.judgeName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {items.length} contention{items.length === 1 ? "" : "s"} reworked for this judge — the arguments are the same, the framing is theirs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={regenerate} disabled={working} className="gap-1.5 text-xs">
              {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {working ? "Re-tailoring…" : "Re-tailor"}
            </Button>
            <Button variant="outline" size="sm" onClick={removeTab} className="gap-1.5 text-xs text-red-500 border-red-200 hover:border-red-300">
              <Trash2 className="w-3.5 h-3.5" /> Delete tab
            </Button>
          </div>
        </div>

        {profile.judgeSummary && (
          <p className="text-xs text-violet-900 bg-violet-50 border border-violet-100 rounded-xl p-3 mt-3 leading-relaxed">
            {profile.judgeSummary}
          </p>
        )}
        {profile.background && (
          <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap line-clamp-4">
            <span className="font-semibold text-slate-400">Your notes: </span>{profile.background}
          </p>
        )}
        {(profile.links || []).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {(profile.links || []).map((l, i) => l.url && (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded-full hover:underline">
                <Link2 className="w-3 h-3" /> {l.label || l.url}
              </a>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <Gavel className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Nothing tailored yet — hit Re-tailor to rebuild from your contentions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <JudgeContentionCard
              key={item.id}
              item={item}
              onSave={saveItem}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}