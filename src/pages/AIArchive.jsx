import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import AnimatedPage from "@/components/AnimatedPage";
import { buildArchiveMarkdown, buildArchiveJson, downloadTextFile } from "@/lib/aiArchive";
import { ArrowLeft, Bot, Copy, Check, Download, FileJson, Loader2, FolderOpen, BookOpen, FileText } from "lucide-react";

const TOGGLES = [
  { key: "includeDocuments", label: "Include saved documents" },
  { key: "includePrompts", label: "Include the generation prompts" },
];

export default function AIArchive() {
  const { toast } = useToast();
  const [options, setOptions] = useState({ includeDocuments: true, includePrompts: true });
  const [copied, setCopied] = useState(false);

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["ai_archive_projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });
  const { data: contentions = [], isLoading: loadingContentions } = useQuery({
    queryKey: ["ai_archive_contentions"],
    queryFn: () => base44.entities.Contention.list("-created_date"),
  });
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["ai_archive_documents"],
    queryFn: () => base44.entities.OtherDocument.list("-created_date"),
  });
  const { data: generations = [], isLoading: loadingGenerations } = useQuery({
    queryKey: ["ai_archive_generations"],
    queryFn: () => base44.entities.GenerationRecord.list("-created_date"),
  });

  const loading = loadingProjects || loadingContentions || loadingDocs || loadingGenerations;

  const archive = useMemo(
    () => buildArchiveMarkdown({ projects, contentions, documents, generations, ...options }),
    [projects, contentions, documents, generations, options]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(archive);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Archive copied — paste it into ChatGPT" });
    } catch {
      toast({ title: "Could not copy — download the file instead", variant: "destructive" });
    }
  };

  const downloadMarkdown = () => downloadTextFile("debatelab-ai-archive.md", archive);
  const downloadJson = () =>
    downloadTextFile(
      "debatelab-ai-archive.json",
      JSON.stringify(buildArchiveJson({ projects, contentions, documents, generations, ...options }), null, 2),
      "application/json"
    );

  return (
    <AnimatedPage>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> AI Archive
            </h1>
            <p className="text-xs text-slate-500">Every project, contention and document in one file you can hand to ChatGPT.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: FolderOpen, label: "Projects", value: projects.length },
            { icon: BookOpen, label: "Contentions", value: contentions.length },
            { icon: FileText, label: "Documents", value: documents.length },
            { icon: Bot, label: "Prompts kept", value: generations.length },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <s.icon className="w-4 h-4 text-primary mb-2" />
              <div className="text-xl font-bold text-slate-900 font-heading">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 font-heading text-sm">How this works</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Copy the archive (or download it and upload it to ChatGPT), then ask it to check every contention against the side it is listed under, rewrite the weak ones,
              and attack your case. It already opens with those instructions, so you can just send it.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TOGGLES.map((t) => (
              <button
                key={t.key}
                onClick={() => setOptions((o) => ({ ...o, [t.key]: !o[t.key] }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${options[t.key] ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
              >
                {t.label}
              </button>
            ))}
            <span className="text-xs text-slate-400 ml-auto">{archive.length.toLocaleString()} characters</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={copy} disabled={loading} className="gap-1.5">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy archive"}
            </Button>
            <Button variant="outline" onClick={downloadMarkdown} disabled={loading} className="gap-1.5">
              <Download className="w-4 h-4" /> Download .md
            </Button>
            <Button variant="outline" onClick={downloadJson} disabled={loading} className="gap-1.5">
              <FileJson className="w-4 h-4" /> Download .json
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 font-heading text-sm">Archive preview</h3>
            {loading && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</span>}
          </div>
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-slate-300 animate-spin" /></div>
          ) : projects.length === 0 ? (
            <div className="p-10 text-center">
              <FolderOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No projects yet — create one and its contentions will show up here.</p>
            </div>
          ) : (
            <pre className="p-4 text-[11px] leading-relaxed font-mono text-slate-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto bg-slate-50">
              {archive}
            </pre>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}