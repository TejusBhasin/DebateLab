import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, MessageSquare, ChevronLeft, Plus, Brain, Globe, Trash2, FileDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";
import { MUN_GUIDE_SUMMARY } from "@/lib/munGuide";
import AIChatContentionActions from "@/components/AIChatContentionActions";

const EDITOR_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["create", "update", "delete"] },
          contentionId: { type: "string" },
          reason: { type: "string" },
          title: { type: "string" },
          side: { type: "string" },
          claim: { type: "string" },
          warrant: { type: "string" },
          impact: { type: "string" },
          changes: {
            type: "object",
            properties: {
              title: { type: "string" },
              side: { type: "string" },
              claim: { type: "string" },
              warrant: { type: "string" },
              impact: { type: "string" },
              strategicNotes: { type: "string" },
            },
          },
        },
        required: ["type"],
      },
    },
  },
  required: ["reply", "actions"],
};

const parseActions = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function ProjectAIChats({ project, contentions, conferenceContext = "" }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['project_chat_sessions', project.id],
    queryFn: () => base44.entities.AIChatSession.filter({ projectId: project.id }, '-created_date', 50)
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chat_messages', sessionId],
    queryFn: () => sessionId ? base44.entities.AIChatMessage.filter({ sessionId }, 'created_date', 100) : [],
    enabled: !!sessionId
  });

  const createSession = useMutation({
    mutationFn: async ({ title, feature }) => {
      return await base44.entities.AIChatSession.create({ ownerUserId: user?.id, title, feature, projectId: project.id });
    },
    onSuccess: (newSession) => {
      setSessionId(newSession.id);
      queryClient.invalidateQueries({ queryKey: ['project_chat_sessions', project.id] });
    }
  });

  const createMessage = useMutation({
    mutationFn: async (msg) => await base44.entities.AIChatMessage.create({ ...msg, ownerUserId: user?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat_messages', sessionId] })
  });

  const deleteSession = useMutation({
    mutationFn: async (id) => await base44.entities.AIChatSession.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['project_chat_sessions', project.id] });
      if (sessionId === deletedId) setSessionId("");
    }
  });

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || !sessionId) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    await createMessage.mutateAsync({ sessionId, role: "user", content: userMsg });

    const currentMessages = await base44.entities.AIChatMessage.filter({ sessionId }, 'created_date', 100);
    const session = sessions.find(s => s.id === sessionId);

    try {
      let promptText = "";
      if (session?.feature === 'coach') {
        const context = contentions.slice(0, 5).map(c => `- ${c.title}: ${c.claim}`).join('\n');
        promptText = `You are a debate coach for the project "${project.name}" (${project.format?.replace(/_/g, ' ') || 'debate'}).
Project resolution: ${project.resolution || 'not set'}. Side: ${project.side || 'not set'}.
Key contentions in this project:
${context || 'No contentions yet'}
Conversation history:
${currentMessages.map(m => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`).join('\n')}
Provide specific, actionable coaching advice.`;
        if (project.format === 'model_un') {
          promptText += `\n\nYou are coaching a Model UN delegate. Use this MUN mastery framework to ground your advice:\n\n${MUN_GUIDE_SUMMARY}`;
        }
        if (conferenceContext) promptText += `\n\n${conferenceContext}\nFollow the conference rules/context above.`;
      } else if (session?.feature === 'editor') {
        const list = contentions
          .map((c) => `id=${c.id} | side=${c.side || "unset"} | ${c.title} :: claim: ${(c.claim || "").slice(0, 180)} :: warrant: ${(c.warrant || "").slice(0, 180)} :: impact: ${(c.impact || "").slice(0, 180)}`)
          .join('\n');
        promptText = `You are the AI editor inside the debate project "${project.name}" (${project.format?.replace(/_/g, ' ') || 'debate'}).
Resolution/motion: ${project.resolution || 'not set'}. Our side: ${project.side || 'not set'}.
The student sees these contentions in the Contentions tab, and you can change that list directly through the "actions" you return.

Current contentions (use these exact ids):
${list || '(none yet)'}

Conversation so far:
${currentMessages.map(m => `${m.role === 'user' ? 'Student' : 'Editor'}: ${m.content}`).join('\n')}

Return:
- reply: a short conversational answer in markdown. Say what you changed and why. Never paste a whole rewritten contention into the reply — the app applies your actions to the list, so the text field is only for explanation and advice.
- actions: the exact changes to make. type "update" needs contentionId plus changes {title, claim, warrant, impact, side, strategicNotes}; type "delete" needs contentionId; type "create" needs title, claim, warrant, impact, side. Use only ids from the list above. Return an empty array when the student only asked a question.

Rules of a good editor: keep the student's voice, one contention per distinct argument, claim/warrant/impact all present, and explain each edit in one short line in "reason".`;
        if (conferenceContext) promptText += `\n\n${conferenceContext}\nFollow the conference rules/context above.`;
      } else {
        const context = [project.resolution, project.format, project.side].filter(Boolean).join(', ');
        promptText = `You are an AI assistant for the project "${project.name}". Context: ${context}.
History:
${currentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}
User: ${userMsg}
Provide a helpful, accurate response.`;
        if (conferenceContext) promptText += `\n\n${conferenceContext}\nFollow the conference rules/context above.`;
      }

      if (session?.feature === 'editor') {
        const res = await base44.integrations.Core.InvokeLLM({ prompt: promptText, response_json_schema: EDITOR_SCHEMA });
        const actions = Array.isArray(res?.actions) ? res.actions : [];
        await createMessage.mutateAsync({
          sessionId,
          role: "assistant",
          content: res?.reply || "I couldn't put a reply together — try rephrasing that.",
          contentionActions: actions.length ? JSON.stringify(actions) : "",
          actionStatus: "pending",
        });
      } else {
        const res = await base44.integrations.Core.InvokeLLM({ prompt: promptText });
        await createMessage.mutateAsync({ sessionId, role: "assistant", content: res });
      }
    } catch (e) {
      console.error(e);
    }
    setChatLoading(false);
  };

  const saveTranscript = async () => {
    if (messages.length === 0) return;
    const transcript = messages.map(m => `**${m.role === 'user' ? 'Student' : 'Coach'}:**\n\n${m.content}`).join('\n\n---\n\n');
    const content = `# Chat Transcript: ${currentSession?.title || 'AI Chat'}\n\nProject: ${project.name}\nDate: ${new Date().toLocaleString()}\n\n---\n\n${transcript}`;
    await base44.entities.OtherDocument.create({
      ownerUserId: user?.id,
      title: `${currentSession?.title || 'AI Chat'} — Transcript`,
      docLabel: "Chat Transcript",
      description: `Saved transcript from the AI Chats tab of "${project.name}".`,
      content,
      projectId: project.id,
    });
    queryClient.invalidateQueries({ queryKey: ['project_other_documents', project.id] });
    queryClient.invalidateQueries({ queryKey: ['other_documents'] });
    toast({ title: "Chat saved as a document!" });
  };

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages, chatLoading]);

  const startNewChat = async (feature, defaultTitle) => {
    await createSession.mutateAsync({ title: defaultTitle, feature });
  };

  if (!sessionId) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 font-heading text-lg mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> AI Chats
        </h3>
        
        <div className="flex gap-3 mb-6">
          <Button onClick={() => startNewChat("coach", "Coach Chat")} variant="outline" className="gap-2 flex-1">
            <Brain className="w-4 h-4 text-blue-500"/> New Coach Chat
          </Button>
          <Button onClick={() => startNewChat("editor", "AI Editor Chat")} variant="outline" className="gap-2 flex-1">
            <Sparkles className="w-4 h-4 text-violet-500"/> New Editor Chat
          </Button>
        </div>

        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSessionId(s.id)}>
              <div className="flex items-center gap-3">
                {s.feature === 'coach' ? <Brain className="w-5 h-5 text-blue-500"/> : s.feature === 'editor' ? <Sparkles className="w-5 h-5 text-violet-500"/> : <Globe className="w-5 h-5 text-teal-500"/>}
                <div>
                  <div className="font-medium text-slate-800 text-sm">{s.title}</div>
                  <div className="text-xs text-slate-400">{new Date(s.created_date).toLocaleDateString()}</div>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteSession.mutate(s.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-center text-slate-400 text-sm italic py-8">No AI chats for this project yet. Start one above!</p>}
        </div>
      </div>
    );
  }

  const currentSession = sessions.find(s => s.id === sessionId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
        <button onClick={() => setSessionId("")} className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 shadow-sm">
          <ChevronLeft className="w-4 h-4 text-slate-500"/>
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 font-heading text-sm flex items-center gap-2 truncate">
            {currentSession?.feature === 'coach' ? <Brain className="w-4 h-4 text-blue-500"/> : <Sparkles className="w-4 h-4 text-violet-500"/>}
            {currentSession?.title || "Chat"}
          </h3>
          <p className="text-xs text-slate-400 truncate">Tailored to "{project.name}"</p>
        </div>
        <Button variant="outline" size="sm" onClick={saveTranscript} disabled={messages.length === 0} className="gap-1.5 text-xs shrink-0">
          <FileDown className="w-3.5 h-3.5" /> Save as Doc
        </Button>
      </div>
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-200" />
            Send a message to start the conversation...
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id || i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-[15px] ${m.role === "user" ? "bg-primary text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"}`}>
              {m.role === "assistant" ? (
                <>
                  <ReactMarkdown className="prose prose-sm max-w-none prose-slate [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{m.content}</ReactMarkdown>
                  {m.contentionActions && (
                    <AIChatContentionActions
                      message={m}
                      actions={parseActions(m.contentionActions)}
                      project={project}
                      contentions={contentions}
                      onApplied={() => queryClient.invalidateQueries({ queryKey: ['chat_messages', sessionId] })}
                    />
                  )}
                </>
              ) : m.content}
            </div>
          </div>
        ))}
        {chatLoading && <div className="flex justify-start"><div className="bg-slate-100 rounded-2xl px-5 py-3 text-sm text-slate-400 rounded-tl-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</div></div>}
      </div>
      <div className="p-4 border-t border-slate-100 flex gap-2">
        <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
          placeholder="Type your message..." className="text-[15px] h-10 rounded-xl" />
        <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="h-10 px-6 rounded-xl font-medium">Send</Button>
      </div>
    </div>
  );
}