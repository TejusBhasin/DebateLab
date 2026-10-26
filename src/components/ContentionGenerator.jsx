import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Save, BookOpen, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import ContentionCard from "./ContentionCard";
import SaveToProjectDialog from "./SaveToProjectDialog";
import ContextInput from "./ContextInput";
import ConferenceContextPicker, { buildConferenceContextText } from "./ConferenceContextPicker";

const BATCH_SIZE = 8;

const SCHEMA = {
  type: "object",
  properties: {
    contentions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          claim: { type: "string" },
          warrant: { type: "string" },
          impact: { type: "string" },
          evidence: { type: "array", items: { type: "object", properties: { text: { type: "string" }, source: { type: "string" }, sourceUrl: { type: "string" } }, required: ["text", "source", "sourceUrl"] } },
          possibleRebuttals: { type: "array", items: { type: "string" } },
          rebuttalResponses: { type: "array", items: { type: "string" } },
          crossfireQuestions: { type: "array", items: { type: "string" } },
          crossfireAnswers: { type: "array", items: { type: "string" } },
          strategicNotes: { type: "string" }
        },
        required: ["title", "claim", "warrant", "impact", "evidence", "possibleRebuttals", "rebuttalResponses", "crossfireQuestions", "crossfireAnswers", "strategicNotes"]
      }
    }
  },
  required: ["contentions"]
};

async function generateBatch(count, form, format, aiMode, conferenceText) {
  const fmtLabel = format === "parliamentary" ? "Parliamentary" : "Public Forum";
  const motionLabel = format === "parliamentary" ? "Motion" : "Resolution";
  
  let promptText = `Generate ${count} complete tournament-ready contentions for ${fmtLabel} debate.

${motionLabel}: "${form.resolution}"
Side: ${form.side}
Difficulty: ${form.difficulty}
Evidence preference: ${form.evidencePreference}
${form.context ? `\nAdditional context from the debater (prioritize this): ${form.context}\n` : ""}
${conferenceText ? `\n${conferenceText}\nAdhere to the conference rules/context above.\n` : ""}
Create comprehensive, tournament-quality contentions with real academic evidence, statistics, and expert citations. Make each contention distinct and strategically strong.
- ORIGINALITY IS CRITICAL: Every contention must be COMPLETELY ORIGINAL and unique. Do NOT reuse any phrases, argument structures, framing, or rhetorical patterns across contentions or from previous outputs. Each contention should feel like it was written from scratch by a human, never formulaic, generic, or templated. Vary your word choice, sentence structure, and strategic approach for each one.
- STAY ON TOPIC: Every contention must directly address the specific ${motionLabel} and side provided. Do NOT drift into generic debate arguments, tangential points, or broad claims that aren't grounded in the specific resolution. If an argument could apply to any debate on any topic, rewrite it to be specific to THIS resolution. Use real evidence and specific reasoning tied to the actual topic — don't fall back on generic-sounding claims.

Return a JSON object with a "contentions" array. Each must include: title, claim, warrant, impact, evidence (array of {text, source, sourceUrl}), possibleRebuttals, rebuttalResponses, crossfireQuestions, crossfireAnswers, strategicNotes.`;

  if (aiMode === "dampened") {
    promptText += `\n\nCRITICAL: The user has Dampened AI enabled. 
- You MUST NOT write out the fully flushed contentions.
- Instead, provide structural outlines. Provide bullet points for claim/warrant/impact.
- Focus purely on evidence and high-level strategy.
- Do NOT provide a full speech script that they can copy-paste.`;
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: promptText,
    response_json_schema: SCHEMA,
  });
  return result.contentions || [];
}

export default function ContentionGenerator({ format = "parliamentary" }) {
  const [activeTab, setActiveTab] = useState("generate");
  const [form, setForm] = useState({ resolution: "", side: "", count: "2", difficulty: "intermediate", evidencePreference: "academic", context: "" });
  const [conferenceProfile, setConferenceProfile] = useState(null);
  const [generatedContentions, setGeneratedContentions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saveDialog, setSaveDialog] = useState(null); // null | "single" | "all"
  const [singleContention, setSingleContention] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedContentions = [] } = useQuery({
    queryKey: ['contentions', format],
    queryFn: () => base44.entities.Contention.filter({ format }),
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const byOwner = await base44.entities.UserProfile.filter({ ownerUserId: user.id });
      if (byOwner.length > 0) return byOwner[0];
      const res = await base44.entities.UserProfile.filter({ created_by_id: user.id });
      return res[0] || null;
    },
    enabled: !!user
  });

  const buildContention = (c, projectId) => ({
    ownerUserId: user?.id,
    title: c.title, format, resolution: form.resolution || c.resolution, side: form.side || c.side,
    claim: c.claim, warrant: c.warrant, impact: c.impact, evidence: c.evidence,
    possibleRebuttals: c.possibleRebuttals, rebuttalResponses: c.rebuttalResponses,
    crossfireQuestions: c.crossfireQuestions, crossfireAnswers: c.crossfireAnswers,
    strategicNotes: c.strategicNotes, difficulty: form.difficulty,
    ...(projectId ? { projectId } : {}),
  });

  const saveContention = useMutation({
    mutationFn: ({ c, projectId }) => base44.entities.Contention.create(buildContention(c, projectId)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contentions'] }); }
  });

  const handleSingleSave = (c) => { setSingleContention(c); setSaveDialog("single"); };
  const handleSaveAll = () => setSaveDialog("all");

  const doSave = async (projectId, projectName) => {
    const toSave = saveDialog === "all" ? generatedContentions : [singleContention];
    await Promise.all(toSave.map(c => base44.entities.Contention.create(buildContention(c, projectId))));
    queryClient.invalidateQueries({ queryKey: ['contentions'] });
    queryClient.invalidateQueries({ queryKey: ['project_contentions', projectId] });
    toast({ title: `${toSave.length} contention${toSave.length !== 1 ? 's' : ''} saved to "${projectName}"` });
    setSaveDialog(null);
    setSingleContention(null);
  };

  const deleteContention = useMutation({
    mutationFn: (id) => base44.entities.Contention.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contentions'] }); toast({ title: "Contention deleted" }); }
  });

  const generate = async () => {
    if (!form.resolution || !form.side) {
      toast({ title: "Please enter the resolution and select a side", variant: "destructive" }); return;
    }
    setGenerating(true);
    setGeneratedContentions([]);
    const total = parseInt(form.count);
    const batches = [];
    for (let i = 0; i < total; i += BATCH_SIZE) batches.push(Math.min(BATCH_SIZE, total - i));
    const aiMode = profile?.defaultAiMode || "full";
    const conferenceText = buildConferenceContextText(conferenceProfile);
    const batchResults = await Promise.all(batches.map(n => generateBatch(n, form, format, aiMode, conferenceText)));
    const all = batchResults.flat().slice(0, total);
    setGeneratedContentions(all);
    setGenerating(false);
    toast({ title: `${all.length} contention${all.length !== 1 ? 's' : ''} generated!` });
  };

  const sideOptions = format === "parliamentary"
    ? [{ v: "government", l: "Government (Prop)" }, { v: "opposition", l: "Opposition (Opp)" }]
    : [{ v: "affirmative", l: "Affirmative (Pro)" }, { v: "negative", l: "Negative (Con)" }];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab("generate")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "generate" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Generate
        </button>
        <button onClick={() => setActiveTab("saved")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "saved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Saved ({savedContentions.length})
        </button>
      </div>

      {activeTab === "saved" && (
        <div className="space-y-4">
          {savedContentions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No saved contentions yet. Generate and save some!</p>
            </div>
          ) : savedContentions.map((c) => (
            <ContentionCard key={c.id} contention={c} onSave={() => {}} saving={false} onDelete={() => deleteContention.mutate(c.id)} />
          ))}
        </div>
      )}

      {activeTab === "generate" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-heading">Contention Generator</h3>
                <p className="text-xs text-slate-500">AI-powered tournament-ready arguments</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {format === "parliamentary" ? "Motion" : "Resolution"}
                </label>
                <Textarea
                  value={form.resolution}
                  onChange={e => setForm({ ...form, resolution: e.target.value })}
                  placeholder={format === "parliamentary"
                    ? "e.g., This House Would ban social media for users under 16"
                    : "e.g., Resolved: The United States federal government should substantially reduce its military presence in East Asia"}
                  className="resize-none text-sm"
                  rows={2}
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-slate-600 flex gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Difficulty:</strong> Beginner = simple logic; Intermediate = stats & strategy; Advanced = complex multi-layered; Expert = highly technical/philosophical. <strong className="ml-1">Evidence:</strong> Academic = peer-reviewed; News = current events; Government = official reports; Mixed = variety.
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Side</label>
                  <Select value={form.side} onValueChange={v => setForm({ ...form, side: v })}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{sideOptions.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Count</label>
                  <Select value={form.count} onValueChange={v => setForm({ ...form, count: v })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 40}, (_, i) => String(i + 1)).map(n => (
                        <SelectItem key={n} value={n}>{n} contention{n !== "1" ? "s" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Difficulty</label>
                  <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["beginner", "intermediate", "advanced", "expert"].map(d => (
                        <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Evidence</label>
                  <Select value={form.evidencePreference} onValueChange={v => setForm({ ...form, evidencePreference: v })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[["academic", "Academic"], ["news", "News Sources"], ["government", "Government"], ["mixed", "Mixed"]].map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ContextInput
                value={form.context}
                onChange={v => setForm({ ...form, context: v })}
                placeholder="e.g., Focus on economic impacts, avoid climate arguments, my opponent runs a framework case..."
              />

              <ConferenceContextPicker
                value={conferenceProfile?.id || ""}
                onChange={(_, p) => setConferenceProfile(p)}
              />

              <Button onClick={generate} disabled={generating} className="w-full h-11 gap-2 text-sm font-semibold">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? `Generating ${form.count} contentions...` : "Generate Contentions"}
              </Button>
            </div>
          </div>

          {generatedContentions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 font-heading flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Generated Contentions ({generatedContentions.length})
                </h3>
                <Button variant="outline" size="sm" onClick={handleSaveAll} className="gap-1.5 text-xs">
                  <Save className="w-3.5 h-3.5" /> Save All to Project
                </Button>
              </div>
              {generatedContentions.map((c, i) => (
                <ContentionCard key={i} contention={c} onSave={() => handleSingleSave(c)} saving={false} defaultExpanded />
              ))}
            </div>
          )}
          <SaveToProjectDialog
            open={!!saveDialog}
            onClose={() => { setSaveDialog(null); setSingleContention(null); }}
            onSave={doSave}
            count={saveDialog === "all" ? generatedContentions.length : 1}
          />
        </>
      )}
    </div>
  );
}