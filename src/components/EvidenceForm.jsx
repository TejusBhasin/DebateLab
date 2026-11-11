import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const EMPTY = { title: "", content: "", source: "", sourceUrl: "", tags: "", category: "" };

export default function EvidenceForm({ open, onOpenChange, onSave, initial = null }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: initial?.title || "",
      content: initial?.content || "",
      source: initial?.source || "",
      sourceUrl: initial?.sourceUrl || "",
      tags: (initial?.tags || []).join(", "),
      category: initial?.category || "",
    });
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ready = form.title.trim() && form.content.trim();

  const submit = () => {
    if (!ready) return;
    onSave({
      title: form.title.trim(),
      content: form.content.trim(),
      source: form.source.trim(),
      sourceUrl: form.sourceUrl.trim(),
      category: form.category.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit source" : "Add a source"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title / tag you'll cite</Label>
            <Input value={form.title} onChange={set("title")} placeholder="Brookings 2024 — automation and wages" className="mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Quote or finding</Label>
            <Textarea value={form.content} onChange={set("content")} rows={4} placeholder="Paste the card text you want to read in round" className="mt-1 text-sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Author / publisher</Label>
              <Input value={form.source} onChange={set("source")} placeholder="Brookings Institution" className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Link</Label>
              <Input value={form.sourceUrl} onChange={set("sourceUrl")} placeholder="https://..." className="mt-1 text-sm" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Input value={form.category} onChange={set("category")} placeholder="Economy, Rights, Solvency…" className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Tags (comma separated)</Label>
              <Input value={form.tags} onChange={set("tags")} placeholder="wages, AI, aff" className="mt-1 text-sm" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!ready}>{initial ? "Save changes" : "Add to library"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}