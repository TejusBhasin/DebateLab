import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Columns2, ExternalLink } from "lucide-react";

const SPLITS = [
  { id: "quarter", label: "1/4", width: "25%" },
  { id: "half", label: "1/2", width: "50%" },
  { id: "threeQuarter", label: "3/4", width: "75%" },
];

function ContentionPane({ c, compact }) {
  if (!c) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-white/30 text-sm">
        No more contentions on this side
      </div>
    );
  }

  return (
    <div className={`w-full ${compact ? "px-6 py-6" : "max-w-4xl mx-auto px-8 py-8"}`}>
      <div className="text-xs text-blue-300 font-medium mb-2 uppercase tracking-wider">
        {c.side} · {c.format?.replace(/_/g, " ")}
      </div>
      <h1 className={`${compact ? "text-2xl" : "text-3xl"} font-bold font-heading mb-6 leading-tight`}>{c.title}</h1>
      <div className={compact ? "space-y-5" : "space-y-6"}>
        {[["Claim", c.claim], ["Warrant", c.warrant], ["Impact", c.impact]].map(([label, val]) => val && (
          <div key={label}>
            <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">{label}</div>
            <p className={`${compact ? "text-sm" : "text-lg"} leading-relaxed text-white/90`}>{val}</p>
          </div>
        ))}
        {c.evidence?.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Evidence</div>
            {c.evidence.map((ev, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 mb-2">
                <p className="text-white/80 text-sm leading-relaxed">{ev.text}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-white/40 text-xs">— {ev.source}</p>
                  {ev.sourceUrl && (
                    <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-300 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {c.strategicNotes && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Strategic Notes</div>
            <p className="text-white/70 text-sm leading-relaxed">{c.strategicNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectSpeakingMode({ project, contentions = [], onClose }) {
  const [idx, setIdx] = useState(0);
  const [split, setSplit] = useState(false);
  const [splitId, setSplitId] = useState("half");

  const leftWidth = SPLITS.find(s => s.id === splitId)?.width || "50%";
  const current = contentions[idx];
  const upcoming = contentions[idx + 1];

  return (
    <div className="fixed inset-0 bg-slate-900 text-white z-50 flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 sm:px-8 py-3 border-b border-white/10">
        <span className="text-white/60 text-xs sm:text-sm truncate">
          {idx + 1} / {contentions.length} — {project.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSplit(!split)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${split ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20"}`}
          >
            <Columns2 className="w-4 h-4" /> Split
          </button>
          {split && (
            <div className="flex items-center bg-white/10 rounded-lg p-1 gap-1">
              {SPLITS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSplitId(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${splitId === s.id ? "bg-white text-slate-900" : "text-white/70 hover:text-white"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {split ? (
        <div
          className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-y-auto md:overflow-hidden"
          style={{ "--split-width": leftWidth }}
        >
          <div className="md:w-[var(--split-width)] w-full md:shrink-0 md:overflow-y-auto">
            <ContentionPane c={current} compact />
          </div>
          <div className="flex-1 min-w-0 md:overflow-y-auto">
            <ContentionPane c={upcoming} compact />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ContentionPane c={current} />
        </div>
      )}

      <div className="flex items-center justify-center gap-4 sm:gap-6 px-4 py-4 border-t border-white/10">
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all font-medium text-sm">
          <ChevronLeft className="w-5 h-5" /> Previous
        </button>
        <span className="text-white/40 text-sm whitespace-nowrap">{idx + 1} of {contentions.length}</span>
        <button onClick={() => setIdx(i => Math.min(contentions.length - 1, i + 1))} disabled={idx === contentions.length - 1}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all font-medium text-sm">
          Next <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}