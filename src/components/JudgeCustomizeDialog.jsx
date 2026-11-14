import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Gavel, Loader2, Plus, Trash2 } from "lucide-react";
import { tailorContentions } from "@/lib/judgeTailoring";

const EMPTY = { judgeName: "", background: "", focus: "", links: [] };

export default function JudgeCustomizeDialog({ open, onOpenChange, project, contentions = [], onCreated }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [working, setWorking] = useState(false);

  useEffect(() => { if (open) setForm(EMPTY); }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setLink = (i, key, value) =>
    setForm((f) => ({ ...f, links: f.links.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)) }));
  const addLink = () => setForm((f) => ({ ...f, links: [...f.links, { url: "", label: "" }] }));
  const removeLink = (i) => setForm((f) => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }));

  const ready = form.judgeName.trim() && contentions.length > 0 &&
    (form.background.trim() || form.links.some((l) => l.url.trim()));

  const generate = async () => {
    if (!ready || working) return;
    setWorking(true);
    try {
      const judge = { ...form, judgeName: form.judgeName.trim(), links: form.links.filter((l) => l.url.trim()) };
      const result = await tailorContentions(project, contentions, judge);
      const profile = await base44.entities.JudgeProfile.create({
        ownerUserId: user?.id,
        projectId: project.id,
        judgeName: judge.judgeName,
        background: judge.background,
        focus: judge.focus,
        links: judge.links,
        judgeSummary: result.judgeSummary,
        tailoredContentions: result.tailoredContentions,
        status: "ready",
      });
      queryClient.invalidateQueries({ queryKey: ["judge_profiles", project.id] });
      onCreated?.(profile);
      onOpenChange(false);
      toast({ title: `Tailored case created for ${judge.judgeName}` });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Gavel className="w-4 h-4 text-primary" /> Customize to Judge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Judge name</Label>
            <Input value={form.judgeName} onChange={set("judgeName")} placeholder="Judge Alvarez" className="mt-1 text-sm" />
            <p className="text-[11px] text-slate-400 mt-1">Becomes the tab name: "Tailored to {form.judgeName.trim() || "…"}".</p>
          </div>

          <div>
            <Label className="text-xs">What you know about them</Label>
            <Textarea
              value={form.background}
              onChange={set("background")}
              rows={4}
              placeholder="Paradigm, school, how they vote, past rounds, what they reward (flow judge? lay judge? MUN chair?), pet peeves…"
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Links about the judge</Label>
              <button onClick={addLink} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Add link
              </button>
            </div>
            {form.links.length === 0 && <p className="text-[11px] text-slate-400 mt-1">Optional — a wiki page, paradigm sheet, or article about them.</p>}
            <div className="space-y-2 mt-1">
              {form.links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={l.url} onChange={(e) => setLink(i, "url", e.target.value)} placeholder="https://..." className="text-sm" />
                  <Input value={l.label} onChange={(e) => setLink(i, "label", e.target.value)} placeholder="Label" className="text-sm w-28 shrink-0" />
                  <button onClick={() => removeLink(i)} className="p-2 text-slate-400 hover:text-red-500 shrink-0" title="Remove link">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Extra tailoring instructions</Label>
            <Input value={form.focus} onChange={set("focus")} placeholder="Keep it short, lead with impacts, avoid jargon…" className="mt-1 text-sm" />
          </div>

          {contentions.length === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Generate some contentions first — tailoring works from the contentions you already have.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>Cancel</Button>
          <Button onClick={generate} disabled={!ready || working} className="gap-1.5">
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
            {working ? `Tailoring ${contentions.length} contentions…` : "Tailor my contentions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}