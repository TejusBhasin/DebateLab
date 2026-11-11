import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Save, Upload, ClipboardPaste, FileText, Copy, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import ReactMarkdown from "react-markdown";
import { MUN_GUIDE_SUMMARY } from "@/lib/munGuide";

const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    overallScore: { type: "number", description: "Score from 1 to 10" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    detailedFeedback: { type: "string", description: "Markdown with section-by-section analysis" },
    actionItems: { type: "array", items: { type: "string" } },
  },
  required: ["overallScore", "summary", "strengths", "weaknesses", "detailedFeedback", "actionItems"],
};

export default function FeedbackGenerator({ project, documents = [], contentions = [], onSaved }) {
  const projectId = project?.id || null;
  const isMUN = project?.format === "model_un";
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [inputMode, setInputMode] = useState(projectId ? "contentions" : "paste");
  const [selectedContIds, setSelectedContIds] = useState(new Set());
  const [pastedText, setPastedText] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [focusArea, setFocusArea] = useState("");
  const [title, setTitle] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const all = await base44.entities.Project.list('-created_date');
      return all.filter(p => !p.isArchived);
    },
    enabled: !projectId,
  });
  const [pickedProjectId, setPickedProjectId] = useState("");

  const projectDocs = documents;

  // Start with every contention selected — the usual ask is "grade my case".
  useEffect(() => {
    setSelectedContIds(prev => (prev.size > 0 ? prev : new Set(contentions.map(c => c.id))));
  }, [contentions]);

  const toggleContention = (cid) => {
    setSelectedContIds(prev => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  const contentionText = () => contentions
    .filter(c => selectedContIds.has(c.id))
    .map((c, i) => [
      `${i + 1}. ${c.title}${c.side ? ` (${c.side})` : ""}`,
      c.claim && `Claim: ${c.claim}`,
      c.warrant && `Warrant: ${c.warrant}`,
      c.impact && `Impact: ${c.impact}`,
      ...(c.evidence || []).filter(e => e.text).map(e => `Evidence: "${e.text}"${e.source ? ` — ${e.source}` : ""}`),
      ...(c.rebuttalResponses || []).map(r => `Answer prepared: ${r}`),
      ...(c.crossfireQuestions || []).map(q => `Crossfire question: ${q}`),
    ].filter(Boolean).join("\n"))
    .join("\n\n");

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadedText("");
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: up.file_url,
        json_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
      });
      if (extracted.status === "success" && extracted.output) {
        const text = typeof extracted.output === "string" ? extracted.output : extracted.output.text || "";
        setUploadedText(text);
      } else {
        toast({ title: "Couldn't read that file. Try pasting the text instead.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed. Try pasting the text instead.", variant: "destructive" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const getSourceText = () => {
    if (inputMode === "contentions") return contentionText();
    if (inputMode === "paste") return pastedText.trim();
    if (inputMode === "select") {
      const doc = projectDocs.find(d => d.id === selectedDocId);
      return doc ? `${doc.title}\n\n${doc.content || ""}` : "";
    }
    if (inputMode === "upload") return uploadedText.trim();
    return "";
  };

  const generate = async () => {
    const sourceText = getSourceText();
    if (!sourceText) {
      toast({
        title: inputMode === "contentions" ? "Select at least one contention to review." : "Add a document to evaluate first.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    setFeedback(null);

    const formatLabel = isMUN ? "Model United Nations" : (project?.format?.replace(/_/g, ' ') || "debate");
    const projectContext = project
      ? `Project: ${project.name}\nFormat: ${formatLabel}\nResolution/Topic: ${project.resolution || "not set"}\nSide: ${project.side || "not set"}`
      : `Format: ${formatLabel || "general debate"}`;

    let prompt = `You are an expert ${formatLabel} coach giving detailed, actionable feedback on a student's document. Be specific, honest, and constructive — reference exact parts of the document.`;

    if (isMUN) {
      prompt += `\n\nUse the following MUN mastery framework as your evaluation criteria. Judge the document against these standards:\n\n${MUN_GUIDE_SUMMARY}`;
    }

    prompt += `\n\n${projectContext}\n${focusArea ? `\nFocus area the student wants feedback on: ${focusArea}\n` : ""}

DOCUMENT TO EVALUATE:
"""
${sourceText}
"""

Provide: an overallScore (1-10), a concise summary, specific strengths, specific weaknesses with how to fix them, detailedFeedback as markdown (section-by-section analysis with concrete suggestions), and actionItems (next steps the student should take).`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: FEEDBACK_SCHEMA });
      setFeedback(res);
    } catch {
      toast({ title: "Feedback generation failed. Please try again.", variant: "destructive" });
    }
    setGenerating(false);
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => base44.entities.OtherDocument.create(data),
    onSuccess: () => {
      const targetProject = projectId || pickedProjectId || null;
      queryClient.invalidateQueries({ queryKey: ['other_documents'] });
      if (targetProject) queryClient.invalidateQueries({ queryKey: ['project_other_documents', targetProject] });
      onSaved?.();
      toast({ title: "Feedback saved to documents!" });
      setFeedback(null);
      setPastedText("");
      setUploadedText("");
      setSelectedDocId("");
      setTitle("");
    },
  });

  const save = async () => {
    if (!feedback) return;
    setSaving(true);
    const targetProject = projectId || pickedProjectId || null;
    const docTitle = title.trim() || `AI Feedback — ${new Date().toLocaleDateString()}`;
    const content = `# AI Feedback: ${docTitle}

**Overall Score:** ${feedback.overallScore ?? "—"}/10

## Summary
${feedback.summary || ""}

## Strengths
${(feedback.strengths || []).map(s => `- ${s}`).join("\n")}

## Areas for Improvement
${(feedback.weaknesses || []).map(w => `- ${w}`).join("\n")}

## Detailed Feedback
${feedback.detailedFeedback || ""}

## Action Items
${(feedback.actionItems || []).map(a => `- ${a}`).join("\n")}`;

    await saveMutation.mutateAsync({
      ownerUserId: user?.id,
      title: docTitle,
      docLabel: "AI Feedback",
      description: focusArea || `AI-generated feedback on a ${isMUN ? "Model UN" : "debate"} document.`,
      content,
      takeaways: (feedback.actionItems || []).join("\n"),
      projectId: targetProject || undefined,
    });
    setSaving(false);
  };

  const copyFeedback = () => {
    if (!feedback) return;
    const text = `Score: ${feedback.overallScore}/10\n\n${feedback.summary}\n\nStrengths:\n${(feedback.strengths||[]).join("\n")}\n\nWeaknesses:\n${(feedback.weaknesses||[]).join("\n")}\n\n${feedback.detailedFeedback}\n\nAction Items:\n${(feedback.actionItems||[]).join("\n")}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Feedback copied to clipboard!" });
  };

  const modeBtns = [
    { id: "paste", label: "Paste Text", icon: ClipboardPaste },
    { id: "upload", label: "Upload File", icon: Upload },
    ...(projectId ? [
      { id: "contentions", label: "From Contentions", icon: BookOpen },
      { id: "select", label: "From Project Docs", icon: FileText },
    ] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 font-heading">AI Feedback Generator</h3>
            <p className="text-xs text-slate-500">
              {isMUN
                ? "Evaluates your document against the Complete MUN Mastery Guide and gives specific, actionable feedback."
                : "Paste, upload, or select a document and get detailed coaching feedback."}
            </p>
          </div>
        </div>

        {isMUN && (
          <div className="mt-3 text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2 border border-blue-100">
            Model UN project detected — feedback is grounded in the MUN mastery framework.
          </div>
        )}

        {/* Input mode tabs */}
        <div className="flex gap-2 mt-4 mb-3">
          {modeBtns.map(m => (
            <button
              key={m.id}
              onClick={() => setInputMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inputMode === m.id ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              <m.icon className="w-3.5 h-3.5" /> {m.label}
            </button>
          ))}
        </div>

        {inputMode === "paste" && (
          <Textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder="Paste your speech, resolution, position paper, or any document here..."
            rows={8}
            className="resize-none text-sm"
          />
        )}

        {inputMode === "upload" && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={handleUpload} className="hidden" />
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            {uploading ? (
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Reading file...</p>
            ) : uploadedText ? (
              <div>
                <p className="text-sm text-green-600 font-medium mb-2">✓ File read ({uploadedText.length} chars)</p>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="text-xs">Replace file</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="text-xs">Choose file (PDF, DOC, TXT)</Button>
            )}
          </div>
        )}

        {inputMode === "contentions" && (
          <div>
            {contentions.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center">No contentions in this project yet. Generate some in the Contentions tab first.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {contentions.map(c => (
                  <button key={c.id} onClick={() => toggleContention(c.id)} className="w-full flex items-center gap-2 text-left p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input type="checkbox" readOnly checked={selectedContIds.has(c.id)} className="w-4 h-4 accent-primary shrink-0 pointer-events-none" />
                    <span className="text-sm text-slate-700 truncate">{c.title}</span>
                    {c.side && <span className="text-xs text-slate-400 shrink-0 ml-auto">{c.side}</span>}
                  </button>
                ))}
                <p className="text-xs text-slate-400 px-2 pt-1">{selectedContIds.size} of {contentions.length} selected — feedback judges the case as a whole.</p>
              </div>
            )}
          </div>
        )}

        {inputMode === "select" && (
          <div>
            {projectDocs.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center">No documents in this project yet. Paste or upload instead.</p>
            ) : (
              <select
                value={selectedDocId}
                onChange={e => setSelectedDocId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none"
              >
                <option value="">Select a document...</option>
                {projectDocs.map(d => (
                  <option key={d.id} value={d.id}>{d.title}{d.docLabel ? ` (${d.docLabel})` : ""}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Focus area (optional)</label>
            <Input value={focusArea} onChange={e => setFocusArea(e.target.value)} placeholder="e.g. opening speech, resolution clauses" className="text-sm h-9" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Document title (optional)</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Saved feedback title" className="text-sm h-9" />
          </div>
        </div>

        {!projectId && (
          <div className="mt-3">
            <label className="text-xs text-slate-500 mb-1 block">Save to project (optional)</label>
            <select
              value={pickedProjectId}
              onChange={e => setPickedProjectId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm text-black shadow-sm appearance-none"
            >
              <option value="">My Documents (no project)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <Button onClick={generate} disabled={generating} className="w-full h-11 gap-2 text-sm font-semibold mt-4">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating feedback..." : "Get AI Feedback"}
        </Button>
      </div>

      {feedback && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold font-heading text-xl ${(feedback.overallScore ?? 0) >= 7 ? "bg-green-100 text-green-700" : (feedback.overallScore ?? 0) >= 4 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                {feedback.overallScore ?? "—"}<span className="text-xs">/10</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 font-heading">AI Feedback</h4>
                <p className="text-xs text-slate-500">Review, then save to your documents.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copyFeedback} className="gap-1.5 text-xs">
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
          </div>

          <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-100">{feedback.summary}</div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Strengths</div>
              <ul className="space-y-1.5">
                {(feedback.strengths || []).map((s, i) => (
                  <li key={i} className="text-sm text-green-900 flex gap-2"><span className="text-green-500">+</span>{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">To Improve</div>
              <ul className="space-y-1.5">
                {(feedback.weaknesses || []).map((w, i) => (
                  <li key={i} className="text-sm text-red-900 flex gap-2"><span className="text-red-500">!</span>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Feedback</div>
            <ReactMarkdown className="prose prose-sm max-w-none prose-slate [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{feedback.detailedFeedback || ""}</ReactMarkdown>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Action Items</div>
            <ul className="space-y-1.5">
              {(feedback.actionItems || []).map((a, i) => (
                <li key={i} className="text-sm text-amber-900 flex gap-2"><span className="text-amber-500 font-bold">{i + 1}.</span>{a}</li>
              ))}
            </ul>
          </div>

          <Button onClick={save} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Feedback to Documents"}
          </Button>
        </div>
      )}
    </div>
  );
}