import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BookOpen, MessageSquare, StickyNote, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, X, Maximize2, Sparkles, Loader2, CheckSquare, Square, Globe, Archive, ArchiveRestore, ShieldAlert, FileText, Users, Activity, Check, Copy, ScrollText, Lightbulb, ExternalLink, Scale, Wand2, FileDown, Mic, HelpCircle, PenLine, Gavel } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import ReactMarkdown from "react-markdown";
import ProjectSuggestionsWidget from "@/components/ProjectSuggestionsWidget";
import AnimatedPage from "@/components/AnimatedPage";
import ProjectAIChats from "@/components/ProjectAIChats";
import OtherDocGenerator from "@/components/OtherDocGenerator";
import QnAPrepGenerator from "@/components/QnAPrepGenerator";
import ProjectContextCard from "@/components/ProjectContextCard";
import ProjectFlowTab from "@/components/ProjectFlowTab";
import ProjectJotDown from "@/components/ProjectJotDown";
import ProjectContentionGenerator from "@/components/ProjectContentionGenerator";
import ProjectSpeechGenerator from "@/components/ProjectSpeechGenerator";
import FeedbackGenerator from "@/components/FeedbackGenerator";
import ResearchAgent from "@/components/ResearchAgent";
import ProjectSpeakingMode from "@/components/ProjectSpeakingMode";
import BothSidesPrompt from "@/components/BothSidesPrompt";
import DocumentViewer from "@/components/DocumentViewer";
import ConferenceLinkSelect from "@/components/ConferenceLinkSelect";
import TechniquesLibrary from "@/components/TechniquesLibrary";
import CounterCaseBuilder from "@/components/CounterCaseBuilder";
import JudgeCustomizeDialog from "@/components/JudgeCustomizeDialog";
import JudgeTailoredTab from "@/components/JudgeTailoredTab";
import QuickCopyDialog from "@/components/QuickCopyDialog";
import ExportDocButton from "@/components/ExportDocButton";
import { projectToMarkdown } from "@/lib/exportDoc";
import { buildConferenceContextText } from "@/components/ConferenceContextPicker";

const DIFF_COLORS = { beginner: "bg-green-100 text-green-700", intermediate: "bg-blue-100 text-blue-700", advanced: "bg-purple-100 text-purple-700", expert: "bg-red-100 text-red-700" };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("contentions");
  const [collabUserId, setCollabUserId] = useState("");
  const [collabRole, setCollabRole] = useState("viewer");
  const [speakingMode, setSpeakingMode] = useState(false);
  const [sideFilter, setSideFilter] = useState("both");
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewDoc, setViewDoc] = useState(null);
  const [agentResults, setAgentResults] = useState(null);
  const [rebuttalInput, setRebuttalInput] = useState("");
  const [rebuttalLoading, setRebuttalLoading] = useState(false);
  const [rebuttals, setRebuttals] = useState([]);
  const [genOppLoading, setGenOppLoading] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [activeJudgeId, setActiveJudgeId] = useState(null);
  const [judgeDialogOpen, setJudgeDialogOpen] = useState(false);

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => base44.entities.Project.filter({ id }).then(r => r[0]),
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const byOwner = await base44.entities.UserProfile.filter({ ownerUserId: user.id });
      if (byOwner.length > 0) return byOwner[0];
      const res = await base44.entities.UserProfile.filter({ created_by_id: user.id });
      return res[0] || null;
    },
    enabled: !!user
  });

  const getActiveAiMode = () => {
    if (project?.aiMode && project.aiMode !== "default") return project.aiMode;
    return profile?.defaultAiMode || "full";
  };

  const { data: contentions = [] } = useQuery({
    queryKey: ['project_contentions', id],
    queryFn: () => base44.entities.Contention.filter({ projectId: id }, '-created_date'),
  });

  const { data: judgeProfiles = [] } = useQuery({
    queryKey: ['judge_profiles', id],
    queryFn: () => base44.entities.JudgeProfile.filter({ projectId: id }, '-created_date', 50),
  });
  const activeJudge = judgeProfiles.find(p => p.id === activeJudgeId) || null;

  const { data: collaborators = [] } = useQuery({
    queryKey: ['project_collaborators', id],
    queryFn: () => base44.entities.ProjectCollaborator.filter({ projectId: id })
  });

  const { data: myFriendCodes = [] } = useQuery({
    queryKey: ['myFriendCode', user?.id],
    queryFn: () => base44.entities.UserFriendCode.filter({ userId: user?.id }),
    enabled: !!user
  });
  const myCode = myFriendCodes[0]?.code;

  const { data: activityLog = [] } = useQuery({
    queryKey: ['project_activity', id],
    queryFn: () => base44.entities.ProjectActivity.filter({ projectId: id }, '-created_date', 50)
  });

  const { data: chatSessions = [] } = useQuery({
    queryKey: ['project_chat_sessions', id],
    queryFn: () => base44.entities.AIChatSession.filter({ projectId: id }, '-created_date', 50)
  });

  const { data: otherDocs = [] } = useQuery({
    queryKey: ['project_other_documents', id],
    queryFn: () => base44.entities.OtherDocument.filter({ projectId: id }, '-created_date'),
  });

  const deleteOtherDoc = useMutation({
    mutationFn: (docId) => base44.entities.OtherDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] });
      queryClient.invalidateQueries({ queryKey: ['other_documents'] });
      logActivity("Deleted Document", "Removed a custom document from the project.");
    }
  });

  const updateOtherDoc = useMutation({
    mutationFn: ({ docId, data }) => base44.entities.OtherDocument.update(docId, data),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] });
      queryClient.invalidateQueries({ queryKey: ['other_documents'] });
      setViewDoc(prev => prev ? { ...prev, ...data } : null);
      logActivity("Edited Document", "Updated a document in the project.");
    }
  });

  const copyOtherDoc = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const addContentionFromDoc = useMutation({
    mutationFn: (doc) => base44.entities.Contention.create({
      ownerUserId: user?.id,
      title: doc.title,
      format: ["parliamentary", "public_forum"].includes(project?.format) ? project.format : "public_forum",
      resolution: project?.resolution || "—",
      side: project?.side || "pro",
      projectId: id,
      strategicNotes: doc.content,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_contentions', id] });
      logActivity("Added Contention", "Created a contention from a saved document.");
      toast({ title: "Added as a contention! Edit it in the Contentions tab." });
    },
    onError: () => toast({ title: "Could not add contention", variant: "destructive" })
  });

  const { data: conferenceProfiles = [] } = useQuery({
    queryKey: ['conference_profiles'],
    queryFn: () => base44.entities.ConferenceProfile.list('-created_date')
  });
  const { data: folders = [] } = useQuery({
    queryKey: ['project_folders'],
    queryFn: () => base44.entities.ProjectFolder.list('-created_date')
  });

  // Effective conference profile: project's own link, else the folder's linked profile.
  const projectFolder = folders.find(f => f.id === project?.folderId);
  const effectiveConferenceId = project?.conferenceProfileId || projectFolder?.conferenceProfileId || "";
  const effectiveConference = conferenceProfiles.find(c => c.id === effectiveConferenceId);
  const conferenceContext = buildConferenceContextText(effectiveConference);

  const linkConference = useMutation({
    mutationFn: (profileId) => base44.entities.Project.update(id, { conferenceProfileId: profileId || "" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', id] }); toast({ title: "Conference rules updated" }); }
  });

  const addCollaborator = useMutation({
    mutationFn: async () => {
      const u = await base44.entities.User.get(collabUserId);
      if(!u) throw new Error("User not found");
      return base44.entities.ProjectCollaborator.create({
        ownerUserId: user?.id,
        projectId: id,
        userId: u.id,
        userName: u.full_name,
        role: collabRole
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_collaborators', id] });
      setCollabUserId("");
      toast({ title: "Collaborator added" });
    },
    onError: () => toast({ title: "User not found or error", variant: "destructive" })
  });

  const logActivity = (action, details) => {
    base44.entities.ProjectActivity.create({
      ownerUserId: user?.id,
      projectId: id,
      userId: user?.id || 'unknown',
      userName: user?.full_name || 'Anonymous',
      action,
      details
    });
  };

  const deleteContention = useMutation({
    mutationFn: (cid) => base44.entities.Contention.delete(cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_contentions', id] });
      logActivity("Deleted Contention", "Removed a contention from the project.");
    }
  });

  const deleteJudge = useMutation({
    mutationFn: (pid) => base44.entities.JudgeProfile.delete(pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge_profiles', id] });
      setActiveJudgeId(null);
      toast({ title: "Judge tab deleted" });
    }
  });

  const deleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} contentions?`)) return;
    await Promise.all([...selectedIds].map(cid => base44.entities.Contention.delete(cid)));
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['project_contentions', id] });
    toast({ title: `${selectedIds.size} contentions deleted` });
  };

  const deleteProject = useMutation({
    mutationFn: () => base44.entities.Project.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); navigate('/projects'); toast({ title: "Project deleted" }); }
  });

  const archiveProject = useMutation({
    mutationFn: (val) => base44.entities.Project.update(id, { isArchived: val }),
    onSuccess: (_, val) => { queryClient.invalidateQueries({ queryKey: ['projects'] }); queryClient.invalidateQueries({ queryKey: ['project', id] }); toast({ title: val ? "Project archived" : "Project unarchived" }); }
  });

  const updateProject = useMutation({
    mutationFn: ({ field, value }) => base44.entities.Project.update(id, { [field]: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id] })
  });

  const generatePredictedRebuttals = async () => {
    if (genOppLoading || project?.isArchived) return;
    setGenOppLoading(true);
    const context = contentions.slice(0, 6).map(c => `- ${c.title}: ${c.claim || ''}`).join('\n');
    const activeAiMode = getActiveAiMode();

    let promptText = `You are an expert debater representing the ${project?.side || 'Affirmative'} side for the resolution "${project?.resolution || 'not set'}".

Here are our side's current contentions and materials:
${context || 'No contentions yet'}
${project.notes ? `\nProject notes: ${project.notes}` : ''}

STEP 1: Predict the strongest 2-4 arguments the OPPONENT would make against our case, drawing on all the project materials above.
STEP 2: For each predicted opponent argument, generate a strong, evidence-backed rebuttal we can use.

Format your response as:
**Predicted Opponent Arguments:**
1. ...
2. ...

**Our Rebuttals:**
1. (rebuttal to argument 1) ...
2. (rebuttal to argument 2) ...`;

    if (conferenceContext) promptText += `\n\n${conferenceContext}`;
    if (activeAiMode === "dampened") {
      promptText += `\n\nCRITICAL: Dampened AI enabled — provide strategic bullet points outlining the *angles* of attack, not the final script.`;
    }

    const res = await base44.integrations.Core.InvokeLLM({ prompt: promptText });
    setRebuttals(prev => [{ input: "Predicted opponent arguments (auto-generated from all project materials)", output: res, predicted: true }, ...prev]);
    setGenOppLoading(false);
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    await base44.entities.Project.update(id, { notes: note });
    queryClient.invalidateQueries({ queryKey: ['project', id] });
    setSavingNote(false);
    toast({ title: "Note saved!" });
  };

  useEffect(() => { if (project?.notes) setNote(project.notes || ""); }, [project]);

  const generateRebuttals = async () => {
    if (!rebuttalInput.trim() || rebuttalLoading) return;
    setRebuttalLoading(true);
    const context = contentions.slice(0, 5).map(c => `- ${c.title}: ${c.claim}`).join('\n');
    const activeAiMode = getActiveAiMode();
    
    let promptText = `You are an expert debater representing the ${project?.side || 'Affirmative'} side for the resolution "${project?.resolution || 'not set'}".
    
Your opponent just made the following arguments:
"""
${rebuttalInput}
"""

Our side's current contentions context:
${context || 'No contentions yet'}

Generate 2-3 strong, evidence-backed rebuttals to their arguments. Format as a clean list of concise, punchy rebuttals. Do NOT include pleasantries, just the rebuttals.`;

    if (conferenceContext) {
      promptText += `\n\n${conferenceContext}\nAlign rebuttals with the conference rules/context above.`;
    }

    if (activeAiMode === "dampened") {
      promptText += `\n\nCRITICAL: The user has Dampened AI enabled. 
- You MUST NOT write their exact rebuttal speeches for them. 
- INSTEAD, provide strategic bullet points outlining the *angles* they should attack.
- E.g. "Focus on how their evidence is outdated" or "Point out the logical flaw in their impact mechanism."
- Give them guidance, NOT the final script.`;
    }

    const res = await base44.integrations.Core.InvokeLLM({ prompt: promptText });
    setRebuttals(prev => [{ input: rebuttalInput, output: res }, ...prev]);
    setRebuttalInput("");
    setRebuttalLoading(false);
  };

  const toggleSelect = (cid) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(cid) ? next.delete(cid) : next.add(cid);
    return next;
  });

  if (projLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" /></div>;
  if (!project) return <div className="p-8 text-center"><p className="text-slate-400">Project not found.</p><Link to="/projects" className="text-primary hover:underline mt-2 block">← Back to Projects</Link></div>;

  // Side prep helpers
  const PRO_SIDES = ["government", "affirmative", "sponsor", "pro"];
  const isProSide = (c) => PRO_SIDES.includes((c.side || "").toLowerCase());
  const sideLabels = project?.format === "parliamentary" ? ["Gov (Prop)", "Opp"]
    : project?.format === "model_congress" ? ["Sponsor (Pro)", "Opposition (Con)"]
    : project?.format === "model_un" ? ["Affirmative", "Negative"]
    : ["Pro", "Con"];
  const sideFilteredContentions = sideFilter === "both"
    ? contentions
    : contentions.filter(c => isProSide(c) === (sideFilter === "pro"));
  const visibleGroups = sideFilter === "both"
    ? [[`${sideLabels[0]} Contentions`, contentions.filter(isProSide)], [`${sideLabels[1]} Contentions`, contentions.filter(c => !isProSide(c))]]
    : [[`${sideLabels[sideFilter === "pro" ? 0 : 1]} Contentions`, sideFilteredContentions]];

  // Speaking mode overlay
  if (speakingMode && sideFilteredContentions.length > 0) {
    return <ProjectSpeakingMode project={project} contentions={sideFilteredContentions} onClose={() => setSpeakingMode(false)} />;
  }

  const tabs = [
    { id: "contentions", icon: BookOpen, label: `Contentions (${contentions.length})` },
    { id: "flow", icon: ScrollText, label: "Flow" },
    { id: "jot", icon: PenLine, label: "Jot-Down" },
    { id: "speech", icon: Mic, label: "Speech" },
    { id: "rebuttals", icon: ShieldAlert, label: "Rebuttal Hub" },
    { id: "qna", icon: HelpCircle, label: "Q&A Prep" },
    { id: "techniques", icon: Wand2, label: "Techniques" },
    { id: "counter", icon: ShieldAlert, label: "Counter-Case" },
    { id: "feedback", icon: Lightbulb, label: "Feedback" },
    { id: "notes", icon: StickyNote, label: "Notes" },
    { id: "chat", icon: MessageSquare, label: "AI Chats" },
    { id: "agent", icon: Globe, label: "Research Agent" },
    { id: "collab", icon: Users, label: "Collab & Activity" },
    { id: "alldocs", icon: FileText, label: `All Docs (${otherDocs.length})` },
  ];

  return (
    <AnimatedPage>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/projects" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 font-heading truncate">{project.name}</h1>
          <div className="flex gap-2 items-center mt-0.5 flex-wrap">
            {project.format && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{project.format.replace(/_/g, ' ')}</span>}
            {project.resolution && <span className="text-xs text-slate-400 truncate max-w-xs">{project.resolution}</span>}
            {effectiveConference && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Globe className="w-3 h-3" />{effectiveConference.name}{!project.conferenceProfileId && projectFolder ? " (folder)" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {sideFilteredContentions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setSpeakingMode(true)} className="gap-1.5 text-xs hidden sm:flex">
              <Maximize2 className="w-3.5 h-3.5" /> Speaking Mode
            </Button>
          )}
          <ExportDocButton title={project.name} getMarkdown={() => projectToMarkdown(project, contentions, otherDocs)} label="Export Project" />
          <Button variant="outline" size="sm"
            onClick={() => archiveProject.mutate(!project.isArchived)}
            className="gap-1.5 text-xs hidden sm:flex">
            {project.isArchived ? <><ArchiveRestore className="w-3.5 h-3.5" /> Unarchive</> : <><Archive className="w-3.5 h-3.5" /> Archive</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { if (confirm("Delete this entire project?")) deleteProject.mutate(); }} className="gap-1.5 text-xs text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 hidden sm:flex">
            <Trash2 className="w-3.5 h-3.5" /> Delete Project
          </Button>
        </div>
      </div>

      {/* Archived banner */}
      {project.isArchived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-amber-800 text-sm">
          <Archive className="w-4 h-4 text-amber-500 shrink-0" />
          <span><strong>Archived project</strong> — this project is frozen. Unarchive to make edits or use the Research Agent.</span>
        </div>
      )}

      {/* One-time offer: make pre-existing single-sided projects cover both sides */}
      {!project.isArchived && (
        <BothSidesPrompt
          project={project}
          contentions={contentions}
          aiMode={getActiveAiMode()}
          conferenceContext={conferenceContext}
        />
      )}

      {/* Conference Rules/Context link */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800">Conference Rules/Context</div>
          <p className="text-xs text-slate-500">
            {projectFolder?.conferenceProfileId && !project.conferenceProfileId
              ? `Inherited from folder "${projectFolder.name}". Pick one here to override.`
              : "Link a saved conference profile so this project's AI tools follow those rules."}
          </p>
        </div>
        <div className="sm:w-64">
          <ConferenceLinkSelect value={project.conferenceProfileId || ""} onChange={(v) => linkConference.mutate(v)} label={null} />
        </div>
      </div>

      {/* Project Context: side, strict mode, sources */}
      <ProjectContextCard project={project} onUpdate={(field, value) => updateProject.mutate({ field, value })} />

      {/* Daily Suggestions */}
      <ProjectSuggestionsWidget projectId={id} />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] border-b border-slate-200 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors rounded-t-lg ${tab === t.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Flow tab */}
      {tab === "flow" && (
        <div className="space-y-4">
          <ProjectSpeechGenerator
            project={project}
            contentions={contentions}
            rebuttals={rebuttals}
            otherDocs={otherDocs}
            agentResults={agentResults}
            conferenceContext={conferenceContext}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] })}
          />
          <ProjectFlowTab
            project={project}
            contentions={contentions}
            rebuttals={rebuttals}
            otherDocs={otherDocs}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['project_contentions', id] })}
          />
        </div>
      )}

      {/* Jot-Down tab */}
      {tab === "jot" && (
        <ProjectJotDown project={project} contentions={sideFilteredContentions} />
      )}

      {/* Speech tab */}
      {tab === "speech" && (
        <ProjectSpeechGenerator
          project={project}
          contentions={contentions}
          rebuttals={rebuttals}
          otherDocs={otherDocs}
          agentResults={agentResults}
          conferenceContext={conferenceContext}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] })}
        />
      )}

      {/* Rebuttal Hub tab */}
      {tab === "rebuttals" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="font-bold text-slate-900 font-heading text-sm">Rebuttal Hub</h3>
                <p className="text-xs text-slate-500">Enter your opponent's arguments to generate real-time counter-arguments perfectly aligned with your side.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Textarea 
                value={rebuttalInput} 
                onChange={e => setRebuttalInput(e.target.value)} 
                placeholder="Opponent's arguments (e.g. 'They claim that universal healthcare will bankrupt the economy because...') " 
                rows={4} 
                className="resize-none text-sm bg-slate-50 border-slate-200" 
              />
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <Button onClick={generatePredictedRebuttals} disabled={genOppLoading || project?.isArchived} variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 text-sm">
                  {genOppLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {genOppLoading ? "Predicting..." : "Generate Opponent's Arguments"}
                </Button>
                <Button onClick={generateRebuttals} disabled={rebuttalLoading || !rebuttalInput.trim()} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm">
                  {rebuttalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Rebuttals
                </Button>
              </div>
              <p className="text-xs text-slate-400 -mt-2">Use "Generate Opponent's Arguments" to auto-predict counter-arguments from all your project materials, then get rebuttals to them.</p>
            </div>
          </div>

          <div className="space-y-4">
            {rebuttals.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-100 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Opponent Argued</div>
                  <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3">"{r.input}"</p>
                </div>
                <div className="p-5">
                  <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-3 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Your Rebuttals</div>
                  <ReactMarkdown className="prose prose-sm max-w-none prose-slate prose-p:leading-relaxed prose-li:my-1">{r.output}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contentions tab */}
      {tab === "contentions" && (
        <div className="space-y-4">
          {/* Judge-tailored views */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-wrap items-center gap-2">
            <button onClick={() => setActiveJudgeId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${!activeJudge ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              All contentions
            </button>
            {judgeProfiles.map(p => (
              <div key={p.id}
                className={`flex items-center rounded-xl border transition-colors ${activeJudge?.id === p.id ? "bg-primary border-primary text-primary-foreground" : "bg-white border-slate-200 text-slate-600"}`}>
                <button onClick={() => setActiveJudgeId(p.id)} className="pl-3 pr-1 py-1.5 text-xs font-semibold whitespace-nowrap">
                  Tailored to {p.judgeName}
                </button>
                <button onClick={() => confirm(`Delete the "${p.judgeName}" tailored tab?`) && deleteJudge.mutate(p.id)}
                  className="p-1.5 pr-2 opacity-60 hover:opacity-100" title="Delete this tab">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setJudgeDialogOpen(true)} disabled={project.isArchived}
              className="gap-1.5 text-xs ml-auto">
              <Gavel className="w-3.5 h-3.5" /> Customize to Judge
            </Button>
          </div>

          {activeJudge ? (
            <JudgeTailoredTab
              profile={activeJudge}
              project={project}
              contentions={contentions}
              onDeleted={() => setActiveJudgeId(null)}
            />
          ) : (
          <>
          {/* Contention Generator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button onClick={() => setShowGen(!showGen)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2 font-bold text-slate-900 font-heading text-sm">
                <Sparkles className="w-4 h-4 text-primary" /> Generate Contentions
              </span>
              {showGen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {showGen && (
              <div className="p-4 pt-0">
                <ProjectContentionGenerator
                  project={project}
                  contentions={contentions}
                  conferenceProfile={effectiveConference}
                  aiMode={getActiveAiMode()}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['project_contentions', id] })}
                />
              </div>
            )}
          </div>

          {/* Prepare for a side */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">Prepare for</span>
            {[
              { id: "pro", label: sideLabels[0] },
              { id: "opp", label: sideLabels[1] },
              { id: "both", label: "Both Sides" },
            ].map(opt => (
              <button key={opt.id} onClick={() => setSideFilter(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${sideFilter === opt.id ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                {opt.label}
              </button>
            ))}
            {sideFilteredContentions.length > 0 && (
              <span className="flex items-center gap-1.5 ml-auto">
                <QuickCopyDialog contentions={sideFilteredContentions} title={`Quick Copy: ${project.name}`} label="Quick Copy" />
                <ExportDocButton title={`${project.name} Contentions`} getMarkdown={() => projectToMarkdown({ name: project.name }, sideFilteredContentions, [])} label="Docs" />
              </span>
            )}
            <span className="text-xs text-slate-400">{sideFilteredContentions.length} contention{sideFilteredContentions.length !== 1 ? "s" : ""}</span>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
              <span className="text-sm text-blue-700 font-medium">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
                <Button size="sm" variant="destructive" onClick={deleteSelected} className="text-xs gap-1">
                  <Trash2 className="w-3 h-3" /> Delete Selected
                </Button>
              </div>
            </div>
          )}
          {contentions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No contentions in this project yet.</p>
              <Button variant="outline" size="sm" onClick={() => setShowGen(true)} className="mt-3 gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" /> Generate Contentions
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleGroups.map(([label, list]) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 font-heading text-sm">{label}</h3>
                    <span className="text-xs font-medium text-slate-400">({list.length})</span>
                  </div>
                  {list.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                      <p className="text-slate-400 text-xs">No contentions on this side yet. Generate some above.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {list.map(c => (
                        <div key={c.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${selectedIds.has(c.id) ? "border-primary ring-1 ring-primary/20" : "border-slate-200"}`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleSelect(c.id)} className="mt-0.5 shrink-0">
                              {selectedIds.has(c.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-bold text-slate-900 font-heading text-sm">{c.title}</h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {c.difficulty && <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFF_COLORS[c.difficulty] || "bg-slate-100 text-slate-600"}`}>{c.difficulty}</span>}
                                  <button onClick={() => deleteContention.mutate(c.id)} className="p-1 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {c.claim && <p className="text-xs text-slate-600 leading-relaxed mb-1"><span className="font-semibold text-slate-400">Claim:</span> {c.claim}</p>}
                              {c.impact && <p className="text-xs text-slate-500 leading-relaxed"><span className="font-semibold text-slate-400">Impact:</span> {c.impact}</p>}
                              {c.evidence?.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {c.evidence.map((ev, i) => (
                                    <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                      <p className="text-xs text-slate-700 leading-relaxed italic">"{ev.text}"</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="text-[11px] font-medium text-slate-500">— {ev.source}</span>
                                        {ev.sourceUrl && (
                                          <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline">
                                            <ExternalLink className="w-3 h-3" /> Source
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </div>
      )}

      {tab === "techniques" && (
        <TechniquesLibrary project={project} onApplied={() => queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] })} />
      )}
      {tab === "counter" && (
        <CounterCaseBuilder project={project} onSaved={() => queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] })} />
      )}

      {/* Q&A Prep tab */}
      {tab === "qna" && (
        <QnAPrepGenerator
          projectId={id}
          contentions={contentions}
          otherDocs={otherDocs}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] })}
        />
      )}

      {/* Feedback tab */}
      {tab === "feedback" && (
        <FeedbackGenerator
          project={project}
          documents={otherDocs}
          contentions={sideFilteredContentions}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] })}
        />
      )}

      {/* Notes tab */}
      {tab === "notes" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><StickyNote className="w-4 h-4 text-amber-500" /><h3 className="font-bold text-slate-900 font-heading">Project Notes</h3></div>
            <Button size="sm" onClick={saveNote} disabled={savingNote} className="text-xs">
              {savingNote ? "Saving..." : "Save Notes"}
            </Button>
          </div>
          <Textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add notes, strategy, research, reminders for this project..."
            rows={16} className="resize-none text-sm font-mono leading-relaxed" />
        </div>
      )}

      {/* Research Agent tab */}
      {tab === "agent" && (
        <div className="space-y-4">
          {project.isArchived ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-700">
              <Globe className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <p className="font-medium">Research Agent is disabled for archived projects.</p>
              <p className="text-sm mt-1">Unarchive this project to use the Research Agent.</p>
            </div>
          ) : (
            <ResearchAgent
              project={project}
              conferenceContext={conferenceContext}
              onResults={setAgentResults}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] })}
              onActivity={logActivity}
            />
          )}
        </div>
      )}

      {/* AI Chat tab */}
      {tab === "chat" && (
        <ProjectAIChats
          project={project}
          contentions={activeJudge ? activeJudge.tailoredContentions || [] : contentions}
          judgeProfile={activeJudge}
          conferenceContext={conferenceContext}
        />
      )}

      {/* Collab Tab */}
      {tab === "collab" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 font-heading flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-primary" /> Collaborators</h3>
            <div className="flex gap-2 mb-6">
              <Input placeholder="User ID / Friend Code" value={collabUserId} onChange={e=>setCollabUserId(e.target.value)} className="text-sm"/>
              <select value={collabRole} onChange={e=>setCollabRole(e.target.value)} className="border border-input rounded-md px-3 text-sm bg-white text-black [&>option]:text-black">
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="editor">Editor</option>
              </select>
              <Button size="sm" onClick={()=>addCollaborator.mutate()} disabled={addCollaborator.isPending || !collabUserId.trim()}>Invite</Button>
            </div>

            <div className="mb-6 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-700">Your Friend Code</div>
                <div className="text-lg font-bold text-primary font-heading tracking-wider">{myCode || "Generating..."}</div>
              </div>
              {myCode && <button onClick={() => { navigator.clipboard.writeText(myCode); toast({ title: "Friend code copied!" }); }} className="text-xs text-primary hover:underline shrink-0">Copy</button>}
            </div>
            
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Team</h4>
              {collaborators.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-medium text-sm text-slate-800">{c.userName}</span>
                  <span className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded capitalize">{c.role}</span>
                </div>
              ))}
              {collaborators.length === 0 && <p className="text-sm text-slate-500 italic">No collaborators yet. Add friends using their ID.</p>}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <h3 className="font-bold text-slate-900 font-heading flex items-center gap-2 mb-4 shrink-0"><Activity className="w-5 h-5 text-blue-500" /> Activity Log</h3>
            <div className="flex-1 overflow-y-auto space-y-4">
              {activityLog.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No activity recorded yet.</p>
              ) : activityLog.map(log => (
                <div key={log.id} className="relative pl-6 pb-2 border-l-2 border-slate-100 last:border-0 last:pb-0">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1"></div>
                  <div className="text-xs text-slate-400 mb-0.5">{new Date(log.created_date).toLocaleString()}</div>
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">{log.userName}</span>{' '}
                    <span className="text-slate-600">{log.action}</span>
                  </div>
                  {log.details && <div className="text-xs text-slate-500 mt-1">{log.details}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Docs tab */}
      {tab === "alldocs" && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-violet-500" />
              <h3 className="font-bold text-slate-900 font-heading text-sm">All Documents</h3>
            </div>
            <p className="text-xs text-slate-500">Every saved document in this project — research, speeches, and custom documents. Contentions live in their own tab.</p>
          </div>

          {/* Custom + research documents */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Custom & Research Documents ({otherDocs.length})</h4>
            {otherDocs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No documents yet — generate one below.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {otherDocs.map(doc => (
                  <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-violet-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <button onClick={() => setViewDoc(doc)} className="text-left min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 font-heading text-sm hover:text-primary transition-colors">{doc.title}</h4>
                        {doc.docLabel && <span className="inline-block text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium mt-1">{doc.docLabel}</span>}
                      </button>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => addContentionFromDoc.mutate(doc)} disabled={addContentionFromDoc.isPending} className="p-1.5 hover:bg-violet-50 rounded-lg text-slate-400 hover:text-violet-600 transition-colors disabled:opacity-50" title="Add as Contention">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => copyOtherDoc(doc.content)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteOtherDoc.mutate(doc.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{doc.content}</p>
                    <button onClick={() => setViewDoc(doc)} className="text-xs text-violet-600 font-medium mt-2 hover:underline">View full document →</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <OtherDocGenerator
            projectId={id}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['project_other_documents', id] })}
          />
        </div>
      )}

      <JudgeCustomizeDialog
        open={judgeDialogOpen}
        onOpenChange={setJudgeDialogOpen}
        project={project}
        contentions={contentions}
        onCreated={(p) => { setActiveJudgeId(p.id); setTab("contentions"); }}
      />

      {viewDoc && (
        <DocumentViewer
          doc={viewDoc}
          onClose={() => setViewDoc(null)}
          onAddContention={(doc) => addContentionFromDoc.mutate(doc)}
          onUpdate={(docId, data) => updateOtherDoc.mutateAsync({ docId, data })}
        />
      )}
    </div>
    </AnimatedPage>
  );
}