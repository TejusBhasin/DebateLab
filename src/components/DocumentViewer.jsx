import { useState } from "react";
import { base44 } from "@/api/base44Client";
import ExportDocButton from "@/components/ExportDocButton";
import { Copy, Download, Plus, X, Maximize2, Minimize2, Pencil, MessageSquare, Save, Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import MarkdownContent from "@/components/MarkdownContent";
import ReactMarkdown from "react-markdown";

function parseDocSections(text) {
  const result = { content: text || "", takeaways: "", importantNotes: "", sources: "" };
  if (!text) return result;

  const extract = (key, regex) => {
    const match = result.content.match(regex);
    if (match) {
      result[key] = match[1].trim();
      result.content = result.content.replace(match[0], "").replace(/\n{3,}/g, '\n\n').trim();
    }
  };

  extract('takeaways', /##\s*(?:Main\s+)?Takeaways?\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  extract('importantNotes', /##\s*(?:Important\s+)?Notes?\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  extract('sources', /##\s*Sources?\s*\n([\s\S]*?)(?=\n##\s|$)/i);

  return result;
}

export default function DocumentViewer({ doc, onClose, onAddContention, addContentionLabel = "Add as Contention", onUpdate }) {
  const { toast } = useToast();
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState("view");
  const [editFields, setEditFields] = useState(null);
  const [saving, setSaving] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingDoc, setPendingDoc] = useState(null);

  if (!doc) return null;

  const parsed = mode === "view" ? parseDocSections(doc.content) : null;
  const showTakeaways = parsed && (doc.takeaways || parsed.takeaways);
  const showNotes = parsed && (doc.importantNotes || parsed.importantNotes);
  const showSources = parsed && (doc.sources || parsed.sources);

  const enterEditMode = () => {
    const p = parseDocSections(doc.content);
    setEditFields({
      title: doc.title || "",
      content: p.content,
      takeaways: doc.takeaways || p.takeaways,
      importantNotes: doc.importantNotes || p.importantNotes,
      sources: doc.sources || p.sources,
    });
    setMode("edit");
  };

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(doc.id, editFields);
      toast({ title: "Document saved!" });
      setMode("view");
      setEditFields(null);
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    setPendingDoc(null);

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI document editor. The user has a document and wants to edit it.

CURRENT DOCUMENT:
Title: ${doc.title}
Content:
${doc.content}

${doc.takeaways ? `Takeaways:\n${doc.takeaways}\n` : ""}
${doc.importantNotes ? `Important Notes:\n${doc.importantNotes}\n` : ""}
${doc.sources ? `Sources:\n${doc.sources}\n` : ""}

USER'S EDIT INSTRUCTION:
${userMsg}

Apply the requested edit and return the COMPLETE updated document. Structure your response EXACTLY as follows:

---CONTENT---
[The full updated document content, in markdown]
---TAKEAWAYS---
[3-5 main takeaways as bullet points. If the user didn't mention takeaways, keep existing or generate from content.]
---NOTES---
[Important notes/reminders. If the user didn't mention notes, keep existing or leave brief.]
---SOURCES---
[Sources cited or referenced. If none, write "None cited."]`
      });

      const response = typeof res === 'string' ? res : JSON.stringify(res);
      setChatMessages(prev => [...prev, { role: "assistant", content: "I've updated the document. Review the changes below and apply them if you're happy." }]);

      const contentMatch = response.match(/---CONTENT---\s*\n?([\s\S]*?)(?=---TAKEAWAYS---|$)/);
      const takeawaysMatch = response.match(/---TAKEAWAYS---\s*\n?([\s\S]*?)(?=---NOTES---|$)/);
      const notesMatch = response.match(/---NOTES---\s*\n?([\s\S]*?)(?=---SOURCES---|$)/);
      const sourcesMatch = response.match(/---SOURCES---\s*\n?([\s\S]*?)$/);

      setPendingDoc({
        content: contentMatch ? contentMatch[1].trim() : response,
        takeaways: takeawaysMatch ? takeawaysMatch[1].trim() : (doc.takeaways || ""),
        importantNotes: notesMatch ? notesMatch[1].trim() : (doc.importantNotes || ""),
        sources: sourcesMatch ? sourcesMatch[1].trim() : (doc.sources || ""),
      });
    } catch (e) {
      toast({ title: "Failed to edit", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  };

  const applyChanges = async () => {
    if (!onUpdate || !pendingDoc) return;
    setSaving(true);
    try {
      await onUpdate(doc.id, { ...pendingDoc });
      setPendingDoc(null);
      setChatMessages([]);
      toast({ title: "Document updated!" });
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(doc.content || "");
    toast({ title: "Copied to clipboard!" });
  };

  const download = () => {
    const blob = new Blob([doc.content || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(doc.title || "document").replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const SectionBlock = ({ label, icon, content }) => {
    if (!content || !content.trim()) return null;
    return (
      <div className="mt-6 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">{icon} {label}</h4>
        <div className="text-sm text-slate-700">
          <MarkdownContent content={content} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ${fullscreen ? "max-w-6xl max-h-[96vh]" : "max-w-3xl max-h-[88vh]"}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1">
              {doc.docLabel && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">{doc.docLabel}</span>}
              {doc.type && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium capitalize">{doc.type.replace(/_/g, " ")}</span>}
            </div>
            <h3 className="font-bold text-slate-900 font-heading truncate">{doc.title}</h3>
            {(doc.country || doc.committee) && <p className="text-xs text-slate-500 mt-0.5">{[doc.country, doc.committee].filter(Boolean).join(" • ")}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
            {mode === "view" && onUpdate && <button onClick={enterEditMode} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
            {mode === "view" && onUpdate && <button onClick={() => { setMode("chat"); setChatMessages([]); setPendingDoc(null); }} className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors"><MessageSquare className="w-3.5 h-3.5" /> AI Edit</button>}
            {mode !== "view" && <button onClick={() => { setMode("view"); setEditFields(null); setPendingDoc(null); }} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">← Back</button>}
            {mode === "view" && <button onClick={copy} title="Copy" className="flex items-center text-slate-500 hover:text-primary bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>}
            {mode === "view" && <ExportDocButton title={doc?.title || "Document"} getMarkdown={() => doc?.content || ""} label="Docs" showDownload={false} />}
            {mode === "view" && <button onClick={download} title="Download .txt" className="flex items-center text-slate-500 hover:text-primary bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><Download className="w-4 h-4" /></button>}
            {mode === "view" && <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} className="flex items-center text-slate-500 hover:text-primary bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">{fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>}
            {mode === "view" && onAddContention && <button onClick={() => onAddContention(doc)} className="flex items-center gap-1 text-xs text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> Contention</button>}
            {onClose && <button onClick={onClose} title="Close" className="flex items-center text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X className="w-4 h-4" /></button>}
          </div>
        </div>

        {/* VIEW MODE */}
        {mode === "view" && (
          <div className="p-6 overflow-y-auto">
            <MarkdownContent content={parsed.content} />
            <SectionBlock label="Main Takeaways" icon={<span>💡</span>} content={showTakeaways} />
            <SectionBlock label="Important Notes" icon={<span>⚠️</span>} content={showNotes} />
            <SectionBlock label="Sources" icon={<span>📚</span>} content={showSources} />
          </div>
        )}

        {/* EDIT MODE */}
        {mode === "edit" && editFields && (
          <div className="p-6 overflow-y-auto space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Title</label>
              <input value={editFields.title} onChange={e => setEditFields({ ...editFields, title: e.target.value })} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Content</label>
              <Textarea value={editFields.content} onChange={e => setEditFields({ ...editFields, content: e.target.value })} rows={14} className="resize-y text-xs font-mono leading-relaxed" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">💡 Takeaways</label>
                <Textarea value={editFields.takeaways} onChange={e => setEditFields({ ...editFields, takeaways: e.target.value })} rows={6} className="resize-y text-xs" placeholder="Key takeaways..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">⚠️ Important Notes</label>
                <Textarea value={editFields.importantNotes} onChange={e => setEditFields({ ...editFields, importantNotes: e.target.value })} rows={6} className="resize-y text-xs" placeholder="Important notes..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">📚 Sources</label>
                <Textarea value={editFields.sources} onChange={e => setEditFields({ ...editFields, sources: e.target.value })} rows={6} className="resize-y text-xs" placeholder="Sources..." />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
            </button>
          </div>
        )}

        {/* CHAT MODE */}
        {mode === "chat" && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {pendingDoc && (
              <div className="border-b border-violet-100 bg-violet-50 p-3 flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs text-violet-700 font-medium">AI proposed changes. Review and apply.</span>
                <div className="flex gap-2">
                  <button onClick={() => setPendingDoc(null)} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Discard</button>
                  <button onClick={applyChanges} disabled={saving} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Apply Changes
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {pendingDoc && (
                <div className="bg-white rounded-xl border-2 border-violet-200 p-4">
                  <div className="text-xs font-semibold text-violet-600 mb-2">Updated Document Preview:</div>
                  <ReactMarkdown className="prose prose-sm max-w-none prose-slate">{pendingDoc.content}</ReactMarkdown>
                  {pendingDoc.takeaways && <div className="mt-4 pt-3 border-t border-slate-100"><div className="text-xs font-bold text-slate-500 uppercase mb-1">💡 Takeaways</div><ReactMarkdown className="prose prose-sm max-w-none prose-slate">{pendingDoc.takeaways}</ReactMarkdown></div>}
                  {pendingDoc.importantNotes && <div className="mt-3 pt-3 border-t border-slate-100"><div className="text-xs font-bold text-slate-500 uppercase mb-1">⚠️ Important Notes</div><ReactMarkdown className="prose prose-sm max-w-none prose-slate">{pendingDoc.importantNotes}</ReactMarkdown></div>}
                  {pendingDoc.sources && <div className="mt-3 pt-3 border-t border-slate-100"><div className="text-xs font-bold text-slate-500 uppercase mb-1">📚 Sources</div><ReactMarkdown className="prose prose-sm max-w-none prose-slate">{pendingDoc.sources}</ReactMarkdown></div>}
                </div>
              )}
              {chatMessages.length === 0 && !pendingDoc && (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-medium text-slate-600">Chat with AI to edit this document</p>
                  <p className="text-xs mt-2 max-w-sm mx-auto">Try: "Add a section about economic impacts", "Make the intro more persuasive", "Shorten the second paragraph"</p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.role === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 rounded-tl-sm'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 rounded-tl-sm flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" /> AI is editing your document...
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <div className="flex items-end gap-2">
                <Textarea value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Tell the AI how to edit this document..." rows={2} className="resize-none text-sm" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }} />
                <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()} className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 shrink-0">
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}