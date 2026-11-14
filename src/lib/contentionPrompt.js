import { base44 } from "@/api/base44Client";

export const BATCH_SIZE = 8;

export const CONTENTION_SCHEMA = {
  type: "object",
  properties: {
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
          evidence: { type: "array", items: { type: "object", properties: { text: { type: "string" }, source: { type: "string" }, sourceUrl: { type: "string" } } } },
          possibleRebuttals: { type: "array", items: { type: "string" } },
          rebuttalResponses: { type: "array", items: { type: "string" } },
          crossfireQuestions: { type: "array", items: { type: "string" } },
          crossfireAnswers: { type: "array", items: { type: "string" } },
          strategicNotes: { type: "string" },
        },
        required: ["title", "side", "claim", "warrant", "impact", "evidence", "possibleRebuttals", "rebuttalResponses", "crossfireQuestions", "crossfireAnswers", "strategicNotes"],
      },
    },
  },
  required: ["contentions"],
};

const CHECK_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "number" },
          verdict: { type: "string", enum: ["ok", "wrong_side", "weak"] },
          problem: { type: "string" },
          fixed: {
            type: "object",
            properties: {
              title: { type: "string" },
              claim: { type: "string" },
              warrant: { type: "string" },
              impact: { type: "string" },
            },
          },
        },
        required: ["index", "verdict"],
      },
    },
  },
  required: ["results"],
};

// What each side of each format actually means. The model used to be handed only a
// bare word ("opposition"), which is how contentions ended up arguing the other side.
const SIDES = {
  parliamentary: {
    government: { label: "Government", stance: "for", meaning: "supports the motion and defends the change it proposes" },
    opposition: { label: "Opposition", stance: "against", meaning: "opposes the motion and defends the status quo" },
  },
  public_forum: {
    affirmative: { label: "Affirmative", stance: "for", meaning: "affirms the resolution and defends doing it" },
    negative: { label: "Negative", stance: "against", meaning: "negates the resolution and defends not doing it" },
  },
  model_un: {
    affirmative: { label: "Affirmative", stance: "for", meaning: "supports the resolution/topic and the action it calls for" },
    negative: { label: "Negative", stance: "against", meaning: "opposes the resolution/topic and the action it calls for" },
  },
  model_congress: {
    sponsor: { label: "Sponsor", stance: "for", meaning: "supports the bill and wants it to pass" },
    opposition: { label: "Opposition", stance: "against", meaning: "opposes the bill and wants it to fail" },
  },
};

const FOR_ALIASES = ["pro", "aff", "affirmative", "government", "gov", "sponsor", "for", "prop", "proposition"];

const FORMAT_DEFAULTS = {
  parliamentary: { pro: "government", con: "opposition" },
  public_forum: { pro: "affirmative", con: "negative" },
  model_un: { pro: "affirmative", con: "negative" },
  model_congress: { pro: "sponsor", con: "opposition" },
};

export const getSide = (projectFormat, sideValue) => {
  const map = SIDES[projectFormat] || SIDES.public_forum;
  if (map[sideValue]) return { value: sideValue, ...map[sideValue] };
  const isFor = FOR_ALIASES.includes(String(sideValue || "").toLowerCase());
  return {
    value: sideValue,
    label: sideValue ? String(sideValue) : "our side",
    stance: isFor ? "for" : "against",
    meaning: isFor ? "supports the resolution/motion" : "opposes the resolution/motion",
  };
};

// Projects store sides like "pro"/"con" while generators offer format-specific values.
// Map whatever came in onto the value this format's selector uses.
export const normalizeSideValue = (projectFormat, raw) => {
  const map = SIDES[projectFormat] || SIDES.public_forum;
  if (raw && map[raw]) return raw;
  const defaults = FORMAT_DEFAULTS[projectFormat] || FORMAT_DEFAULTS.public_forum;
  const v = String(raw || "").toLowerCase();
  if (!v) return "";
  if (FOR_ALIASES.includes(v) || v.includes("pro") || v.includes("gov") || v.includes("aff")) return defaults.pro;
  return defaults.con;
};

export const sideOptionsFor = (projectFormat) =>
  Object.entries(SIDES[projectFormat] || SIDES.public_forum).map(([value, meta]) => ({ value, label: meta.label, stance: meta.stance, meaning: meta.meaning }));

const DIFFICULTY_GUIDE = {
  beginner: "plain logic a new debater can deliver: one clear causal chain, one simple example, no jargon.",
  intermediate: "statistics, a named policy example, and explicit weighing against the opponent's likely case.",
  advanced: "multi-step mechanisms, counter-intuitive framing, pre-emptive answers to the standard attacks on this argument.",
  expert: "technical, philosophically or economically precise, with edge-case analysis and sharp comparative weighing.",
};

const EVIDENCE_GUIDE = {
  academic: "peer-reviewed journals and university research, cited author + year.",
  news: "major outlets and investigative reporting from the last 3 years.",
  government: "official reports, agency data, CBO/GAO/UN/World Bank style sources.",
  mixed: "a spread of academic, news and government sources.",
};

const motionLabelFor = (projectFormat) =>
  projectFormat === "model_congress" ? "Bill/Resolution" : projectFormat === "model_un" ? "Resolution/Topic" : projectFormat === "parliamentary" ? "Motion" : "Resolution";

const fmtLabelFor = (projectFormat, format) =>
  projectFormat === "model_congress" ? "Model Congress" : projectFormat === "model_un" ? "Model UN" : format === "parliamentary" ? "Parliamentary" : "Public Forum";

export const buildGenerationPrompt = (params) => {
  const { count, resolution, sideValue, difficulty = "intermediate", evidencePreference = "academic", context, conferenceText, projectFormat, aiMode } = params;
  const fmtLabel = fmtLabelFor(projectFormat, params.format);
  const motionLabel = motionLabelFor(projectFormat);
  const side = getSide(projectFormat, sideValue);
  const forSide = side.stance === "for";

  let prompt = `Write exactly ${count} tournament-ready ${fmtLabel} contentions.

THE SIDE — GET THIS RIGHT FIRST, EVERYTHING ELSE IS WORTHLESS WITHOUT IT
We are on the ${side.label} side. In this format the ${side.label} ${side.meaning}. Our position is: we ${forSide ? "SUPPORT" : "OPPOSE"} the ${motionLabel.toLowerCase()} below.
${motionLabel}: "${resolution}"

Rules for the side:
- Every single contention must make the ${side.label} case stronger. If a contention would help the other side, or could be quoted by them, it is a failed output no matter how well it is written.
- Never argue against our own side, never concede the other side wins, and never title a contention with the other side's claim.
- Each contention object must carry "side": exactly "${sideValue}". Do not output any other value there.
- Before you write, state to yourself in one line what our side is trying to prove. Then make every claim serve that line.

QUALITY BAR — every contention must have all of this:
1. Title: a specific, argumentative claim ("Carbon tax cuts US industrial emissions 22% by 2032"), never a bare label like "Economy" or "Contention 1".
2. Claim: one sentence naming the actor, the change, and the direction of the outcome.
3. Warrant: the causal mechanism in 2-3 steps, each step concrete. At least one number, study, or named real-world case. "Studies show" without a source is banned.
4. Impact: quantified — who, how many, how much money/lives/rights, over what timeframe, and why it outweighs the other side's impact.
5. Evidence: 1-3 items with organisation/author + year and a real URL. If you do not know the exact URL, leave sourceUrl empty — never invent a link.
6. possibleRebuttals: the 2 strongest attacks a good opponent makes. rebuttalResponses: a one-line answer to each, matched in order.
7. crossfireQuestions / crossfireAnswers: sharp, specific questions that expose their weakest link.
8. strategicNotes: how to run this argument in the round and what to do if it is dropped.

Hard constraints:
- All ${count} contentions must be genuinely different arguments (different mechanism, different actor, different impact), not the same claim reworded.
- No filler, no definitions, no framework lecture, no "this is important" — only arguments that win ballots.
- Stay on this specific ${motionLabel.toLowerCase()}; if a contention could be pasted into any debate on any topic, rewrite it until it could only belong to this one.

Difficulty: ${difficulty} — ${DIFFICULTY_GUIDE[difficulty] || DIFFICULTY_GUIDE.intermediate}
Evidence preference: ${evidencePreference} — ${EVIDENCE_GUIDE[evidencePreference] || EVIDENCE_GUIDE.academic}
${context ? `\nThe debater's own instructions (highest priority, override the defaults above): ${context}\n` : ""}${conferenceText ? `\n${conferenceText}\nFollow the conference rules and terminology above.\n` : ""}`;

  if (aiMode === "dampened") {
    prompt += `\nDampened AI is on: give structural outlines in claim/warrant/impact (bullets) and the evidence to look up, not a finished speech script.`;
  }
  if (projectFormat === "model_congress") {
    prompt += `\nModel Congress: frame each contention as a legislative argument for or against the bill; use sponsor, ranking member and floor-debate language.`;
  }
  if (projectFormat === "model_un") {
    prompt += `\nModel UN: frame each contention as resolution clauses and diplomatic points from our delegation's position; use delegate/operative-clause language.`;
  }

  prompt += `\n\nReturn JSON: {"contentions": [{title, side, claim, warrant, impact, evidence: [{text, source, sourceUrl}], possibleRebuttals: [], rebuttalResponses: [], crossfireQuestions: [], crossfireAnswers: [], strategicNotes}]}`;
  return prompt;
};

const trim = (text, max) => String(text || "").slice(0, max);

export const buildSelfCheckPrompt = (params, contentions) => {
  const side = getSide(params.projectFormat, params.sideValue);
  const motionLabel = motionLabelFor(params.projectFormat);
  const list = contentions
    .map((c, i) => `#${i + 1}
Title: ${trim(c.title, 200)}
Claim: ${trim(c.claim, 400)}
Warrant: ${trim(c.warrant, 600)}
Impact: ${trim(c.impact, 400)}
First evidence: ${trim((c.evidence || []).map((e) => `${e.text} (${e.source})`).join(" / "), 400)}`)
    .join("\n\n");

  return `You are a senior debate coach reviewing a student's contentions before a tournament. Be strict — a wrong-side or vague contention loses rounds.

The student is on the ${side.label} side, which ${side.meaning}.
${motionLabel}: "${params.resolution}"

For EACH contention below, judge it:
- "wrong_side": it argues for the other side, concedes our burden, attacks our own position, or is really the opponent's argument.
- "weak": vague, generic, no causal mechanism, no number or named case, or a near-duplicate of another contention.
- "ok": it genuinely argues our side with a real mechanism and a quantified impact.
Do not be generous. If it would not survive an opponent's cross-examination, it is not "ok".

Then fix every contention that is not "ok": rewrite its title, claim, warrant and impact so it clearly argues the ${side.label} side at tournament quality, keeping the original idea only where the idea is sound. Put the rewrite in "fixed". Explain the problem in one short sentence in "problem".

Contentions:
${list}

Return JSON: {"results":[{"index":0,"verdict":"ok|wrong_side|weak","problem":"","fixed":{"title":"","claim":"","warrant":"","impact":""}}]} with exactly one entry per contention above, using the same order and the same index numbers (starting at 0).`;
};

async function generateOne(params) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: buildGenerationPrompt(params),
    response_json_schema: CONTENTION_SCHEMA,
  });
  return (res?.contentions || []).map((c) => ({ ...c, side: params.sideValue }));
}

async function checkOne(params, contentions) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: buildSelfCheckPrompt(params, contentions),
    response_json_schema: CHECK_SCHEMA,
  });
  const byIndex = new Map((res?.results || []).map((r) => [Number(r?.index), r]));
  let fixed = 0;
  let flagged = 0;

  const reviewed = contentions.map((c, i) => {
    const r = byIndex.get(i);
    if (!r || !r.verdict || r.verdict === "ok") return c;
    const f = r.fixed || {};
    if (f.claim || f.warrant || f.impact) {
      fixed += 1;
      return {
        ...c,
        title: f.title || c.title,
        claim: f.claim || c.claim,
        warrant: f.warrant || c.warrant,
        impact: f.impact || c.impact,
        side: params.sideValue,
      };
    }
    flagged += 1;
    return { ...c, side: params.sideValue, selfCheckNote: r.problem || "" };
  });

  return { contentions: reviewed, fixed, flagged };
}

// Generates (and re-generates) a whole set: same batching, same prompt, same count.
export const runContentionsGeneration = async (params) => {
  const total = Math.max(1, parseInt(params.count, 10) || 1);
  const sizes = [];
  for (let i = 0; i < total; i += BATCH_SIZE) sizes.push(Math.min(BATCH_SIZE, total - i));

  const batches = await Promise.all(
    sizes.map(async (n) => {
      const batchParams = { ...params, count: n };
      const raw = await generateOne(batchParams);
      return checkOne(batchParams, raw);
    })
  );

  const contentions = batches.flatMap((b) => b.contentions).slice(0, total);
  return {
    contentions,
    reviewed: contentions.length,
    fixed: batches.reduce((sum, b) => sum + b.fixed, 0),
    flagged: batches.reduce((sum, b) => sum + b.flagged, 0),
  };
};