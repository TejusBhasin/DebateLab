import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Search, Plus, Star, Trash2, Pencil, ExternalLink, BookOpen, Copy } from "lucide-react";
import EvidenceForm from "@/components/EvidenceForm";

export default function EvidenceLibrary() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["evidence"],
    queryFn: async () => {
      const res = await base44.entities.Evidence.filter({}, { sort: "-created_date", limit: 200 });
      return res.items || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) =>
      `${e.title} ${e.content} ${e.source} ${e.category || ""} ${(e.tags || []).join(" ")}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["evidence"] });

  const save = async (data) => {
    if (editing) await base44.entities.Evidence.update(editing.id, data);
    else await base44.entities.Evidence.create(data);
    refresh();
    setFormOpen(false);
    setEditing(null);
    toast({ title: editing ? "Source updated" : "Source added to your library" });
  };

  const toggleFavorite = async (e) => {
    await base44.entities.Evidence.update(e.id, { isFavorite: !e.isFavorite });
    refresh();
  };

  const remove = async (e) => {
    await base44.entities.Evidence.delete(e.id);
    refresh();
  };

  const copyQuote = async (e) => {
    await navigator.clipboard.writeText(`"${e.content}"${e.source ? ` — ${e.source}` : ""}`);
    toast({ title: "Quote copied" });
  };

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e) => { setEditing(e); setFormOpen(true); };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Evidence Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Every card you've saved. Jot-Down suggests these while you write notes in a round.
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5 shrink-0"><Plus className="w-4 h-4" /> Add source</Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotes, authors, tags…" className="pl-9 text-sm" />
      </div>

      {isLoading ? (
        <div className="py-16 text-center"><div className="w-7 h-7 border-4 border-slate-200 border-t-primary rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">{items.length === 0 ? "Your library is empty." : "Nothing matches that search."}</p>
          {items.length === 0 && <p className="text-xs text-slate-400 mt-1">Paste the cards you actually read — they become the sources Jot-Down offers you mid-round.</p>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 text-sm leading-snug">{e.title}</h3>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => toggleFavorite(e)} className={`p-1.5 rounded-lg hover:bg-slate-100 ${e.isFavorite ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`} title="Favorite">
                    <Star className={`w-3.5 h-3.5 ${e.isFavorite ? "fill-amber-400" : ""}`} />
                  </button>
                  <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(e)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-600 italic leading-relaxed mt-2 line-clamp-5 whitespace-pre-wrap">"{e.content}"</p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {e.source && <span className="text-xs font-medium text-slate-500">— {e.source}</span>}
                {e.sourceUrl && (
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> Link
                  </a>
                )}
                <button onClick={() => copyQuote(e)} className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-primary">
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>

              {(e.category || (e.tags || []).length > 0) && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {e.category && <span className="text-[11px] bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{e.category}</span>}
                  {(e.tags || []).map((t) => <span key={t} className="text-[11px] bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <EvidenceForm open={formOpen} onOpenChange={setFormOpen} onSave={save} initial={editing} />
    </div>
  );
}