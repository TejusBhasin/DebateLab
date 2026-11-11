import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";

const list = (arr, ordered) => (arr || []).map((x, i) => `${ordered ? `${i + 1}.` : "-"} ${x}`).join("\n");

export function contentionToMarkdown(c, level = 2) {
  const h = "#".repeat(level);
  const h2 = "#".repeat(level + 1);
  const parts = [`${h} ${c.title || "Contention"}${c.side ? ` (${c.side})` : ""}`];
  if (c.claim) parts.push(`**Claim:** ${c.claim}`);
  if (c.warrant) parts.push(`**Warrant:** ${c.warrant}`);
  if (c.impact) parts.push(`**Impact:** ${c.impact}`);
  if (c.evidence?.length) parts.push(`${h2} Evidence\n` + c.evidence.map(e => `- "${e.text}" — ${e.source || ""}${e.sourceUrl ? ` (${e.sourceUrl})` : ""}`).join("\n"));
  if (c.possibleRebuttals?.length) parts.push(`${h2} Possible Rebuttals\n${list(c.possibleRebuttals, true)}`);
  if (c.rebuttalResponses?.length) parts.push(`${h2} Rebuttal Responses\n${list(c.rebuttalResponses, true)}`);
  if (c.crossfireQuestions?.length) parts.push(`${h2} Crossfire Questions\n${list(c.crossfireQuestions, true)}`);
  if (c.weighingMechanisms) parts.push(`${h2} Weighing\n` + Object.entries(c.weighingMechanisms).map(([k, v]) => `- **${k}:** ${v}`).join("\n"));
  if (c.strategicNotes) parts.push(`**Strategic Notes:** ${c.strategicNotes}`);
  return parts.join("\n\n");
}

export const contentionsToMarkdown = (arr, level = 2) => (arr || []).map(c => contentionToMarkdown(c, level)).join("\n\n---\n\n");

export function projectToMarkdown(project, contentions, otherDocs) {
  const parts = [`# ${project.name}`];
  const meta = [project.format && `Format: ${project.format}`, project.resolution && `Resolution: ${project.resolution}`, project.side && `Side: ${project.side}`].filter(Boolean);
  if (meta.length) parts.push(meta.join(" | "));
  if (project.description) parts.push(project.description);
  if (contentions?.length) parts.push(`# Contentions\n\n${contentionsToMarkdown(contentions, 2)}`);
  if (project.notes) parts.push(`# Notes\n\n${project.notes}`);
  (otherDocs || []).forEach(d => parts.push(`# ${d.title}${d.docLabel ? ` (${d.docLabel})` : ""}\n\n${d.content || ""}`));
  return parts.join("\n\n");
}

function toHtml(markdown) {
  return renderToStaticMarkup(React.createElement(ReactMarkdown, null, markdown || ""));
}

const wrapDoc = (title, body) =>
  `<html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Arial,sans-serif;line-height:1.5"><h1>${title}</h1>${body}</body></html>`;

export function downloadAsDoc(title, markdown) {
  const blob = new Blob([wrapDoc(title, toHtml(markdown))], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "document").replace(/[^\w\- ]+/g, "").trim() || "document"}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// No Google API: copy formatted content, open a blank Google Doc; the user pastes (Ctrl/Cmd+V).
export async function exportToGoogleDocs(title, markdown) {
  window.open("https://docs.new", "_blank");
  const html = wrapDoc(title, toHtml(markdown));
  const plain = `${title}\n\n${markdown}`;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain], { type: "text/plain" }),
    })]);
  } catch {
    await navigator.clipboard.writeText(plain);
  }
}