import { useState } from "react";
import { Search, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { TECHNIQUE_GROUPS } from "@/lib/debateTechniques";

export default function TechniquesLibrary() {
  const [q, setQ] = useState("");
  const { toast } = useToast();
  const term = q.trim().toLowerCase();

  const copy = (t) => {
    navigator.clipboard.writeText(`${t.name}: ${t.def}${t.say ? `\nSay: "${t.say}"` : ""}`);
    toast({ title: `Copied "${t.name}"` });
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search techniques (e.g. turn, weigh, pre-empt)..." className="pl-9 bg-white" />
      </div>
      {TECHNIQUE_GROUPS.map((g) => {
        const items = g.items.filter(i => !term || `${i.name} ${i.def} ${i.say}`.toLowerCase().includes(term));
        if (items.length === 0) return null;
        return (
          <div key={g.id}>
            <h3 className="font-bold text-slate-900 font-heading">{g.title}</h3>
            <p className="text-xs text-slate-500 mb-3">{g.subtitle}</p>
            <div className="grid md:grid-cols-2 gap-3">
              {items.map((t) => (
                <div key={t.name} className={`rounded-xl border p-4 ${g.color}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-sm">{t.name}</div>
                    <button onClick={() => copy(t)} className="opacity-50 hover:opacity-100" aria-label="Copy"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-sm mt-1 opacity-90">{t.def}</p>
                  {t.say && <p className="text-xs mt-2 italic opacity-80">Try: "{t.say}"</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}