import { useState } from "react";
import { Upload, Loader2, Swords, X, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import ExportDocButton from "@/components/ExportDocButton";
import { techniquesPromptText } from "@/lib/debateTechniques";

// Upload an opponent's case/guide and get a plan to beat it. Works standalone or inside a project.
export default function CounterCaseBuilder({ project, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [pasted, setPasted] = useState("");
  const [resolution, setResolution] = useState(project?.resolution || "");
  const [mySide, setMySide] = useState(project?.side || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const addFiles = (e) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    e.target.value = "";
  };

  const run = async () => {
    setLoading(true);
    const urls = [];
    for (const f of files) {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: f });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
      urls.push(signed_url);
    }
    const out = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_1_pro",
      add_context_from_internet: true,
      file_urls: urls.length ? urls : undefined,
      prompt: `You are an elite debate coach. The material below (uploaded files and/or pasted text) is a case, guide, or set of arguments that my side must BEAT. Build the most complete counter-strategy possible.

${resolution ? `Resolution/topic: ${resolution}` : ""}
${mySide ? `I am debating: ${mySide}` : ""}
${project?.format ? `Format: ${project.format}` : ""}

PASTED MATERIAL:
${pasted || "(none)"}

Go ABOVE AND BEYOND the material: find weaknesses it does not address, add stronger arguments and up-to-date evidence it is missing (research the web, name sources), and predict what the opponents will say next.

Use these techniques by name where they apply:
${techniquesPromptText()}

Output in markdown with these sections:
## 1. What They're Arguing (their arguments ranked strongest to weakest)
## 2. Line-by-Line Attacks (for each argument: the technique used, exact words to say, and a layered backup answer)
## 3. Turns & Offense (link turns, impact turns, disadvantages)
## 4. What the Guide Missed (new arguments and evidence of my own, with sources)
## 5. Pre-empts (what they'll say back, and my answer)
## 6. Weighing (which mechanisms I win on and the exact sentence to say)
## 7. Cross-Ex / POI Questions
## 8. Speech Plan (time allocation and what to collapse to)
Be specific and honest: do not fabricate evidence; mark anything unverified.`,
    });
    setResult(typeof out === "string" ? out : JSON.stringify(out));
    setLoading(false);
  };

  const save = async () => {
    await base44.entities.OtherDocument.create({
      ownerUserId: user.id,
      title: `Counter-Case${resolution ? `: ${resolution.slice(0, 60)}` : ""}`,
      docLabel: "Counter-Case",
      description: "AI counter-strategy for an uploaded case/guide",
      content: result,
      ...(project?.id ? { projectId: project.id } : {}),
    });
    toast({ title: project?.id ? "Saved to project" : "Saved to Other Docs" });
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 font-heading flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /> Counter-Case Builder</h3>
          <p className="text-xs text-slate-500 mt-1">Upload an opponent's case, a prep guide, or evidence packet. The AI finds every weakness, adds what it missed, and builds your plan to beat it. No tool can guarantee a win, but this gives you the most thorough prep.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Resolution / topic (optional)" className="bg-white" />
          <Input value={mySide} onChange={(e) => setMySide(e.target.value)} placeholder="Your side (e.g. Opposition)" className="bg-white" />
        </div>
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-5 text-sm text-slate-500 cursor-pointer hover:border-primary/40">
          <Upload className="w-4 h-4" /> Upload guides, cases, or evidence (PDF, images, text)
          <input type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.csv" onChange={addFiles} />
        </label>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-slate-100 rounded-full px-2.5 py-1">
                {f.name}<button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
        <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="...or paste their case / guide text here" className="bg-white min-h-[100px]" />
        <Button onClick={run} disabled={loading || (!files.length && !pasted.trim())} className="gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Building counter-case...</> : <><Swords className="w-4 h-4" /> Build counter-case</>}
        </Button>
      </div>

      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={save} className="gap-1.5 text-xs h-8"><Save className="w-3 h-3" /> Save</Button>
            <ExportDocButton title="Counter-Case" getMarkdown={() => result} />
          </div>
          <div className="prose prose-sm max-w-none"><ReactMarkdown>{result}</ReactMarkdown></div>
        </div>
      )}
    </div>
  );
}