const text = (v) => (v == null ? "" : String(v).trim());
const bulletList = (items, fallback = "") => {
  const list = (items || []).map(text).filter(Boolean);
  return list.length ? list.map((i) => `  - ${i}`).join("\n") : fallback;
};

const INSTRUCTIONS = [
  "Use this archive as the full context of my debate work. Do not invent facts or sources; if you cannot verify something, say so.",
  "1. Side check: for every contention, tell me whether it argues the side listed for its project. List only the ones that argue the other side, and rewrite those.",
  "2. Quality pass: rewrite any contention that is vague, has no causal mechanism, or has no number. Keep the same number of contentions per project.",
  "3. Attack me: give the three strongest attacks on each contention, then a one-line answer to each.",
  "4. Rank my contentions per project, strongest to weakest, and tell me which one to cut.",
];

export function buildArchiveMarkdown({ projects = [], contentions = [], documents = [], generations = [], includeDocuments = true, includePrompts = true }) {
  const out = [];
  out.push("# DebateLab AI Archive");
  out.push("");
  out.push(`Exported ${new Date().toLocaleString()} · ${projects.length} project${projects.length === 1 ? "" : "s"} · ${contentions.length} contention${contentions.length === 1 ? "" : "s"}`);
  out.push("");
  out.push("## What I want from you");
  out.push(INSTRUCTIONS.map((i) => `- ${i}`).join("\n"));
  out.push("");

  const projectless = contentions.filter((c) => !c.projectId);

  projects.forEach((p) => {
    const own = contentions.filter((c) => c.projectId === p.id);
    const docs = documents.filter((d) => d.projectId === p.id);
    const gens = generations.filter((g) => g.projectId === p.id);

    out.push("---");
    out.push("");
    out.push(`## Project: ${text(p.name) || "Untitled"}`);
    out.push(`- Format: ${text(p.format).replace(/_/g, " ") || "not set"}`);
    out.push(`- Resolution / motion: ${text(p.resolution) || "not set"}`);
    out.push(`- Our side: ${text(p.side) || "not set"}${p.isArchived ? " (archived)" : ""}`);
    if (text(p.description)) out.push(`- Description: ${text(p.description)}`);
    if (text(p.notes)) out.push(`- Notes: ${text(p.notes)}`);
    out.push("");

    out.push(`### Contentions (${own.length})`);
    if (own.length === 0) {
      out.push("_No contentions saved in this project._");
    } else {
      own.forEach((c, i) => {
        out.push("");
        out.push(`#### ${i + 1}. ${text(c.title) || "Untitled contention"} — side: ${text(c.side) || "not set"}`);
        if (text(c.claim)) out.push(`- Claim: ${text(c.claim)}`);
        if (text(c.warrant)) out.push(`- Warrant: ${text(c.warrant)}`);
        if (text(c.impact)) out.push(`- Impact: ${text(c.impact)}`);
        if ((c.evidence || []).length) {
          out.push("- Evidence:");
          c.evidence.forEach((e) => {
            if (!text(e?.text)) return;
            out.push(`  - "${text(e.text)}" — ${text(e.source) || "source not given"}${text(e.sourceUrl) ? ` (${text(e.sourceUrl)})` : ""}`);
          });
        }
        if ((c.possibleRebuttals || []).length) out.push(`- They'll say:\n${bulletList(c.possibleRebuttals)}`);
        if ((c.rebuttalResponses || []).length) out.push(`- We answer:\n${bulletList(c.rebuttalResponses)}`);
        if ((c.crossfireQuestions || []).length) out.push(`- Crossfire questions:\n${bulletList(c.crossfireQuestions)}`);
        if ((c.crossfireAnswers || []).length) out.push(`- Crossfire answers:\n${bulletList(c.crossfireAnswers)}`);
        if (text(c.strategicNotes)) out.push(`- Strategy: ${text(c.strategicNotes)}`);
        if (text(c.difficulty)) out.push(`- Difficulty: ${text(c.difficulty)}`);
      });
    }
    out.push("");

    if (includeDocuments && docs.length) {
      out.push(`### Documents (${docs.length})`);
      docs.forEach((d) => {
        out.push("");
        out.push(`#### ${text(d.title) || "Untitled document"}${text(d.docLabel) ? ` — ${text(d.docLabel)}` : ""}`);
        if (text(d.content)) out.push(text(d.content).slice(0, 3000));
      });
      out.push("");
    }

    if (includePrompts && gens.length) {
      out.push(`### Generation prompts used in this project (${gens.length})`);
      out.push("_These are the exact prompts that produced the sets above._");
      gens.forEach((g) => {
        out.push("");
        out.push(`#### ${text(g.label) || `${g.count} contentions`} · ${new Date(g.created_date).toLocaleString()}`);
        out.push("```");
        out.push(text(g.prompt));
        out.push("```");
      });
      out.push("");
    }
  });

  if (projectless.length) {
    out.push("---");
    out.push("");
    out.push(`## Contentions not attached to a project (${projectless.length})`);
    projectless.forEach((c, i) => {
      out.push("");
      out.push(`#### ${i + 1}. ${text(c.title) || "Untitled contention"} — side: ${text(c.side) || "not set"}${text(c.resolution) ? ` · "${text(c.resolution)}"` : ""}`);
      if (text(c.claim)) out.push(`- Claim: ${text(c.claim)}`);
      if (text(c.warrant)) out.push(`- Warrant: ${text(c.warrant)}`);
      if (text(c.impact)) out.push(`- Impact: ${text(c.impact)}`);
    });
    out.push("");
  }

  return out.join("\n");
}

export function buildArchiveJson({ projects = [], contentions = [], documents = [], generations = [], includeDocuments = true, includePrompts = true }) {
  return {
    exported_at: new Date().toISOString(),
    instructions: INSTRUCTIONS,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      format: p.format,
      resolution: p.resolution,
      side: p.side,
      notes: p.notes,
      isArchived: !!p.isArchived,
      contentions: contentions
        .filter((c) => c.projectId === p.id)
        .map((c) => ({
          title: c.title,
          side: c.side,
          claim: c.claim,
          warrant: c.warrant,
          impact: c.impact,
          evidence: c.evidence || [],
          possibleRebuttals: c.possibleRebuttals || [],
          rebuttalResponses: c.rebuttalResponses || [],
          crossfireQuestions: c.crossfireQuestions || [],
          crossfireAnswers: c.crossfireAnswers || [],
          strategicNotes: c.strategicNotes,
          difficulty: c.difficulty,
        })),
      documents: includeDocuments
        ? documents.filter((d) => d.projectId === p.id).map((d) => ({ title: d.title, label: d.docLabel, content: d.content }))
        : undefined,
      generationPrompts: includePrompts
        ? generations.filter((g) => g.projectId === p.id).map((g) => ({ label: g.label, count: g.count, prompt: g.prompt, created_date: g.created_date }))
        : undefined,
    })),
    otherContentions: contentions.filter((c) => !c.projectId),
  };
}

export function downloadTextFile(filename, content, mime = "text/markdown") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}