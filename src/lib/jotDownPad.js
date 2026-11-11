/**
 * The Jot-Down pad lives in localStorage per project so a note can be scribbled
 * instantly mid-round. These helpers are the only place that reads/writes it,
 * so the pad component and the AI generator stay in sync.
 */
export const padKey = (projectId) => (projectId ? `jotdown_${projectId}` : "jotdown_local");

export const readPad = (projectId) => {
  try {
    return JSON.parse(localStorage.getItem(padKey(projectId)) || "{}") || {};
  } catch {
    return {};
  }
};

export const appendToPad = (projectId, notes) => {
  const pad = readPad(projectId);
  const entries = Array.isArray(pad.entries) ? pad.entries : [];
  const next = [...entries, ...notes];
  localStorage.setItem(padKey(projectId), JSON.stringify({ ...pad, entries: next }));
  window.dispatchEvent(new CustomEvent("jotdown-updated", { detail: { projectId } }));
  return next;
};