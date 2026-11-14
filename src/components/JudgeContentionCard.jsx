import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil, Trash2, ExternalLink, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const FIELDS = [
  { key: "title", label: "Title", rows: 0 },
  { key: "claim", label: "Claim", rows: 2 },
  { key: "warrant", label: "Warrant", rows: 3 },
  { key: "impact", label: "Impact", rows: 2 },
  { key: "strategicNotes", label: "Strategic notes for this room", rows: 2 },
];

export default function JudgeContentionCard({ item, onSave, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(item);

  const openEdit = () => {
    setDraft(item);
    setEditOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {item.side && <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">{item.side}</span>}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Judge-tailored</span>
          </div>
          <h4 className="font-bold text-slate-900 font-heading text-sm truncate">{item.title}</h4>
          {item.claim && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.claim}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(); }} className="h-8 w-8 p-0" title="Edit">
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-8 w-8 p-0 text-red-500" title="Delete">
            <Trash2 className="w-3 h-3" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {item.judgeFit && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
              <div className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Target className="w-3 h-3" /> Why this lands with this judge
              </div>
              <p className="text-sm text-violet-900 leading-relaxed">{item.judgeFit}</p>
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-2">
            {[["Claim", item.claim, "bg-blue-50 text-blue-900"], ["Warrant", item.warrant, "bg-slate-50 text-slate-700"], ["Impact", item.impact, "bg-green-50 text-green-900"]].map(([label, value, cls]) => (
              value ? (
                <div key={label} className={`${cls} rounded-xl p-3`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">{label}</div>
                  <p className="text-xs leading-relaxed">{value}</p>
                </div>
              ) : null
            ))}
          </div>

          {item.evidence?.length > 0 && (
            <div className="space-y-2">
              {item.evidence.map((ev, i) => (
                <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-xs text-slate-700 italic leading-relaxed">"{ev.text}"</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {ev.source && <span className="text-[11px] text-slate-500">— {ev.source}</span>}
                    {ev.sourceUrl && (
                      <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" /> Source
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(item.possibleRebuttals?.length > 0 || item.rebuttalResponses?.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-2">
              {item.possibleRebuttals?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">They'll say</div>
                  <ul className="space-y-1">{item.possibleRebuttals.map((r, i) => <li key={i} className="text-xs text-red-800">• {r}</li>)}</ul>
                </div>
              )}
              {item.rebuttalResponses?.length > 0 && (
                <div className="bg-teal-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1">You answer</div>
                  <ul className="space-y-1">{item.rebuttalResponses.map((r, i) => <li key={i} className="text-xs text-teal-800">• {r}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {item.strategicNotes && (
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-1">⚡ In this room</div>
              <p className="text-xs text-yellow-900 leading-relaxed">{item.strategicNotes}</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Edit tailored contention</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                {f.rows === 0 ? (
                  <Input value={draft[f.key] || ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="mt-1 text-sm" />
                ) : (
                  <Textarea value={draft[f.key] || ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} rows={f.rows} className="mt-1 text-sm" />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => { onSave(draft); setEditOpen(false); }}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}