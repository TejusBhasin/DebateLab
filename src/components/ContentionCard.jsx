import { useState } from "react";
import { ChevronDown, ChevronUp, Save, ExternalLink, Star, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic, shareContent } from "@/lib/native";
import { useToast } from "@/components/ui/use-toast";

const Section = ({ label, children, color = "bg-slate-50" }) => (
  <div className={`${color} rounded-xl p-4`}>
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</div>
    {children}
  </div>
);

export default function ContentionCard({ contention: c, onSave, saving, defaultExpanded = false, onDelete }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { toast } = useToast();

  const handleShare = async (e) => {
    e.stopPropagation();
    haptic(10);
    const text = `${c.title}\n\nClaim: ${c.claim}\nWarrant: ${c.warrant}\nImpact: ${c.impact}`;
    const res = await shareContent({ title: c.title, text });
    if (res === "copied") toast({ title: "Contention copied to clipboard" });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">Contention</span>
          </div>
          <h4 className="font-bold text-slate-900 font-heading text-base truncate">{c.title}</h4>
          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{c.claim}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 text-xs h-8">
            <Share2 className="w-3 h-3" /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onSave(); }} disabled={saving} className="gap-1.5 text-xs h-8">
            <Save className="w-3 h-3" /> Save
          </Button>
          {onDelete && (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-8 w-8 p-0" aria-label="Delete contention">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
          {/* Core argument */}
          <div className="grid sm:grid-cols-3 gap-3">
            <Section label="Claim" color="bg-blue-50">
              <p className="text-sm text-blue-900 font-medium leading-relaxed">{c.claim}</p>
            </Section>
            <Section label="Warrant" color="bg-slate-50">
              <p className="text-sm text-slate-700 leading-relaxed">{c.warrant}</p>
            </Section>
            <Section label="Impact" color="bg-green-50">
              <p className="text-sm text-green-900 leading-relaxed">{c.impact}</p>
            </Section>
          </div>

          {/* Evidence */}
          {c.evidence?.length > 0 && (
            <Section label="Evidence & Sources" color="bg-amber-50">
              <div className="space-y-3">
                {c.evidence.map((ev, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="text-sm text-slate-700 leading-relaxed italic">"{ev.text}"</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-medium text-slate-500">— {ev.source}</span>
                      {ev.sourceUrl && (
                        <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={e => e.stopPropagation()}>
                          <ExternalLink className="w-3 h-3" /> Source
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Rebuttals */}
          {c.possibleRebuttals?.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Section label="Possible Rebuttals Against You" color="bg-red-50">
                <ul className="space-y-1.5">
                  {c.possibleRebuttals.map((r, i) => (
                    <li key={i} className="text-sm text-red-800 flex gap-2">
                      <span className="shrink-0 text-red-400 font-bold">{i + 1}.</span>{r}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section label="Your Rebuttal Responses" color="bg-teal-50">
                <ul className="space-y-1.5">
                  {c.rebuttalResponses?.map((r, i) => (
                    <li key={i} className="text-sm text-teal-800 flex gap-2">
                      <span className="shrink-0 text-teal-500 font-bold">{i + 1}.</span>{r}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          )}

          {/* Crossfire */}
          {c.crossfireQuestions?.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Section label="Crossfire Questions to Ask" color="bg-purple-50">
                <ul className="space-y-1.5">
                  {c.crossfireQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-purple-800 flex gap-2">
                      <span className="shrink-0 text-purple-400 font-bold">Q{i + 1}.</span>{q}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section label="Likely Opponent Answers" color="bg-slate-50">
                <ul className="space-y-1.5">
                  {c.crossfireAnswers?.map((a, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="shrink-0 text-slate-400 font-bold">A{i + 1}.</span>{a}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          )}

          {/* Weighing */}
          {c.weighingMechanisms && (
            <Section label="Weighing Mechanisms" color="bg-indigo-50">
              <div className="grid sm:grid-cols-4 gap-3">
                {Object.entries(c.weighingMechanisms).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-lg p-3 border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-1">{k}</div>
                    <p className="text-xs text-slate-700 leading-relaxed">{v}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Strategic Notes */}
          {c.strategicNotes && (
            <Section label="⚡ Strategic Notes" color="bg-yellow-50">
              <p className="text-sm text-yellow-900 leading-relaxed">{c.strategicNotes}</p>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}