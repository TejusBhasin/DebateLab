import { useState, useEffect } from "react";
import { ScrollText, Clock, ChevronRight, X, Maximize2, RefreshCw, CheckSquare, Square, FileText, Gavel, Star } from "lucide-react";

/**
 * A scrollable "flow" view structured for a timed speech:
 * Introduction → Contentions (with timing) → Rebuttals → Conclusion.
 * Props: project, contentions, rebuttals, otherDocs, onRefresh
 */
export default function ProjectFlowTab({ project, contentions, rebuttals, otherDocs = [], onRefresh }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [speechMinutes, setSpeechMinutes] = useState(10);
  const [selectedContIds, setSelectedContIds] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [showSelector, setShowSelector] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // How much a contention is worth speaking about: developed impacts and evidence
  // (what a judge can vote on) outweigh a bare claim.
  const scoreContention = (c) => {
    let s = 0;
    if ((c.impact || "").length > 40) s += 3;
    if ((c.warrant || "").length > 80) s += 1;
    if ((c.evidence || []).some(e => e.text)) s += 2;
    if (Object.values(c.weighingMechanisms || {}).some(v => v && String(v).trim())) s += 2;
    if ((c.rebuttalResponses || []).length > 0) s += 2;
    if ((c.crossfireQuestions || []).length > 0) s += 1;
    if (c.difficulty === "advanced" || c.difficulty === "expert") s += 1;
    return s;
  };
  const ranked = [...contentions].sort((a, b) => scoreContention(b) - scoreContention(a));
  const keyCount = Math.max(1, Math.min(ranked.length || 1, Math.round(speechMinutes / 2.5)));
  const keyIds = new Set(ranked.slice(0, keyCount).map(c => c.id));
  const autoPickKey = () => setSelectedContIds(new Set(keyIds));

  const isCongress = project?.format === "model_congress";
  const isParli = project?.format === "parliamentary";
  const isMUN = project?.format === "model_un";

  const labels = {
    intro: isCongress ? "Authorship / Sponsorship Intro" : (isMUN ? "Opening Remarks" : "Introduction"),
    contentionWord: isCongress ? "Argument" : (isMUN ? "Point" : "Contention"),
    rebuttal: isCongress ? "Refutation" : (isMUN ? "Rebuttal" : "Rebuttals"),
    conclusion: isCongress ? "Voting Issues & Conclusion" : "Conclusion",
  };

  // Default: all contentions selected (min 1). Re-sync when list changes.
  useEffect(() => {
    if (!contentions || contentions.length === 0) return;
    setSelectedContIds(prev => {
      if (!prev || prev.size === 0) return new Set(ranked.slice(0, keyCount).map(c => c.id));
      const next = new Set();
      contentions.forEach(c => { if (prev.has(c.id)) next.add(c.id); });
      if (next.size === 0) return new Set(contentions.map(c => c.id)); // min 1
      return next;
    });
  }, [contentions]);

  const selectedContentions = contentions.filter(c => selectedContIds?.has(c.id));
  const selectedDocs = otherDocs.filter(d => selectedDocIds.has(d.id));

  const toggleContention = (cid) => {
    setSelectedContIds(prev => {
      const base = prev || new Set(contentions.map(c => c.id));
      const next = new Set(base);
      if (next.has(cid)) {
        if (next.size > 1) next.delete(cid); // enforce min 1
      } else {
        next.add(cid);
      }
      return next;
    });
  };

  const toggleDoc = (did) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(did)) next.delete(did);
      else next.add(did);
      return next;
    });
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const n = Math.max(selectedContentions.length, 1);
  const r1 = (x) => Math.round(x * 10) / 10;
  const introMin = Math.max(0.1, r1(speechMinutes * 0.10));
  const concMin = Math.max(0.1, r1(speechMinutes * 0.10));
  const rebMin = Math.max(0.1, r1(speechMinutes * 0.20));
  const docMin = selectedDocs.length > 0 ? Math.max(0.2, r1(speechMinutes * 0.05)) : 0;
  const contTotal = Math.max(n * 0.1, speechMinutes - introMin - concMin - rebMin - (docMin * selectedDocs.length));
  const contMin = r1(contTotal / n);

  const sections = [
    { label: labels.intro, min: introMin, type: "intro" },
    ...selectedContentions.map((c, i) => ({ label: `${labels.contentionWord} ${i + 1}: ${c.title}`, min: contMin, c })),
    ...selectedDocs.map((d) => ({ label: `Doc: ${d.title}`, min: docMin, doc: d })),
    { label: labels.rebuttal, min: rebMin, type: "rebuttal" },
    { label: labels.conclusion, min: concMin, type: "conclusion" },
  ];
  const totalMin = sections.reduce((a, s) => a + s.min, 0);

  const SelectorPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Select Documents to Base Flow On
        </h4>
        <span className="text-xs text-slate-400">{selectedContentions.length} contention{selectedContentions.length !== 1 ? 's' : ''}{selectedDocs.length > 0 ? ` + ${selectedDocs.length} doc${selectedDocs.length !== 1 ? 's' : ''}` : ''} · min 1</span>
      </div>
      {contentions.length > 0 && (
        <button onClick={autoPickKey} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <Star className="w-3.5 h-3.5" /> Auto-pick the {keyCount} most important
        </button>
      )}
      {contentions.length === 0 && otherDocs.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No contentions or documents yet. Generate contentions or add documents first.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {ranked.map(c => (
            <button key={c.id} onClick={() => toggleContention(c.id)} className="w-full flex items-center gap-2 text-left p-2 rounded-lg hover:bg-slate-50 transition-colors">
              {selectedContIds?.has(c.id) ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className="text-sm text-slate-700 truncate">{c.title}</span>
              {keyIds.has(c.id) && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">Key</span>}
              <span className="text-xs text-slate-400 shrink-0 ml-auto">{labels.contentionWord}</span>
            </button>
          ))}
          {otherDocs.map(d => (
            <button key={d.id} onClick={() => toggleDoc(d.id)} className="w-full flex items-center gap-2 text-left p-2 rounded-lg hover:bg-slate-50 transition-colors">
              {selectedDocIds.has(d.id) ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className="text-sm text-slate-700 truncate">{d.title}</span>
              <span className="text-xs text-slate-400 shrink-0 ml-auto">{d.docLabel || 'Doc'}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">At least 1 contention is required. Toggle documents on/off to customize your flow.</p>
    </div>
  );

  const FlowBody = () => (
    <div className="space-y-6">
      {/* Overview */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white">
        <div className="text-xs uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" /> Speaking Flow · ~{totalMin} min
        </div>
        <h2 className="text-xl font-bold font-heading mb-2">{project.resolution || project.name}</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {project.side && <span className="bg-white/15 px-2 py-0.5 rounded-full">{project.side}</span>}
          {project.format && <span className="bg-white/15 px-2 py-0.5 rounded-full capitalize">{project.format.replace(/_/g, ' ')}</span>}
          <span className="bg-white/15 px-2 py-0.5 rounded-full">{selectedContentions.length} {labels.contentionWord.toLowerCase()}{selectedContentions.length !== 1 ? 's' : ''}</span>
          {rebuttals.length > 0 && <span className="bg-white/15 px-2 py-0.5 rounded-full">{rebuttals.length} rebuttal sets</span>}
        </div>
      </div>

      {sections.map((s, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <h3 className="font-bold text-slate-900 font-heading text-sm">{s.label}</h3>
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="w-3 h-3" /> ~{s.min} min</span>
          </div>
          {s.c ? (
            <div className="space-y-2 text-sm">
              {s.c.claim && <p className="text-slate-700"><span className="font-semibold text-slate-400 text-xs uppercase">Claim:</span> {s.c.claim}</p>}
              {s.c.warrant && <p className="text-slate-600"><span className="font-semibold text-slate-400 text-xs uppercase">Warrant:</span> {s.c.warrant}</p>}
              {s.c.impact && <p className="text-slate-600"><span className="font-semibold text-slate-400 text-xs uppercase">Impact:</span> {s.c.impact}</p>}
              {s.c.evidence?.length > 0 && (
                <ul className="text-xs text-slate-500 space-y-1 mt-1">
                  {s.c.evidence.map((ev, j) => <li key={j} className="flex gap-1.5"><ChevronRight className="w-3 h-3 shrink-0 mt-0.5" />{ev.text}</li>)}
                </ul>
              )}
            </div>
          ) : s.doc ? (
            <div className="text-sm text-slate-600">
              {s.doc.content ? (
                <p className="line-clamp-6 whitespace-pre-wrap">{s.doc.content}</p>
              ) : (
                <p className="text-xs text-slate-400 italic">No content in this document.</p>
              )}
              {s.doc.takeaways && <p className="text-xs text-slate-500 mt-2"><span className="font-semibold">Takeaways:</span> {s.doc.takeaways}</p>}
            </div>
          ) : s.type === "rebuttal" ? (
            rebuttals.length > 0 ? (
              <div className="space-y-3">
                {rebuttals.map((r, ri) => (
                  <div key={ri} className="border-l-2 border-teal-300 pl-3">
                    <p className="text-xs text-slate-500 italic mb-1">vs. "{r.input?.slice(0, 120)}{r.input?.length > 120 ? '…' : ''}"</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">{typeof r.output === 'string' ? r.output : ''}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 italic">No rebuttals prepared yet — generate some in the Rebuttal Hub.</p>
          ) : s.type === "intro" ? (
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
              <li>Hook the audience and state the resolution{isCongress ? '/bill' : ''}.</li>
              <li>Define key terms and frame the debate.</li>
              <li>Preview your {selectedContentions.length} {labels.contentionWord.toLowerCase()}s.</li>
              {isCongress && <li className="text-slate-500">Acknowledge co-sponsors and establish authorship/sponsorship of the bill.</li>}
              {isMUN && <li className="text-slate-500">Address fellow delegates and reference the resolution's operative clauses.</li>}
            </ul>
          ) : (
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
              <li>Crystalize the key voting issues.</li>
              <li>Weigh your impacts against the opponent's.</li>
              <li>End with a strong call to vote {project.side || 'your side'}.</li>
              {isCongress && <li className="text-slate-500">Urge an aye/nay vote and summarize the bill's merits.</li>}
              {isParli && <li className="text-slate-500">Offer Points of Information (POI) opportunities during opponent speeches.</li>}
            </ul>
          )}
        </div>
      ))}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
          <span className="font-bold text-slate-900 font-heading text-sm flex items-center gap-2"><ScrollText className="w-4 h-4 text-primary" /> Speaking Flow · {project.name}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSelector(!showSelector)} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100">
              <FileText className="w-3.5 h-3.5" /> Select Docs
            </button>
            <button onClick={() => setFullscreen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        {showSelector && <div className="px-6 py-3 border-b border-slate-200 bg-white"><SelectorPanel /></div>}
        <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
          <FlowBody />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-slate-900 font-heading text-sm">Speaking Flow</h3>
          {isCongress && <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"><Gavel className="w-3 h-3" /> Congress Mode</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSelector(!showSelector)} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <FileText className="w-3.5 h-3.5" /> Select Docs
          </button>
          <button onClick={autoPickKey} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
            <Star className="w-3.5 h-3.5" /> Key {keyCount}
          </button>
          <button onClick={handleRefresh} disabled={!onRefresh || refreshing} title="Refresh contentions and data" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Length:</span>
            <input type="number" min={0.5} max={30} step={0.5} value={speechMinutes} onChange={e => setSpeechMinutes(Math.min(30, Math.max(0.5, +e.target.value || 0.5)))} className="w-14 border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-black bg-white" />
          </div>
          <button onClick={() => setFullscreen(true)} className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
            <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">A structured ~{totalMin}-minute flow: {labels.intro.toLowerCase()}, your {labels.contentionWord.toLowerCase()}s, prepared {labels.rebuttal.toLowerCase().toLowerCase()}, and {labels.conclusion.toLowerCase()}. Times scale to your chosen length.</p>
      {showSelector && <SelectorPanel />}
      <FlowBody />
    </div>
  );
}