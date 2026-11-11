import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Target, BookOpen, Trophy, Brain, Settings, CheckCircle, Shield, Trash2, AlertTriangle, LogOut, Moon, Sun, Palette, PlayCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import AdminPanel from "@/components/AdminPanel";
import ContactForm from "@/components/ContactForm";
import MUNKnowledgeHub from "@/components/MUNKnowledgeHub";
import AppStoreBadge from "@/components/AppStoreBadge";
import { appConfig } from "@/lib/app-config";
import { isNativeApp } from "@/lib/platform";
import { setUnMode, stripModel } from "@/lib/un-mode";

const FORMATS = ["Parliamentary Debate", "Public Forum", "Model UN", "Model Congress"];
const LEVELS = ["new", "beginner", "intermediate", "advanced"];
const GRADES = ["6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade", "Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"];

export default function ProfilePage() {
  const [form, setForm] = useState({ 
    displayName: "", 
    school: "", 
    gradeLevel: "", 
    preferredFormat: "", 
    skillLevel: "intermediate", 
    bio: "", 
    learnTabEnabled: true, 
    defaultAiMode: "full",
    defaultMinKeyFacts: 3,
    defaultMinLogicPoints: 3,
    defaultMinContentions: 2,
    delegateOfUN: false,
    coachSuggestionsEnabled: true
  });
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [themeMode, setThemeMode] = useState(localStorage.getItem('theme_mode') || 'light');
  const [customColors, setCustomColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('custom_colors') || '{}'); } catch { return {}; }
  });

  useEffect(() => { base44.auth.me().then(u => setCurrentUser(u)).catch(() => {}); }, []);

  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('theme_mode', mode);
    window.dispatchEvent(new Event('theme-changed'));
  };

  const handleColorChange = (key, value) => {
    const next = { ...customColors, [key]: value };
    setCustomColors(next);
    localStorage.setItem('custom_colors', JSON.stringify(next));
    window.dispatchEvent(new Event('theme-changed'));
  };

  const handleResetColors = () => {
    setCustomColors({});
    localStorage.removeItem('custom_colors');
    window.dispatchEvent(new Event('theme-changed'));
  };

  const handleRetakeTour = () => {
    localStorage.removeItem("debatelab_tour_seen");
    window.location.href = "/home";
  };

  const { data: profiles = [] } = useQuery({ 
    queryKey: ['userProfile', currentUser?.id, currentUser?.email], 
    queryFn: async () => {
      if (!currentUser) return [];
      // Try by userId first, then by email, then by created_by_id — ensures we
      // always find the latest profile record linked to this signed-in user.
      let results = await base44.entities.UserProfile.filter({ ownerUserId: currentUser.id });
      if (results.length === 0 && currentUser.email) {
        results = await base44.entities.UserProfile.filter({ ownerEmail: currentUser.email });
      }
      if (results.length === 0) {
        results = await base44.entities.UserProfile.filter({ created_by_id: currentUser.id });
      }
      return results;
    },
    enabled: !!currentUser,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });
  const { data: sessions = [] } = useQuery({ queryKey: ['practice_sessions'], queryFn: () => base44.entities.PracticeSession.list('-created_date', 100) });
  const { data: contentions = [] } = useQuery({ queryKey: ['contentions'], queryFn: () => base44.entities.Contention.list() });
  const { data: tournaments = [] } = useQuery({ queryKey: ['tournaments'], queryFn: () => base44.entities.Tournament.list() });

  const profile = profiles && profiles.length > 0 ? profiles[0] : null;

  const profileLoadedRef = useRef(false);

  useEffect(() => {
    if (profile) {
      profileLoadedRef.current = true;
      setForm({
        displayName: profile.displayName || "",
        school: profile.school || "",
        gradeLevel: profile.gradeLevel || "",
        preferredFormat: profile.preferredFormat || "",
        skillLevel: profile.skillLevel || "intermediate",
        bio: profile.bio || "",
        learnTabEnabled: profile.learnTabEnabled !== false,
        defaultAiMode: profile.defaultAiMode || "full",
        defaultMinKeyFacts: profile.defaultMinKeyFacts ?? 3,
        defaultMinLogicPoints: profile.defaultMinLogicPoints ?? 3,
        defaultMinContentions: profile.defaultMinContentions ?? 2,
        delegateOfUN: profile.delegateOfUN === true,
        coachSuggestionsEnabled: profile.coachSuggestionsEnabled !== false
      });
      if (profile.themeMode) {
        setThemeMode(profile.themeMode);
        localStorage.setItem('theme_mode', profile.themeMode);
      }
      if (profile.customColors) {
        setCustomColors(profile.customColors);
        localStorage.setItem('custom_colors', JSON.stringify(profile.customColors));
      }
      localStorage.setItem('un_mode', profile.delegateOfUN === true ? 'true' : 'false');
      window.dispatchEvent(new Event('un-mode-changed'));
      window.dispatchEvent(new Event('theme-changed'));
    } else if (currentUser) {
      // No existing profile found — mark as loaded so autosave can create one.
      profileLoadedRef.current = true;
    }
  }, [profile, currentUser]);

  const save = useMutation({
    mutationFn: async (data) => {
      const user = currentUser || await base44.auth.me();
      const payload = { ...data, ownerUserId: user.id, ownerEmail: user.email || "", themeMode, customColors };
      // Always re-check for an existing profile right before saving so we update
      // (and never create duplicates) — this keeps data consistent across devices.
      let existing = await base44.entities.UserProfile.filter({ ownerUserId: user.id });
      if (existing.length === 0 && user.email) {
        existing = await base44.entities.UserProfile.filter({ ownerEmail: user.email });
      }
      if (existing.length === 0) {
        existing = await base44.entities.UserProfile.filter({ created_by_id: user.id });
      }
      if (existing.length > 0) {
        return base44.entities.UserProfile.update(existing[0].id, payload);
      }
      return base44.entities.UserProfile.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      toast({ title: "Couldn't save profile. Please try again.", variant: "destructive" });
    }
  });

  const wins = (sessions || []).filter(s => s?.winner === 'user').length;
  const losses = (sessions || []).filter(s => s?.winner === 'ai').length;
  const winRate = (sessions || []).length > 0 ? Math.round((wins / sessions.length) * 100) : 0;

  const levelColors = { beginner: "bg-green-100 text-green-700", intermediate: "bg-blue-100 text-blue-700", advanced: "bg-purple-100 text-purple-700", expert: "bg-red-100 text-red-600" };

  const isAdmin = currentUser?.role === "admin";

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try {
      // Delete user profile data
      if (profile) await base44.entities.UserProfile.delete(profile.id);
      // Log out and redirect
      base44.auth.redirectToLogin();
    } catch {
      toast({ title: "Error deleting account. Please contact support.", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-8 mb-8 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">{form.displayName || "Your Profile"}</h1>
            <p className="text-slate-300">{form.school || "No school set"} {form.gradeLevel ? `· ${form.gradeLevel}` : ""}</p>
            {form.skillLevel && <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full mt-1 inline-block capitalize ${levelColors[form.skillLevel] || 'bg-slate-100 text-slate-700'}`}>{form.skillLevel}</span>}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-6 shadow-sm overflow-x-auto">
        <button onClick={() => setActiveSection("profile")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${activeSection === "profile" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}>
          <Settings className="w-3.5 h-3.5" /> Profile
        </button>
        <button onClick={() => setActiveSection("theme")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${activeSection === "theme" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}>
          <Palette className="w-3.5 h-3.5" /> Theme & UI
        </button>
        {isAdmin && (
          <button onClick={() => setActiveSection("admin")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${activeSection === "admin" ? "bg-red-600 text-white" : "text-red-600 hover:bg-red-50"}`}>
            <Shield className="w-3.5 h-3.5" /> Admin Panel
          </button>
        )}
      </div>

      {activeSection === "admin" && isAdmin && (
        <div className="mb-6"><AdminPanel /></div>
      )}
      
      {activeSection === "theme" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-900 font-heading">Theme & UI Settings</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-3 block">Color Mode</label>
              <div className="flex gap-3">
                <Button variant={themeMode === 'light' ? 'default' : 'outline'} onClick={() => handleThemeChange('light')} className="flex-1 gap-2">
                  <Sun className="w-4 h-4" /> Light Mode
                </Button>
                <Button variant={themeMode === 'dark' ? 'default' : 'outline'} onClick={() => handleThemeChange('dark')} className="flex-1 gap-2">
                  <Moon className="w-4 h-4" /> Dark Mode
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="text-sm font-medium text-slate-700 mb-3 block">Custom Colors</label>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Primary</span>
                  <input type="color" value={customColors.primary || '#3b82f6'} onChange={(e) => handleColorChange('primary', e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Secondary</span>
                  <input type="color" value={customColors.secondary || '#eff6ff'} onChange={(e) => handleColorChange('secondary', e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Accent</span>
                  <input type="color" value={customColors.accent || '#dbeafe'} onChange={(e) => handleColorChange('accent', e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetColors} className="text-xs">Reset to Defaults</Button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "profile" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-900 font-heading">Profile Settings</h3>
              </div>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Display Name</label>
                    <Input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">School / Program</label>
                    <Input value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} placeholder="School or debate program" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Grade / Year</label>
                    <select value={form.gradeLevel} onChange={e => setForm({ ...form, gradeLevel: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none [&>option]:text-black">
                      <option value="" disabled>Select grade</option>
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Skill Level</label>
                    <select value={form.skillLevel} onChange={e => setForm({ ...form, skillLevel: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none capitalize [&>option]:text-black">
                      {LEVELS.map(l => <option key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Preferred Format</label>
                  <select value={form.preferredFormat} onChange={e => setForm({ ...form, preferredFormat: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none [&>option]:text-black">
                    <option value="" disabled>Select your main format</option>
                    {FORMATS.map(f => <option key={f} value={f}>{stripModel(f)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Bio / Goals</label>
                  <Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Your debate goals, experience, or anything you'd like to note..." rows={3} className="resize-none text-sm" />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">App Preferences</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Show Learn Tab</div>
                        <div className="text-xs text-slate-500">Enable the personalized learning course</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={form.learnTabEnabled}
                          onChange={(e) => setForm({ ...form, learnTabEnabled: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Automatic Coach Suggestions</div>
                        <div className="text-xs text-slate-500">Daily AI coaching recommendations for your projects. Off means none are created automatically.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={form.coachSuggestionsEnabled !== false}
                          onChange={(e) => setForm({ ...form, coachSuggestionsEnabled: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-sm font-semibold text-slate-900 mb-2">Global AI Preference</div>
                      <select 
                        value={form.defaultAiMode} 
                        onChange={e => setForm({ ...form, defaultAiMode: e.target.value })} 
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none [&>option]:text-black"
                      >
                        <option value="full">Full AI Assistance</option>
                        <option value="dampened">Dampened AI (Guidance Only)</option>
                      </select>
                      <div className="text-xs text-slate-500 mt-2">
                        {form.defaultAiMode === 'full' 
                          ? "AI will generate complete speeches and arguments for you." 
                          : "AI acts as a guide, providing outlines and evidence instead of writing for you."}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Delegate of the UN</div>
                        <div className="text-xs text-slate-500">Removes the word "Model" from all references on your account</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={!!form.delegateOfUN}
                          onChange={(e) => { setForm({ ...form, delegateOfUN: e.target.checked }); setUnMode(e.target.checked); }}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Research Agent Defaults</h4>
                  <p className="text-xs text-slate-500 mb-3">Default minimums for AI research generation (max 50 each). Used whenever you run the Research Agent in a project.</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Min key facts/stats</label>
                      <input type="number" min={1} max={50} value={form.defaultMinKeyFacts} onChange={e => setForm({ ...form, defaultMinKeyFacts: Math.min(50, Math.max(1, +e.target.value || 1)) })} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm text-black shadow-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Min logic points</label>
                      <input type="number" min={1} max={50} value={form.defaultMinLogicPoints} onChange={e => setForm({ ...form, defaultMinLogicPoints: Math.min(50, Math.max(1, +e.target.value || 1)) })} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm text-black shadow-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Min contentions</label>
                      <input type="number" min={1} max={50} value={form.defaultMinContentions} onChange={e => setForm({ ...form, defaultMinContentions: Math.min(50, Math.max(1, +e.target.value || 1)) })} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm text-black shadow-sm" />
                    </div>
                  </div>
                </div>

                <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="w-full gap-2">
                  {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Saved!" : "Save Profile"}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 font-heading text-sm mb-4">Your Stats</h3>
              <div className="space-y-3">
                {[
                  { icon: Target, label: "Practice Sessions", value: (sessions || []).length, color: "text-blue-600" },
                  { icon: BookOpen, label: "Contentions Saved", value: (contentions || []).length, color: "text-indigo-600" },
                  { icon: Trophy, label: "Tournaments", value: (tournaments || []).length, color: "text-amber-600" },
                  { icon: Brain, label: "Win Rate", value: `${winRate}%`, color: wins >= losses ? "text-green-600" : "text-red-500" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm text-slate-600">{label}</span>
                    </div>
                    <span className={`font-bold font-heading ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
              <h3 className="font-bold text-slate-900 font-heading text-sm mb-3">Quick Links</h3>
              <div className="space-y-2">
                {[
                  ["/practice", "Start Practice Round"],
                  ["/ai-coach", "AI Performance Coach"],
                  ["/projects", "My Projects"],

                  ["/wiki", "Debate Wiki"],
                ].map(([to, label]) => (
                  <Link key={to} to={to} className="flex items-center justify-between text-sm text-primary hover:text-blue-700 hover:underline py-1">
                    {label} →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Get the iOS app — shown to web & installed-PWA users, hidden inside the native app */}
      {!isNativeApp() && appConfig.appStoreUrl && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-900 text-sm font-heading">Get the iPhone App</h4>
            <p className="text-slate-500 text-xs mt-0.5">Faster performance, native notifications, and a more seamless experience.</p>
          </div>
          <AppStoreBadge
            href={appConfig.appStoreUrl}
            onClick={() => base44.analytics.track({ eventName: "onboarding_appstore_clicked" })}
            className="shrink-0"
          />
        </div>
      )}

      <MUNKnowledgeHub />

      {/* Contact form on all subpages */}
      <ContactForm />

      {/* App Tour */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm font-heading">Welcome Tour</h4>
            <p className="text-slate-500 text-xs mt-0.5">Need a refresher? Retake the welcome tour to learn about DebateLab's features.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetakeTour} className="gap-1.5 shrink-0">
            <PlayCircle className="w-3.5 h-3.5" /> Retake Tour
          </Button>
        </div>
      </div>

      {/* Delete Account */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-red-800 text-sm font-heading">Delete Account</h4>
            <p className="text-red-600 text-xs mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-red-600 border-red-300 hover:bg-red-100 hover:border-red-400 gap-1.5 shrink-0">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Delete account confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-heading">Delete Account</h3>
                <p className="text-xs text-slate-500">This action is irreversible</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4">All your data including projects, contentions, and practice history will be permanently deleted. Type <strong>DELETE</strong> to confirm.</p>
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mb-4 font-mono"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(""); }} className="flex-1">Cancel</Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 gap-1.5"
              >
                <Trash2 className="w-4 h-4" />{deleting ? "Deleting..." : "Delete Forever"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-slate-400">
        <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service & Privacy Policy</Link>
        {" · "}
        <a href="mailto:DebateLab@outlook.com" className="hover:text-primary transition-colors">DebateLab@outlook.com</a>
      </div>
    </div>
  );
}