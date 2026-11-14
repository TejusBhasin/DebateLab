import { base44 } from "@/api/base44Client";

const TAILOR_SCHEMA = {
  type: "object",
  properties: {
    judgeSummary: { type: "string" },
    contentions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          side: { type: "string" },
          claim: { type: "string" },
          warrant: { type: "string" },
          impact: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                source: { type: "string" },
                sourceUrl: { type: "string" },
              },
            },
          },
          possibleRebuttals: { type: "array", items: { type: "string" } },
          rebuttalResponses: { type: "array", items: { type: "string" } },
          strategicNotes: { type: "string" },
          judgeFit: { type: "string" },
        },
        required: ["title", "claim"],
      },
    },
  },
  required: ["contentions"],
};

const trim = (text, max) => String(text || "").slice(0, max);

export const buildJudgePrompt = (project, contentions, judge) => {
  const list = contentions
    .map((c, i) => {
      const ev = (c.evidence || [])
        .map((e) => `${trim(e.text, 220)}${e.source ? ` (${e.source})` : ""}`)
        .join(" / ");
      return `${i + 1}. [${c.side || "unset"}] ${c.title}
   claim: ${trim(c.claim, 400)}
   warrant: ${trim(c.warrant, 400)}
   impact: ${trim(c.impact, 400)}${ev ? `\n   evidence: ${trim(ev, 500)}` : ""}`;
    })
    .join("\n\n");

  const links = (judge.links || [])
    .filter((l) => l?.url)
    .map((l) => `- ${l.label ? `${l.label}: ` : ""}${l.url}`)
    .join("\n");

  return `You are a debate coach tailoring an existing case to one specific judge.

Project: ${project?.name || ""} (${(project?.format || "debate").replace(/_/g, " ")})
Resolution / motion: ${project?.resolution || "not set"}
Our side: ${project?.side || "not set"}

Judge: ${judge.judgeName}
What the student knows about this judge:
${judge.background || "(nothing given — infer from the name and any links, and say clearly in judgeSummary that it is an assumption)"}
${links ? `Judge links given by the student:\n${links}` : ""}
${judge.focus ? `Extra instruction from the student: ${judge.focus}` : ""}

The student's current contentions:
${list || "(none)"}

Rewrite every contention so it lands with THIS judge while keeping each argument's core idea, order and side intact — someone reading both versions should recognize the same case, only reframed.

Rules:
- Keep the same number of contentions as the list above, in the same order, with the same main idea. Do not invent new arguments and do not drop any.
- Re-frame the claim in the language this judge rewards (flow/tech judge: line-by-line, warrants, drops, technical precision; lay/parent judge: plain language, concrete stakes, storytelling; MUN chair: diplomacy, feasibility, coalitions).
- Sharpen the warrant and the examples to what this judge finds persuasive, and keep the impact concrete.
- Choose or re-emphasise the evidence this judge weighs most. Keep real sources from the original; never fabricate a source or a URL.
- strategicNotes = what to do in this specific room.
- judgeFit = one short sentence on why this version fits this judge.
- judgeSummary = 2-3 sentences on what this judge rewards and what the tailoring assumed.

Return every contention in "contentions".`;
};

export const tailorContentions = async (project, contentions, judge) => {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: buildJudgePrompt(project, contentions, judge),
    response_json_schema: TAILOR_SCHEMA,
  });

  const stamp = Date.now();
  const tailored = (res?.contentions || []).map((c, i) => ({
    id: `jt-${stamp}-${i}`,
    title: c.title || "Untitled contention",
    side: c.side || project?.side || "",
    claim: c.claim || "",
    warrant: c.warrant || "",
    impact: c.impact || "",
    evidence: Array.isArray(c.evidence) ? c.evidence : [],
    possibleRebuttals: Array.isArray(c.possibleRebuttals) ? c.possibleRebuttals : [],
    rebuttalResponses: Array.isArray(c.rebuttalResponses) ? c.rebuttalResponses : [],
    strategicNotes: c.strategicNotes || "",
    judgeFit: c.judgeFit || "",
  }));

  return { judgeSummary: res?.judgeSummary || "", tailoredContentions: tailored };
};