import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Folder, FolderPlus, Plus, Trash2, ArrowRight, Archive, ArchiveRestore, Landmark, ChevronDown, ChevronRight, Bot } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import ProjectSuggestionsWidget from "@/components/ProjectSuggestionsWidget";
import ConferenceLinkSelect from "@/components/ConferenceLinkSelect";
import AnimatedPage from "@/components/AnimatedPage";
import PullToRefresh from "@/components/PullToRefresh";

const FORMATS = [
  { v: "parliamentary", l: "Parliamentary" },
  { v: "public_forum", l: "Public Forum" },
  { v: "model_un", l: "Model UN" },
  { v: "model_congress", l: "Model Congress" },
];

const FORMAT_COLORS = {
  parliamentary: "bg-blue-100 text-blue-700",
  public_forum: "bg-indigo-100 text-indigo-700",
  model_un: "bg-teal-100 text-teal-700",
  model_congress: "bg-purple-100 text-purple-700",
};

function ProjectCard({ p, folders, conferenceProfiles, onArchive, onDelete }) {
  const folder = folders.find(f => f.id === p.folderId);
  const conf = conferenceProfiles.find(c => c.id === p.conferenceProfileId);
  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${p.isArchived ? "opacity-60 border-slate-300" : "border-slate-200"}`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Folder className="w-5 h-5 text-primary" />
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => { e.preventDefault(); onArchive(p); }}
              className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-300 hover:text-amber-500 transition-all" title={p.isArchived ? "Unarchive" : "Archive"}
            >
              {p.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); if (confirm("Delete this project?")) onDelete(p.id); }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <h3 className="font-bold text-slate-900 font-heading mb-1 truncate">{p.name}</h3>
        {p.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{p.description}</p>}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {p.format && <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${FORMAT_COLORS[p.format] || "bg-slate-100 text-slate-600"}`}>{p.format.replace(/_/g, ' ')}</span>}
          {folder && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Folder className="w-3 h-3" />{folder.name}</span>}
          {conf && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Landmark className="w-3 h-3" />{conf.name}</span>}
          {p.resolution && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full truncate max-w-[140px]">{p.resolution}</span>}
        </div>
      </div>
      <div className="px-5 pb-4">
        <Link to={`/projects/${p.id}`}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-primary text-slate-600 text-sm font-medium transition-all">
          Open Project <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function Projects() {
  const [showCreate, setShowCreate] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [form, setForm] = useState({ name: "", description: "", format: "", resolution: "", folderId: "", conferenceProfileId: "" });
  const [folderForm, setFolderForm] = useState({ name: "", description: "", conferenceProfileId: "" });
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });
  const { data: folders = [] } = useQuery({
    queryKey: ['project_folders'],
    queryFn: () => base44.entities.ProjectFolder.list('-created_date'),
  });
  const { data: conferenceProfiles = [] } = useQuery({
    queryKey: ['conference_profiles'],
    queryFn: () => base44.entities.ConferenceProfile.list('-created_date'),
  });

  const projects = allProjects.filter(p => !p.isArchived);
  const archivedProjects = allProjects.filter(p => p.isArchived);
  const visibleProjects = showArchived ? archivedProjects : projects;
  const unfiledProjects = visibleProjects.filter(p => !p.folderId || !folders.some(f => f.id === p.folderId));

  const createProject = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Project created!" });
      setShowCreate(false);
      setForm({ name: "", description: "", format: "", resolution: "", folderId: "", conferenceProfileId: "" });
    }
  });

  const createFolder = useMutation({
    mutationFn: (data) => base44.entities.ProjectFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_folders'] });
      toast({ title: "Folder created!" });
      setShowFolder(false);
      setFolderForm({ name: "", description: "", conferenceProfileId: "" });
    }
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId) => {
      // Un-file any projects in this folder, then delete the folder.
      const inFolder = allProjects.filter(p => p.folderId === folderId);
      await Promise.all(inFolder.map(p => base44.entities.Project.update(p.id, { folderId: "" })));
      return base44.entities.ProjectFolder.delete(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_folders'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Folder deleted (projects kept)" });
    }
  });

  const deleteProject = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); toast({ title: "Project deleted" }); }
  });

  const archiveProject = useMutation({
    mutationFn: ({ id, val }) => base44.entities.Project.update(id, { isArchived: val }),
    onSuccess: (_, { val }) => { queryClient.invalidateQueries({ queryKey: ['projects'] }); toast({ title: val ? "Project archived" : "Project unarchived" }); }
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
    await queryClient.invalidateQueries({ queryKey: ['project_folders'] });
  };

  const cardProps = {
    folders, conferenceProfiles,
    onArchive: (p) => archiveProject.mutate({ id: p.id, val: !p.isArchived }),
    onDelete: (id) => deleteProject.mutate(id),
  };

  return (
    <AnimatedPage>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 lg:pb-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">Organize your prep into folders and link conference rules</p>
        </div>
        <div className="flex gap-2">
          {archivedProjects.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)} className="gap-1.5 text-xs text-slate-900">
              <Archive className="w-3.5 h-3.5" />{showArchived ? "Hide Archived" : `Archived (${archivedProjects.length})`}
            </Button>
          )}
          <Button variant="outline" size="sm" asChild className="gap-1.5 text-slate-900">
            <Link to="/ai-archive"><Bot className="w-4 h-4" /> AI Archive</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFolder(true)} className="gap-1.5 text-slate-900">
            <FolderPlus className="w-4 h-4" /> New Folder
          </Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      </div>

      <ProjectSuggestionsWidget />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : visibleProjects.length === 0 && folders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Folder className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="font-bold text-slate-700 font-heading mb-2">No projects yet</h3>
          <p className="text-slate-400 text-sm mb-6">Create a project or a folder to organize your debate prep</p>
          <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Create First Project</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders */}
          {folders.map(folder => {
            const folderProjects = visibleProjects.filter(p => p.folderId === folder.id);
            const conf = conferenceProfiles.find(c => c.id === folder.conferenceProfileId);
            const collapsed = collapsedFolders[folder.id];
            return (
              <div key={folder.id} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCollapsedFolders(s => ({ ...s, [folder.id]: !collapsed }))} className="flex items-center gap-2 min-w-0">
                    {collapsed ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0"><Folder className="w-4 h-4 text-amber-600" /></div>
                    <div className="text-left min-w-0">
                      <h3 className="font-bold text-slate-900 font-heading truncate">{folder.name} <span className="text-slate-400 font-normal">({folderProjects.length})</span></h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {folder.description && <span className="text-xs text-slate-500 truncate max-w-[200px]">{folder.description}</span>}
                        {conf && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Landmark className="w-3 h-3" />{conf.name}</span>}
                      </div>
                    </div>
                  </button>
                  <button onClick={() => { if (confirm(`Delete folder "${folder.name}"? Projects inside will be kept and un-filed.`)) deleteFolder.mutate(folder.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {!collapsed && (
                  folderProjects.length === 0 ? (
                    <p className="text-sm text-slate-400 px-2 py-4">No projects in this folder yet. Create one and choose this folder.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {folderProjects.map(p => <ProjectCard key={p.id} p={p} {...cardProps} />)}
                    </div>
                  )
                )}
              </div>
            );
          })}

          {/* Unfiled projects */}
          {unfiledProjects.length > 0 && (
            <div>
              {folders.length > 0 && <h3 className="text-sm font-semibold text-slate-500 mb-3 px-1">Not in a folder</h3>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unfiledProjects.map(p => <ProjectCard key={p.id} p={p} {...cardProps} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Project dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Project name *" autoFocus />
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description (optional)" rows={2} className="resize-none text-sm" />
            <Select value={form.format} onValueChange={v => setForm({...form, format: v})}>
              <SelectTrigger><SelectValue placeholder="Format (optional)" /></SelectTrigger>
              <SelectContent>{FORMATS.map(f => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={form.resolution} onChange={e => setForm({...form, resolution: e.target.value})} placeholder="Resolution (optional)" />
            {folders.length > 0 && (
              <Select value={form.folderId || "__none__"} onValueChange={v => setForm({...form, folderId: v === "__none__" ? "" : v})}>
                <SelectTrigger><SelectValue placeholder="Folder (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No folder</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <ConferenceLinkSelect value={form.conferenceProfileId} onChange={v => setForm({...form, conferenceProfileId: v})} label="Conference Rules/Context (optional)" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!form.name.trim() || createProject.isPending}
                onClick={() => createProject.mutate({ ownerUserId: user?.id, name: form.name, description: form.description, format: form.format || undefined, resolution: form.resolution, folderId: form.folderId || undefined, conferenceProfileId: form.conferenceProfileId || undefined })}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder dialog */}
      <Dialog open={showFolder} onOpenChange={setShowFolder}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Project Folder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={folderForm.name} onChange={e => setFolderForm({...folderForm, name: e.target.value})} placeholder="Folder name *" autoFocus />
            <Textarea value={folderForm.description} onChange={e => setFolderForm({...folderForm, description: e.target.value})} placeholder="Description (optional)" rows={2} className="resize-none text-sm" />
            <ConferenceLinkSelect value={folderForm.conferenceProfileId} onChange={v => setFolderForm({...folderForm, conferenceProfileId: v})} label="Conference Rules/Context for this folder (optional)" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowFolder(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!folderForm.name.trim() || createFolder.isPending}
                onClick={() => createFolder.mutate({ ownerUserId: user?.id, name: folderForm.name, description: folderForm.description, conferenceProfileId: folderForm.conferenceProfileId || undefined })}>
                {createFolder.isPending ? "Creating..." : "Create Folder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </PullToRefresh>
    </AnimatedPage>
  );
}