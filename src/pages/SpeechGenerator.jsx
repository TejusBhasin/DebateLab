import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Copy, Save, Megaphone, Clock, Type, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import SaveGeneratedDialog from "@/components/SaveGeneratedDialog";
import { extractHooksAndCtas, buildAntiRepetitionText } from "@/lib/hookCtaUtils";
import { getSpeechFormatGuide } from "@/lib/speechFormatGuides";

const TONES = ["Persuasive", "Conversational", "Formal", "Aggressive", "Inspirational", "Analytical", "Passionate", "Neutral", "Humorous"];
const SPEECH_TYPES = ["Opening Statement", "Closing Argument", "Constructive Speech", "Rebuttal Speech", "Cross-Examination Prep", "Position Speech", "Committee Speech", "Keynote Address", "TED-style Talk", "Commencement", "Impromptu", "Custom"];
const AUDIENCES = ["Judge/Panel", "Committee Delegates", "Competition", "General Audience", "Classroom", "Professional", "Custom"];
const SIDES = ["Pro/Affirmative", "Con/Negative", "Neutral", "First Speaker", "Second Speaker", "N/A"];
const FORMATS = ["Debate (General)", "Parliamentary", "Public Forum", "Model UN", "Model Congress", "Presentation", "Keynote", "Custom"];

export default function SpeechGenerator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [topic, setTopic] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [minutes, setMinutes] = useState(7);
  const [tone, setTone] = useState("Persuasive");
  const [speechType, setSpeechType] = useState("Opening Statement");
  const [audience, setAudience] = useState("Judge/Panel");
  const [side, setSide] = useState("Pro/Affirmative");
  const [format, setFormat] = useState("Debate (General)");
  const [customInstructions, setCustomInstructions] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speech, setSpeech] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ isArchived: false }, '-created_date', 50)
  });

  const { data: projectContentions = [] } = useQuery({
    queryKey: ['speech_contentions', selectedProjectId],
    queryFn: () => selectedProjectId ? base44.entities.Contention.filter({ projectId: selectedProjectId }, 'created_date', 50) : [],
    enabled: !!selectedProjectId
  });

  const { data: projectDocs = [] } = useQuery({
    queryKey: ['speech_project_docs', selectedProjectId],
    queryFn: () => selectedProjectId ? base44.entities.OtherDocument.filter({ projectId: selectedProjectId }, '-created_date', 30) : [],
    enabled: !!selectedProjectId
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const buildContext = () => {
    const parts = [];
    parts.push(`TOPIC/CONTENT:\n${topic}`);

    if (selectedProject) {
      parts.push(`\nPROJECT CONTEXT:`);
      if (selectedProject.resolution) parts.push(`Resolution: ${selectedProject.resolution}`);
      if (selectedProject.side) parts.push(`Side: ${selectedProject.side}`);
      if (selectedProject.format) parts.push(`Format: ${selectedProject.format.replace(/_/g, ' ')}`);
      if (selectedProject.notes) parts.push(`Notes: ${selectedProject.notes}`);

      if (projectContentions.length > 0) {
        parts.push("\nCONTENTIONS:");
        projectContentions.forEach((c, i) => {
          parts.push(`\n${i + 1}. ${c.title}`);
          if (c.claim) parts.push(`   Claim: ${c.claim}`);
          if (c.warrant) parts.push(`   Warrant: ${c.warrant}`);
          if (c.impact) parts.push(`   Impact: ${c.impact}`);
        });
      }
    }

    if (contextNotes.trim()) {
      parts.push(`\nADDITIONAL CONTEXT/NOTES:\n${contextNotes}`);
    }

    return parts.join("\n");
  };

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setSpeech("");
    try {
      const context = buildContext();
      const wordTarget = Math.round(minutes * 130);

      const { hooks, ctas } = extractHooksAndCtas(projectDocs);
      const antiRepetition = buildAntiRepetitionText(hooks, ctas);
      const formatGuide = getSpeechFormatGuide(format) || getSpeechFormatGuide(selectedProject?.format);

      const prompt = `You are an elite speechwriter and debate coach. Write a complete, ready-to-deliver speech.

${context}
${antiRepetition ? `\n${antiRepetition}\n` : ""}
SPEECH PARAMETERS:
- Length: ${minutes} minutes (approximately ${wordTarget} words)
- Tone: ${tone}
- Speech Type: ${speechType}
- Side/Position: ${side}
- Target Audience: ${audience}
- Format: ${format}
${formatGuide ? `\nFORMAT-SPECIFIC BEST PRACTICES — follow these researched, format-specific techniques when structuring and writing this speech:\n${formatGuide}\n` : ""}
${customInstructions.trim() ? `\nADDITIONAL INSTRUCTIONS:\n${customInstructions}` : ""}

REQUIREMENTS:
- Write the ACTUAL speech text, ready to be read aloud — not an outline or instructions.
- Structure the speech appropriately for the "${speechType}" type.
- Use engaging, powerful language suited for the ${audience.toLowerCase()}.
- Include natural transitions and brief delivery cues like [pause] or [emphasis] where helpful.
- Stay within ${minutes} minutes when spoken at a normal pace (~130 words/minute). Aim for ~${wordTarget} words.
- If contentions or research are provided, weave them in naturally with claim, warrant, and impact.
- Format with clear section headers using Markdown (## Introduction, ## Main Point, etc.).
- End with a powerful, memorable conclusion.
- ORIGINALITY IS CRITICAL: Every opening, hook, conclusion, transition, and rhetorical device must be COMPLETELY ORIGINAL and unique to this speech. Do NOT reuse any phrases, sentence structures, or rhetorical patterns that you've generated before. Each section must sound fresh, distinct, and natural — never formulaic, generic, or templated. Vary your word choice, sentence length, and rhetorical approach throughout. If you find yourself reaching for a cliché or a familiar template phrase, STOP and write something completely different. The opening, the conclusion, and every main point should feel like it was written from scratch by a human, not assembled from a template.
- STAY ON TOPIC: Every sentence must directly advance the specific topic and arguments provided above. Do NOT drift into generic filler, tangential points, or broad philosophical musings that aren't grounded in the actual topic. If a sentence could apply to any speech on any topic, rewrite it to be specific to THIS topic. Use the actual content, facts, and context provided — don't invent generic-sounding claims. The speech must read like it was written FOR this exact topic, not adapted from a template.
- After the speech, include a "## Sources" section listing any sources, facts, or references used (if none, write "None cited").`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
      setSpeech(typeof res === 'string' ? res : JSON.stringify(res));
    } catch (e) {
      toast({ title: "Failed to generate speech", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copySpeech = () => {
    navigator.clipboard.writeText(speech);
    toast({ title: "Speech copied!" });
  };

  const parseSections = (text) => {
    const result = { content: text, takeaways: "", importantNotes: "", sources: "" };
    const extract = (key, regex) => {
      const match = result.content.match(regex);
      if (match) { result[key] = match[1].trim(); result.content = result.content.replace(match[0], "").replace(/\n{3,}/g, '\n\n').trim(); }
    };
    extract('takeaways', /##\s*(?:Main\s+)?Takeaways?\s*\n([\s\S]*?)(?=\n##\s|$)/i);
    extract('sources', /##\s*Sources?\s*\n([\s\S]*?)(?=\n##\s|$)/i);
    return result;
  };

  const handleSave = async ({ projectId }) => {
    const parsed = parseSections(speech);
    await base44.entities.OtherDocument.create({
      title: `${speechType} — ${topic.slice(0, 40)}${topic.length > 40 ? "..." : ""}`,
      docLabel: "Generated Speech",
      content: parsed.content,
      takeaways: parsed.takeaways,
      sources: parsed.sources,
      projectId: projectId || "",
      ownerUserId: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ['other_documents'] });
    if (projectId) queryClient.invalidateQueries({ queryKey: ['project_other_docs', projectId] });
    toast({ title: "Speech saved to Docs!" });
    setSaveDialogOpen(false);
  };

  const wordCount = speech ? speech.split(/\s+/).length : 0;
  const estMinutes = speech ? Math.round(wordCount / 130 * 10) / 10 : 0;

  return (
    <AnimatedPage>
      <div className="min-h-[calc(100dvh-56px)] md:min-h-[calc(100vh-64px)] bg-slate-50 -mb-8">
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 md:px-6 py-6 md:py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold font-heading flex items-center gap-2">
              <Megaphone className="w-7 h-7" /> Speech Generator
            </h1>
            <p className="text-violet-100 text-sm mt-1 opacity-90">
              Generate a complete, ready-to-deliver speech from any topic, project, or content — fully customizable.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Topic / Content *</label>
              <Textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter your topic, resolution, or paste any content you want turned into a speech..."
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Minutes</label>
                <input type="number" min={0.05} max={60} step={0.05} value={minutes} onChange={e => setMinutes(Math.min(60, Math.max(0.05, +e.target.value || 0.05)))} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black">
                  {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Speech Type</label>
                <select value={speechType} onChange={e => setSpeechType(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black">
                  {SPEECH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Audience</label>
                <select value={audience} onChange={e => setAudience(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black">
                  {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              <Settings2 className="w-4 h-4" /> Advanced Options
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Side / Position</label>
                    <select value={side} onChange={e => setSide(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black">
                      {SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Format</label>
                    <select value={format} onChange={e => setFormat(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black">
                      {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Project (optional)</label>
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black">
                      <option value="">No project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Additional Context / Notes</label>
                  <Textarea value={contextNotes} onChange={e => setContextNotes(e.target.value)} placeholder="Any additional context, facts, or instructions to include..." rows={2} className="resize-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Custom Instructions</label>
                  <Textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder="Special instructions for the AI (e.g., 'include a quote from...', 'avoid jargon', 'make it funny')..." rows={2} className="resize-none text-sm" />
                </div>
              </div>
            )}

            <Button onClick={generate} disabled={loading || !topic.trim()} className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white h-11">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? "Generating Speech..." : `Generate ${minutes}-min Speech`}
            </Button>
          </div>

          {speech && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Type className="w-3.5 h-3.5" /> {wordCount} words</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ~{estMinutes} min</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copySpeech} className="gap-1.5 text-xs"><Copy className="w-3.5 h-3.5" /> Copy</Button>
                  <Button size="sm" variant="outline" onClick={() => setSaveDialogOpen(true)} className="gap-1.5 text-xs"><Save className="w-3.5 h-3.5" /> Save to Docs</Button>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 max-h-[600px] overflow-y-auto">
                <ReactMarkdown className="prose prose-sm max-w-none prose-slate prose-p:leading-relaxed prose-headings:text-slate-900 prose-h2:text-base prose-h2:mt-4 prose-li:my-0.5">{speech}</ReactMarkdown>
              </div>
            </div>
          )}

          {!speech && !loading && (
            <div className="text-center py-12 text-slate-400">
              <Megaphone className="w-12 h-12 mx-auto mb-4 text-slate-200" />
              <p className="text-lg font-medium text-slate-600">Generate a speech from any topic</p>
              <p className="text-sm mt-2 max-w-md mx-auto">Enter a topic above, customize the options, and get a complete, ready-to-deliver speech. Works for debates, presentations, and more.</p>
            </div>
          )}
        </div>
      </div>

      <SaveGeneratedDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSave}
        itemLabel="Speech"
      />
    </AnimatedPage>
  );
}