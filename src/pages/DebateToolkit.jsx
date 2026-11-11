import { useState } from "react";
import TechniquesLibrary from "@/components/TechniquesLibrary";
import CounterCaseBuilder from "@/components/CounterCaseBuilder";

export default function DebateToolkit() {
  const [tab, setTab] = useState("techniques");
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold font-heading text-slate-900 mb-1">Debate Toolkit</h1>
      <p className="text-sm text-slate-500 mb-4">Techniques to win rounds, and a counter-case builder to beat any guide or case.</p>
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        {[["techniques", "Techniques"], ["counter", "Counter-Case Builder"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === id ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>
      {tab === "techniques" ? <TechniquesLibrary /> : <CounterCaseBuilder />}
    </div>
  );
}