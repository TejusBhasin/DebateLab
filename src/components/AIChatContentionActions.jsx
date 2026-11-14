import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { Check, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";

const TYPE_META = {
  create: { label: "Add", icon: Plus, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  update: { label: "Edit", icon: Pencil, cls: "bg-amber-100 text-amber-700 border-amber-200" },
  delete: { label: "Delete", icon: Trash2, cls: "bg-red-100 text-red-700 border-red-200" },
};

const EDITABLE = ["title", "side", "claim", "warrant", "impact", "strategicNotes"];

const formatFor = (project) =>
  ["model_congress", "public_forum", "model_un"].includes(project?.format) ? "public_forum" : "parliamentary";

export default function AIChatContentionActions({ message, actions, project, contentions = [], onApplied }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(message.actionStatus || "pending");
  const [working, setWorking] = useState(false);

  const known = new Map(contentions.map((c) => [c.id, c]));
  const runnable = actions.filter((a) => a.type === "create" || known.has(a.contentionId));
  const skipped = actions.length - runnable.length;

  const markMessage = (actionStatus) =>
    base44.entities.AIChatMessage.update(message.id, { actionStatus });

  const apply = async () => {
    const deletes = runnable.filter((a) => a.type === "delete");
    if (deletes.length > 0 && !confirm(`Delete ${deletes.length} contention${deletes.length === 1 ? "" : "s"}?`)) return;

    setWorking(true);
    try {
      for (const a of runnable) {
        const target = known.get(a.contentionId);
        if (a.type === "create") {
          await base44.entities.Contention.create({
            ownerUserId: user?.id,
            title: a.title || "Untitled contention",
            format: formatFor(project),
            resolution: project?.resolution || "",
            side: a.side || project?.side || "",
            claim: a.claim || "",
            warrant: a.warrant || "",
            impact: a.impact || "",
            projectId: project?.id,
          });
        } else if (a.type === "update" && target) {
          const changes = {};
          EDITABLE.forEach((k) => {
            const v = a.changes?.[k] ?? a[k];
            if (typeof v === "string" && v.trim() && v !== target[k]) changes[k] = v;
          });
          if (Object.keys(changes).length > 0) await base44.entities.Contention.update(target.id, changes);
        } else if (a.type === "delete" && target) {
          await base44.entities.Contention.delete(target.id);
        }
      }
      await markMessage("applied");
      setStatus("applied");
      queryClient.invalidateQueries({ queryKey: ["project_contentions", project?.id] });
      onApplied?.();
      toast({ title: `Contentions updated — ${runnable.length} change${runnable.length === 1 ? "" : "s"} applied` });
    } finally {
      setWorking(false);
    }
  };

  const dismiss = async () => {
    setStatus("dismissed");
    await markMessage("dismissed");
  };

  if (status === "dismissed") return null;
  if (status === "applied") {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
        <Check className="w-3.5 h-3.5" /> Applied to the Contentions tab
      </div>
    );
  }
  if (actions.length === 0) return null;

  return (
    <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
        <Sparkles className="w-3.5 h-3.5" /> Proposed contention changes
      </div>
      <div className="space-y-1.5">
        {actions.map((a, i) => {
          const meta = TYPE_META[a.type] || TYPE_META.update;
          const Icon = meta.icon;
          const target = known.get(a.contentionId);
          const title = a.type === "create" ? a.title : target?.title || a.title;
          const detail = a.type === "update"
            ? Object.keys(a.changes || {}).join(", ") || a.reason
            : a.reason;
          return (
            <div key={i} className="flex items-start gap-2 bg-white rounded-lg border border-violet-100 p-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${meta.cls}`}>
                <Icon className="w-2.5 h-2.5" /> {meta.label}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 break-words">{title || "(missing contention)"}</p>
                {detail && <p className="text-[11px] text-slate-500 mt-0.5">{detail}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {skipped > 0 && (
        <p className="text-[11px] text-amber-700 mt-1.5">
          {skipped} change{skipped === 1 ? "" : "s"} skipped — that contention is no longer in this project.
        </p>
      )}
      <div className="flex items-center gap-2 mt-2.5">
        <Button size="sm" onClick={apply} disabled={working || runnable.length === 0} className="h-8 gap-1.5 text-xs">
          {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Apply {runnable.length} change{runnable.length === 1 ? "" : "s"}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss} disabled={working} className="h-8 gap-1.5 text-xs text-slate-500">
          <X className="w-3.5 h-3.5" /> Dismiss
        </Button>
      </div>
    </div>
  );
}