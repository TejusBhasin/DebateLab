import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Save, Trash2, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import ContextInput from "./ContextInput";
import ConferenceContextPicker, { buildConferenceContextText } from "./ConferenceContextPicker";
import ContentionCard from "./ContentionCard";

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

export async function generateBatch(count, form, format, aiMode, conferenceText, projectFormat) {
  const isCongress = projectFormat === "model_congress";
  const isMUN = projectFormat === "model_un";
  const fmtLabel = isCongress ? "Model Congress" : (isMUN ? "Model UN" : (format === "parliamentary" ? "Parliamentary" : "Public Forum"));
  const motionLabel = isCongress ? "Bill/Resolution" : (isMUN ? "Resolution/Topic" : (format === "parliamentary" ? "Motion" : "Resolution"));

  let promptText = `Generate ${count} complete tournament-ready contentions for ${fmtLabel} debate.

${motionLabel}: "${form.resolution}"
Side: ${form.side}
Difficulty: ${form.difficulty}
Evidence preference: ${form.evidencePreference}
${form.context ? `\nAdditional context from the debater (prioritize this): ${form.context}\n` : ""}
${conferenceText ? `\n${conferenceText}\nAdhere to the conference rules/context above.\n` : ""}
Create comprehensive, tournament-quality contentions with real academic evidence, statistics, and expert citations. Include realistic source URLs. Make each contention distinct and strategically strong.
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

  if (isCongress) {
    promptText += `\n\nThis is for Model Congress. Structure arguments as legislative arguments for/against the bill. Use congressional debate terminology (sponsor, co-sponsor, ranking member, etc.).`;
  }
  if (isMUN) {
    promptText += `\n\nThis is for Model UN. Structure arguments as resolution clauses and diplomatic points. Use MUN terminology (fellow delegates, resolution, operative clauses, etc.).`;
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: promptText,
    response_json_schema: SCHEMA,
  });
  return result.contentions || [];
}

export default function ProjectContentionGenerator({ project, contentions, conferenceProfile: defaultProfile, aiMode = "full", onSaved }) {
  const projectFormat = project?.format;
  const isCongress = projectFormat === "model_congress";
  const isParli = projectFormat === "parliamentary";
  const isMUN = projectFormat === "model_un";
  const format = (isCongress || projectFormat === "public_forum" || isMUN) ? "public_forum" : "parliamentary";

  const [form, setForm] = useState({
    resolution: project?.resolution || "",
    side: project?.side || "",
    count: "2",
    difficulty: "intermediate",
    evidencePreference: "academic",
    context: ""
  });
  const [conferenceProfile, setConferenceProfile] = useState(defaultProfile);
  const [generated, setGenerated] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const buildContention = (c) => ({
    ownerUserId: user?.id,
    title: c.title,
    format,
    resolution: form.resolution || project?.resolution || "",
    side: form.side || project?.side || "",
    claim: c.claim, warrant: c.warrant, impact: c.impact, evidence: c.evidence,
    possibleRebuttals: c.possibleRebuttals, rebuttalResponses: c.rebuttalResponses,
    crossfireQuestions: c.crossfireQuestions, crossfireAnswers: c.crossfireAnswers,
    strategicNotes: c.strategicNotes, difficulty: form.difficulty,
    projectId: project?.id,
  });

  const saveAll = async () => {
    if (generated.length === 0) return;
    await Promise.all(generated.map(c => base44.entities.Contention.create(buildContention(c))));
    queryClient.invalidateQueries({ queryKey: ['project_contentions', project?.id] });
    onSaved?.();
    toast({ title: `${generated.length} contentions saved to project!` });
    setGenerated([]);
  };

  const saveOne = async (c) => {
    await base44.entities.Contention.create(buildContention(c));
    queryClient.invalidateQueries({ queryKey: ['project_contentions', project?.id] });
    onSaved?.();
    toast({ title: "Contention saved to project!" });
    setGenerated(prev => prev.filter(x => x !== c));
  };

  const deleteContention = useMutation({
    mutationFn: (cid) => base44.entities.Contention.delete(cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_contentions', project?.id] });
      onSaved?.();
    }
  });

  const generate = async () => {
    if (!form.resolution || !form.side) {
      toast({ title: "Please enter the resolution/bill and select a side", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setGenerated([]);
    const total = parseInt(form.count);
    const batches = [];
    for (let i = 0; i < total; i += BATCH_SIZE) batches.push(Math.min(BATCH_SIZE, total - i));
    const conferenceText = buildConferenceContextText(conferenceProfile || defaultProfile);
    const batchResults = await Promise.all(batches.map(n => generateBatch(n, form, format, aiMode, conferenceText, projectFormat)));
    const all = batchResults.flat().slice(0, total);
    setGenerated(all);
    setGenerating(false);
    toast({ title: `${all.length} contentions generated!` });
  };

  const sideOptions = isCongress
    ? [{ v: "sponsor", l: "Sponsor (Pro)" }, { v: "opposition", l: "Opposition (Con)" }]
    : isMUN
      ? [{ v: "affirmative", l: "Affirmative" }, { v: "negative", l: "Negative" }]
      : isParli
        ? [{ v: "government", l: "Government (Prop)" }, { v: "opposition", l: "Opposition (Opp)" }]
        : [{ v: "affirmative", l: "Affirmative (Pro)" }, { v: "negative", l: "Negative (Con)" }];

  const motionLabel = isCongress ? "Bill / Resolution" : (isMUN ? "Resolution / Topic" : (isParli ? "Motion" : "Resolution"));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 font-heading">Contention Generator</h3>
            <p className="text-xs text-slate-500">AI-powered tournament-ready arguments for this project</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">{motionLabel}</label>
            <Textarea
              value={form.resolution}
              onChange={e => setForm({ ...form, resolution: e.target.value })}
              placeholder={isCongress
                ? "e.g., A Bill to Establish a Federal Carbon Tax..."
                : isParli
                  ? "e.g., This House Would ban social media for users under 16"
                  : "e.g., Resolved: The US federal government should substantially reduce its military presence in East Asia"}
              className="resize-none text-sm"
              rows={2}
            />
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
                    <SelectItem key={n} value={n}>{n}</SelectItem>
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
                  {[["academic", "Academic"], ["news", "News"], ["government", "Government"], ["mixed", "Mixed"]].map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ContextInput
            value={form.context}
            onChange={v => setForm({ ...form, context: v })}
            placeholder="e.g., Focus on economic impacts, avoid climate arguments..."
          />

          <ConferenceContextPicker
            value={conferenceProfile?.id || defaultProfile?.id || ""}
            onChange={(_, p) => setConferenceProfile(p)}
          />

          <Button onClick={generate} disabled={generating} className="w-full h-11 gap-2 text-sm font-semibold">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? `Generating ${form.count} contentions...` : "Generate Contentions"}
          </Button>
        </div>
      </div>

      {generated.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 font-heading flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Generated ({generated.length})
            </h3>
            <Button variant="outline" size="sm" onClick={saveAll} className="gap-1.5 text-xs">
              <Save className="w-3.5 h-3.5" /> Save All to Project
            </Button>
          </div>
          {generated.map((c, i) => (
            <div key={i} className="relative">
              <ContentionCard contention={c} onSave={() => saveOne(c)} saving={false} defaultExpanded />
            </div>
          ))}
        </div>
      )}

      {/* This project's contentions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button onClick={() => setShowSaved(!showSaved)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <span className="font-bold text-slate-900 font-heading text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            In This Project ({contentions.length})
          </span>
          {showSaved ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
        {showSaved && (
          <div className="px-4 pb-4 space-y-3">
            {contentions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No contentions yet. Generate some above!</p>
            ) : contentions.map(c => (
              <div key={c.id} className="relative">
                <ContentionCard contention={c} onSave={() => {}} saving={false} />
                <button
                  onClick={() => deleteContention.mutate(c.id)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}