import { useState } from "react";
import { Search, Copy, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { TECHNIQUE_GROUPS } from "@/lib/debateTechniques";
import ApplyTechniqueDialog from "@/components/ApplyTechniqueDialog";
import AutoApplyTechniques from "@/components/AutoApplyTechniques";

export default function TechniquesLibrary({ project, onApplied }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(null);
  const { toast } = useToast();
  const term = q.trim().toLowerCase();

  const copy = (e, t) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${t.name}: ${t.def}${t.say ? `\nSay: "${t.say}"` : ""}`);
    toast({ title: `Copied "${t.name}"` });
  };

  return (
    <div className="space-y-6">
      <AutoApplyTechniques project={project} onApplied={onApplied} />
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search techniques (e.g. turn, weigh, pre-empt)..." className="pl-9 bg-white" />
      </div>
      <p className="text-xs text-slate-500 -mt-3">Click any technique to have the coach write it into {project ? "this project" : "a project"}.</p>
      {TECHNIQUE_GROUPS.map((g) => {
        const items = g.items.filter(i => !term || `${i.name} ${i.def} ${i.say}`.toLowerCase().includes(term));
        if (items.length === 0) return null;
        return (
          <div key={g.id}>
            <h3 className="font-bold text-slate-900 font-heading">{g.title}</h3>
            <p className="text-xs text-slate-500 mb-3">{g.subtitle}</p>
            <div className="grid md:grid-cols-2 gap-3">
              {items.map((t) => (
                <button key={t.name} onClick={() => setActive(t)} className={`text-left rounded-xl border p-4 ${g.color} hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-sm">{t.name}</div>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <Wand2 className="w-3.5 h-3.5 opacity-60" />
                      <span className="opacity-50 hover:opacity-100" onClick={(e) => copy(e, t)} role="button" aria-label="Copy"><Copy className="w-3.5 h-3.5" /></span>
                    </span>
                  </div>
                  <p className="text-sm mt-1 opacity-90">{t.def}</p>
                  {t.say && <p className="text-xs mt-2 italic opacity-80">Try: "{t.say}"</p>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {active && (
        <ApplyTechniqueDialog
          technique={active}
          project={project}
          open={!!active}
          onOpenChange={(v) => { if (!v) setActive(null); }}
          onApplied={onApplied}
        />
      )}
    </div>
  );
}