import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Lightbulb, Check, X, Loader2, FileEdit, Sparkles, CheckCheck, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const MAX_QUEUE = 10;

/**
 * AI Coach suggestion queue.
 * - With projectId (project page): shows this project's pending suggestions + on-demand generation.
 * - Without projectId (dashboard): shows the user's full pending queue, capped at 10.
 */
export default function ProjectSuggestionsWidget({ projectId }) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [generating, setGenerating] = useState(false);
    const [applyingId, setApplyingId] = useState(null);
    const [bulk, setBulk] = useState(null);
    const [bulkProgress, setBulkProgress] = useState("");

    const { data: suggestions = [], isLoading } = useQuery({
        queryKey: ['project_suggestions', projectId || 'all'],
        queryFn: () => projectId
            ? base44.entities.ProjectSuggestion.filter({ status: 'pending', projectId })
            : base44.entities.ProjectSuggestion.filter({ status: 'pending' }),
        refetchInterval: 30000
    });

    const { data: profile } = useQuery({
        queryKey: ['coach_pref', user?.id],
        queryFn: async () => {
            const byOwner = await base44.entities.UserProfile.filter({ ownerUserId: user.id });
            const list = Array.isArray(byOwner) ? byOwner : (byOwner?.items || []);
            return list[0] || null;
        },
        enabled: !!user?.id,
    });

    const autoEnabled = profile ? profile.coachSuggestionsEnabled !== false : true;

    const toggleAuto = async (value) => {
        if (!user?.id) return;
        if (profile) await base44.entities.UserProfile.update(profile.id, { coachSuggestionsEnabled: value });
        else await base44.entities.UserProfile.create({ ownerUserId: user.id, ownerEmail: user.email, coachSuggestionsEnabled: value });
        queryClient.invalidateQueries({ queryKey: ['coach_pref'] });
        toast.success(value ? "Automatic coach suggestions on" : "Automatic coach suggestions off");
    };

    const queue = suggestions.slice(0, MAX_QUEUE);

    const rejectSuggestion = useMutation({
        mutationFn: ({ id }) => base44.entities.ProjectSuggestion.update(id, { status: 'rejected' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_suggestions'] })
    });

    const applySuggestion = async (s) => {
        if (applyingId) return;
        setApplyingId(s.id);
        try {
            const res = await base44.functions.invoke("applyProjectSuggestion", { suggestionId: s.id });
            const data = res?.data ?? res;
            if (data?.error) throw new Error(data.error);
            toast.success("Suggestion applied! The written implementation is saved in your project's All Docs tab.");
            queryClient.invalidateQueries({ queryKey: ['project_suggestions'] });
            queryClient.invalidateQueries({ queryKey: ['project_other_documents'] });
            queryClient.invalidateQueries({ queryKey: ['other_documents'] });
        } catch (e) {
            toast.error(e.message || "Failed to apply suggestion");
        } finally {
            setApplyingId(null);
        }
    };

    const acceptAll = async () => {
        if (bulk || applyingId) return;
        setBulk('apply');
        let done = 0;
        for (let i = 0; i < queue.length; i++) {
            setBulkProgress(`${i + 1}/${queue.length}`);
            try {
                const res = await base44.functions.invoke("applyProjectSuggestion", { suggestionId: queue[i].id });
                const data = res?.data ?? res;
                if (!data?.error) done++;
            } catch {
                // keep going; report the total at the end
            }
        }
        queryClient.invalidateQueries({ queryKey: ['project_suggestions'] });
        queryClient.invalidateQueries({ queryKey: ['project_other_documents'] });
        queryClient.invalidateQueries({ queryKey: ['other_documents'] });
        toast.success(`${done} of ${queue.length} suggestions applied`);
        setBulk(null);
        setBulkProgress("");
    };

    const clearAll = async () => {
        if (bulk) return;
        setBulk('clear');
        await Promise.all(queue.map(s => base44.entities.ProjectSuggestion.update(s.id, { status: 'rejected' })));
        queryClient.invalidateQueries({ queryKey: ['project_suggestions'] });
        toast.success(`Cleared ${queue.length} suggestion${queue.length === 1 ? '' : 's'}`);
        setBulk(null);
    };

    const generateOnDemand = async () => {
        if (generating) return;
        setGenerating(true);
        try {
            const res = await base44.functions.invoke("generateProjectSuggestions", { projectId });
            const data = res?.data ?? res;
            if (data?.message) toast.info(data.message);
            else if (data?.processed > 0) toast.success(`${data.processed} suggestion${data.processed !== 1 ? 's' : ''} generated!`);
            else toast.info("No new suggestions generated.");
            queryClient.invalidateQueries({ queryKey: ['project_suggestions'] });
        } catch (e) {
            toast.error(e.message || "Failed to generate suggestions");
        } finally {
            setGenerating(false);
        }
    };

    if (isLoading) return null;
    // Dashboard: hide entirely when the queue is empty (unchanged behavior)
    if (!projectId && queue.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <Lightbulb className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-amber-900 font-heading">AI Coach Suggestions</h3>
                {queue.length > 0 && (
                    <span className="bg-amber-200 text-amber-800 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">{queue.length}/{MAX_QUEUE} in queue</span>
                )}
                {projectId && (
                    <Button size="sm" onClick={generateOnDemand} disabled={generating} className="ml-auto gap-1.5 bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs shrink-0">
                        {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {generating ? "Generating..." : "Generate Suggestions"}
                    </Button>
                )}
            </div>

            <div className="flex items-center justify-between gap-3 bg-white/60 border border-amber-100 rounded-xl px-3 py-2 mb-3 relative z-10">
                <div>
                    <p className="text-xs font-semibold text-amber-900">Automatic suggestions</p>
                    <p className="text-[11px] text-amber-800/70">Daily coach recommendations. Off means none are created for you.</p>
                </div>
                <Switch checked={autoEnabled} onCheckedChange={toggleAuto} />
            </div>

            {queue.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 relative z-10">
                    <Button size="sm" onClick={acceptAll} disabled={!!bulk || !!applyingId} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs">
                        {bulk === 'apply' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                        {bulk === 'apply' ? `Applying ${bulkProgress}...` : "Accept all"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAll} disabled={!!bulk || !!applyingId} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs">
                        {bulk === 'clear' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5" />}
                        Clear all
                    </Button>
                </div>
            )}

            {queue.length === 0 ? (
                <p className="text-xs text-amber-800/70 relative z-10">
                    No pending suggestions for this project. Click "Generate Suggestions" to get fresh AI coaching advice on demand.
                </p>
            ) : (
                <div className="space-y-3 relative z-10">
                    {queue.map(s => (
                        <div key={s.id} className="bg-white/80 backdrop-blur border border-amber-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-white transition-colors">
                            <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                                    <span className="text-xs font-semibold text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-md">{s.projectName}</span>
                                    {s.technique && (
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">{s.technique}</span>
                                    )}
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm mb-1">{s.title}</h4>
                                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{s.description}</p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                                <Button variant="outline" size="sm" onClick={() => rejectSuggestion.mutate({ id: s.id })} disabled={!!bulk} className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs">
                                    <X className="w-3.5 h-3.5 mr-1" /> Dismiss
                                </Button>
                                <Button size="sm" onClick={() => applySuggestion(s)} disabled={applyingId === s.id || !!bulk} className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs">
                                    {applyingId === s.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />} {applyingId === s.id ? "Applying..." : "Apply"}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}