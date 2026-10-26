import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Copy, Save, Mic } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/components/ui/use-toast";
import { extractHooksAndCtas, buildAntiRepetitionText } from "@/lib/hookCtaUtils";
import { getSpeechFormatGuide } from "@/lib/speechFormatGuides";

/**
 * Generates a full written speech from ALL project info:
 * resolution, side, format, notes, contentions, rebuttals, research, docs, conference rules.
 * Props: project, contentions, rebuttals, otherDocs, agentResults, conferenceContext, onSaved
 */
export default function ProjectSpeechGenerator({ project, contentions, rebuttals, otherDocs, agentResults, conferenceContext, onSaved }) {
  const { toast } = useToast();
  const [minutes, setMinutes] = useState(7);
  const [tone, setTone] = useState("persuasive");
  const [includeGreeting, setIncludeGreeting] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [contentionCount, setContentionCount] = useState("");
  const [longConclusion, setLongConclusion] = useState(false);
  const [includeCta, setIncludeCta] = useState(project?.format === "model_un");
  const [loading, setLoading] = useState(false);
  const [speech, setSpeech] = useState("");
  const [saving, setSaving] = useState(false);

  const buildContext = () => {
    const parts = [];
    parts.push(`Resolution: ${project?.resolution || project?.name || "(not set)"}`);
    if (project?.side) parts.push(`Side: ${project.side}`);
    if (project?.format) parts.push(`Format: ${project.format.replace(/_/g, ' ')}`);
    if (project?.notes) parts.push(`Project notes: ${project.notes}`);

    if (contentions.length > 0) {
      parts.push("\nCONTENTIONS:");
      contentions.forEach((c, i) => {
        parts.push(`\n${i + 1}. ${c.title}`);
        if (c.claim) parts.push(`   Claim: ${c.claim}`);
        if (c.warrant) parts.push(`   Warrant: ${c.warrant}`);
        if (c.impact) parts.push(`   Impact: ${c.impact}`);
        if (c.evidence?.length > 0) parts.push(`   Evidence: ${c.evidence.map(e => e.text).join('; ')}`);
      });
    }

    if (rebuttals.length > 0) {
      parts.push("\nPREPARED REBUTTALS:");
      rebuttals.forEach((r, i) => {
        parts.push(`\nOpponent argument ${i + 1}: ${r.input}`);
        parts.push(`Your response: ${typeof r.output === 'string' ? r.output : ''}`);
      });
    }

    if (agentResults) {
      parts.push("\nRESEARCH FINDINGS:");
      if (agentResults.summary) parts.push(`Summary: ${agentResults.summary}`);
      if (agentResults.keyFacts?.length > 0) {
        parts.push("Key facts/stats:");
        agentResults.keyFacts.forEach((f, i) => parts.push(`  ${i + 1}. ${typeof f === 'string' ? f : f.fact}${typeof f === 'object' && f.source ? ` (Source: ${f.source})` : ''}`));
      }
      if (agentResults.logicPoints?.length > 0) {
        parts.push("Logic points:");
        agentResults.logicPoints.forEach((l, i) => parts.push(`  ${i + 1}. ${typeof l === 'string' ? l : l.point || l}`));
      }
    }

    if (otherDocs?.length > 0) {
      parts.push("\nOTHER PROJECT DOCUMENTS:");
      otherDocs.forEach(d => parts.push(`- ${d.title}: ${(d.content || '').slice(0, 400)}`));
    }

    if (conferenceContext) parts.push(`\nCONFERENCE RULES / CONTEXT:\n${conferenceContext}`);

    return parts.join("\n");
  };

  const buildAntiRepetition = () => {
    const { hooks, ctas } = extractHooksAndCtas(otherDocs);
    return buildAntiRepetitionText(hooks, ctas);
  };

  const generate = async () => {
    setLoading(true);
    setSpeech("");
    try {
      const context = buildContext();
      const isMUN = project?.format === "model_un";
      const isCongress = project?.format === "model_congress";

      const greetingInstruction = includeGreeting
        ? (isMUN || isCongress
            ? `Start with a formal greeting: "Honorable Chair, fellow delegates..." (or equivalent for the format).`
            : `Start with a brief, professional greeting appropriate to the debate format.`)
        : `Do NOT include any formal greeting, pleasantries, or "Honorable Chair" address. Skip straight to your hook — get to the point immediately.`;

      const ctaInstruction = includeCta
        ? `Include a clear call to action (e.g., "I urge all delegates to vote in favor of this resolution," "I call upon this body to act..."). The speech must end with a direct call to action.`
        : `Do NOT include a call to action, a "vote for me" appeal, or any legislative "I urge you to vote" language.`;

      const contentionInstruction = contentionCount
        ? `Structure the speech around exactly ${contentionCount} main point${contentionCount === "1" ? "" : "s"}/contention${contentionCount === "1" ? "" : "s"}. Give each its own section with full development (claim, warrant, impact, evidence).`
        : `Structure the speech around a natural number of main points/contentions appropriate for the time limit.`;

      const conclusionInstruction = longConclusion
        ? `Write a LONG, powerful conclusion — restate key arguments, deliver a strong emotional appeal, and end memorably.`
        : `Write a SHORT, punchy conclusion — 2-3 sentences that land the final blow and sit down. No rambling.`;

      const antiRepetition = buildAntiRepetition();
      const formatGuide = getSpeechFormatGuide(project?.format);

      const prompt = `You are an elite debate coach writing a complete, ready-to-deliver speech.

PROJECT CONTEXT:
${context}
${antiRepetition ? `\n${antiRepetition}\n` : ""}
Write a full ${minutes}-minute speech (approximately ${Math.round(minutes * 130)} words) for the ${project?.side || 'assigned'} side.
${formatGuide ? `\nFORMAT-SPECIFIC BEST PRACTICES (${project?.format.replace(/_/g, ' ')}) — follow these researched techniques when writing this speech:\n${formatGuide}\n` : ""}

Tone: ${tone}.
${customPrompt.trim() ? `\nADDITIONAL INSTRUCTIONS (what to write about):\n${customPrompt.trim()}\n` : ""}
Requirements:
- Write the ACTUAL speech text, ready to be read aloud — not an outline or instructions.
- ${greetingInstruction}
- Open with a CATCHY, attention-grabbing hook — a surprising statistic, a vivid scenario, a powerful rhetorical question, or a bold statement that immediately grabs the audience. Make the hook memorable and specific (not generic).
- ORIGINALITY IS CRITICAL: Every opening, hook, conclusion, transition, and rhetorical device must be COMPLETELY ORIGINAL and unique to this speech. Do NOT reuse any phrases, sentence structures, or rhetorical patterns that you've generated before. Each section must sound fresh, distinct, and natural — never formulaic, generic, or templated. Vary your word choice, sentence length, and rhetorical approach throughout. If you find yourself reaching for a cliché or a familiar template phrase, STOP and write something completely different. The opening, the conclusion, and every contention should feel like it was written from scratch by a human, not assembled from a template.
- STAY ON TOPIC: Every sentence must directly advance the specific topic, resolution, and arguments provided in the project context above. Do NOT drift into generic debate filler, tangential points, or broad philosophical musings that aren't grounded in the specific contentions, evidence, and research given. If a sentence could apply to any debate on any topic, rewrite it to be specific to THIS topic. Use the actual evidence, statistics, and warrants from the context — don't invent generic-sounding claims. The speech must read like it was written FOR this exact topic, not adapted from a template.
- Structure: catchy hook + state the resolution → contentions (with claim, warrant, impact, and cite evidence/research) → preempt and rebut likely opponent arguments → weighing → conclusion.
- ${contentionInstruction}
- ${conclusionInstruction}
- ${ctaInstruction}
- Use the contentions, evidence, research facts, and prepared rebuttals above. Weave them in naturally.
- Include brief [pause] or [transition] cues where helpful for delivery.
- Stay within ${minutes} minutes when spoken at a normal pace (~130 words/minute). Aim for ~${Math.round(minutes * 130)} words.
- Format with clear section headers (## Introduction, ## Contention 1, etc.) using Markdown.
- After the speech, include a "## Key Takeaways" section with 3-5 concise bullet points summarizing the main arguments. These takeaways will appear at the bottom of the saved document.
- After Key Takeaways, include a "## Sources" section listing any sources, facts, or evidence cited (if none, write "None cited").
- After Sources, include a "## Delivery Tips" section with practical speaking advice drawn from this guide, adapted to the speech format:

DELIVERY GUIDE (draw general advice for all formats, MUN-specific for MUN/Congress):
Sight (Body Language):
- Maintain eye contact to appear confident; hold your notes low and use bullet points, glancing briefly.
- Look at the back of the room or at people's foreheads if direct eye contact is difficult; alternate eye contact between people on opposite sides.
- Keep hands from becoming a distraction — rest at sides, clasp together, or hold paper against body.
- Useful gestures: Merkel Diamond, counting gestures (first, second, third), Obama Point, palms up to appear welcoming, palms down to show control.
- Stand still whenever possible; keep feet shoulder-width apart; avoid shifting weight. If you tend to move, imagine a triangle on the floor — move to a different corner only between sentences.

Sound (Voice):
- Pace: pause naturally at commas and periods; take a breath instead of using filler words ("um," "like"); become comfortable with silence; use dramatic pauses for emphasis.
- Volume: speak at about twice your normal conversational volume; practice proper breathing to project.
- Tone: avoid sounding monotone; raise pitch when giving details; lower pitch when emphasizing key points; vary pitch to keep listeners engaged; speak with genuine enthusiasm; use your opening hook to experiment with vocal variety.

Improvisation:
- Essential for thinking on your feet during moderated caucuses, building alliances during unmoderated caucuses, and developing strong impromptu speaking skills.

Moderated Caucus (MUN/Congress only):
- Break the overall topic into smaller, manageable issues; present your country's policy on a specific issue; propose realistic solutions; listen to other delegates and build agreement; suggest how agreed solutions can be incorporated into draft resolutions.

Pick 4-6 of the most relevant tips for THIS speech and format. For MUN/Congress, include moderated caucus and improvisation tips. For other debate formats, focus on the general sight/sound advice. Format as concise bullet points.`;

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

  const saveSpeech = async () => {
    setSaving(true);
    try {
      await base44.entities.OtherDocument.create({
        title: `${minutes}-min Speech — ${project?.name || 'Project'}`,
        docLabel: "Generated Speech",
        content: speech,
        projectId: project?.id,
        ownerUserId: project?.ownerUserId,
      });
      toast({ title: "Speech saved to All Docs!" });
      if (onSaved) onSaved();
    } catch (e) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-violet-500" />
        <div>
          <h3 className="font-bold text-slate-900 font-heading text-sm">Speech Generator</h3>
          <p className="text-xs text-slate-500">Generates a full, ready-to-deliver speech from everything in this project — contentions, research, rebuttals, and notes.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Speech length</label>
          <input type="number" min={0.05} max={30} step={0.05} value={minutes} onChange={e => setMinutes(Math.min(30, Math.max(0.05, +e.target.value || 0.05)))} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Tone</label>
          <select value={tone} onChange={e => setTone(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black">
            <option value="persuasive">Persuasive</option>
            <option value="conversational">Conversational</option>
            <option value="formal">Formal</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={generate} disabled={loading || !project} className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating..." : "Generate Speech"}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Main points / contentions (goal)</label>
          <input type="number" min={1} max={20} step={1} value={contentionCount} onChange={e => setContentionCount(e.target.value)} placeholder="Auto" className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-black" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none pb-2">
            <input type="checkbox" checked={longConclusion} onChange={e => setLongConclusion(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            Long conclusion
          </label>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
        <input type="checkbox" checked={includeGreeting} onChange={e => setIncludeGreeting(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
        Start with formal greeting ("Honorable Chair, fellow delegates…")
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
        <input type="checkbox" checked={includeCta} onChange={e => setIncludeCta(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
        Include call to action
      </label>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">What to write about (optional)</label>
        <Textarea
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          placeholder="e.g., Focus on the economic argument and preempt the opponent's climate counterplan, emphasize our second contention, keep it simple for a lay judge..."
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      {contentions.length === 0 && !agentResults && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
          Tip: add contentions or run the Research Agent first — the generator works best with project material to draw from.
        </p>
      )}

      {speech && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">~{Math.round(speech.split(/\s+/).length / 130 * 10) / 10} min read · {speech.split(/\s+/).length} words</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copySpeech} className="gap-1.5 text-xs"><Copy className="w-3.5 h-3.5" /> Copy</Button>
              <Button size="sm" variant="outline" onClick={saveSpeech} disabled={saving} className="gap-1.5 text-xs">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save to Docs
              </Button>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 max-h-[600px] overflow-y-auto">
            <ReactMarkdown className="prose prose-sm max-w-none prose-slate prose-p:leading-relaxed prose-headings:text-slate-900 prose-h2:text-base prose-h2:mt-4 prose-li:my-0.5">{speech}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}