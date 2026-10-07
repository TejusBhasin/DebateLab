import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import CoachChat from "@/pages/CoachChat";
import Forum from "@/pages/Forum";
import { ChevronDown, BookOpen, Globe, FileText, Trophy, User, Zap, Menu, X, LayoutGrid, Folder, LogOut, LayoutDashboard, Brain, MessageSquare, Target, Users, Sparkles, GraduationCap, Swords, Bell, Mic, Timer, Landmark, Layers3, Search, Megaphone } from "lucide-react";
import { useUnMode } from "@/hooks/useUnMode";

const doLogout = async () => {
  await base44.auth.logout();
  window.location.href = "/login";
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [debateOpen, setDebateOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState(() => JSON.parse(sessionStorage.getItem('dismissed_notifs') || '[]'));
  const timerRef = useRef(null);

  // Detect if we're on a sub-route (not a root tab) for mobile back button
  const rootPaths = ["/home", "/projects", "/practice", "/forum", "/coach", "/research", "/speech-generator"];
  const isSubRoute = !rootPaths.includes(location.pathname);
  const unMode = useUnMode();

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const res = await base44.entities.UserProfile.filter({ created_by_id: user.id });
      return res[0] || null;
    },
    enabled: !!user
  });

  const shouldShowLearn = profile && ["new", "beginner", "intermediate"].includes(profile.skillLevel) && profile.learnTabEnabled !== false;

  const { data: platformNotifications = [] } = useQuery({
    queryKey: ['platform_notifications'],
    queryFn: () => base44.entities.PlatformNotification.filter({ isActive: true }),
    refetchInterval: 60000,
  });

  const { data: userNotifications = [], refetch: refetchUserNotifs } = useQuery({
    queryKey: ['user_notifications', user?.id],
    queryFn: () => base44.entities.UserNotification.list('-created_date', 50),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const activeNotif = platformNotifications.find(n => !dismissedNotifs.includes(n.id));

  const markNotifRead = async (id) => {
    await base44.entities.UserNotification.update(id, { isRead: true });
    refetchUserNotifs();
  };
  
  const unreadNotifCount = userNotifications.filter(n => !n.isRead).length;

  const dismissNotif = (id) => {
    const next = [...dismissedNotifs, id];
    setDismissedNotifs(next);
    sessionStorage.setItem('dismissed_notifs', JSON.stringify(next));
  };

  const notifColors = { info: 'bg-blue-600', warning: 'bg-amber-500', success: 'bg-green-600', alert: 'bg-red-600' };

  const active = (paths) => (Array.isArray(paths) ? paths : [paths]).some(p => location.pathname.startsWith(p));

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-body flex flex-col">
      {/* Desktop + Mobile top nav */}
      <nav 
        className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm pt-[env(safe-area-inset-top)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">

            {/* Mobile: back button on sub-routes, logo on root */}
            <div className="lg:hidden flex items-center gap-2 min-w-0 shrink-0">
              {isSubRoute && location.pathname !== "/coach" ? (
                <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors select-none shrink-0">
                  <ChevronDown className="w-5 h-5 text-slate-600 rotate-90" />
                </button>
              ) : (
                <Link to="/home" className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-base tracking-tight text-slate-900 font-heading">DebateLab</span>
                </Link>
              )}
            </div>

            {/* Desktop logo */}
            <Link to="/home" className="hidden lg:flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 font-heading">DebateLab</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1 justify-center">
              <div
                className="relative"
                onMouseEnter={() => { clearTimeout(timerRef.current); setDebateOpen(true); }}
                onMouseLeave={() => { timerRef.current = setTimeout(() => setDebateOpen(false), 200); }}
              >
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${active(['/parliamentary', '/public-forum']) ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                  <BookOpen className="w-4 h-4" />
                  Debate
                  <ChevronDown className={`w-3 h-3 transition-transform ${debateOpen ? 'rotate-180' : ''}`} />
                </button>
                {debateOpen && (
                  <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50">
                    <Link to="/parliamentary" onClick={() => setDebateOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-blue-50 hover:text-primary transition-colors ${active('/parliamentary') ? 'bg-blue-50 text-primary' : 'text-slate-700'}`}>
                      <span className="text-xl">🏛️</span>
                      <div>
                        <div className="font-medium">Parliamentary</div>
                        <div className="text-xs text-slate-400">BP, AP, MSPDP formats</div>
                      </div>
                    </Link>
                    <Link to="/public-forum" onClick={() => setDebateOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-blue-50 hover:text-primary transition-colors ${active('/public-forum') ? 'bg-blue-50 text-primary' : 'text-slate-700'}`}>
                      <span className="text-xl">🎤</span>
                      <div>
                        <div className="font-medium">Public Forum</div>
                        <div className="text-xs text-slate-400">NSDA Public Forum format</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {[
                ["/model-un", <Globe className="w-3.5 h-3.5" />, unMode ? "UN" : "MUN"],
                ["/model-congress", <FileText className="w-3.5 h-3.5" />, "Congress"],
                ["/research", <Search className="w-3.5 h-3.5" />, "Research"],
                ["/other-documents", <FileText className="w-3.5 h-3.5" />, "Other Docs"],
                ["/match", <Swords className="w-3.5 h-3.5" />, "Match"],
                ["/projects", <Folder className="w-3.5 h-3.5" />, "Projects"],
                ["/ai-editor", <Sparkles className="w-3.5 h-3.5" />, "AI Editor"],
              ["/speech-generator", <Megaphone className="w-3.5 h-3.5" />, "Speech"],
              ].map(([to, icon, label]) => (
                <Link key={to} to={to} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${['/other-documents', '/ai-editor', '/speech-generator'].includes(to) ? 'hidden xl:flex' : ''} ${active(to) ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                  {icon}{label}
                </Link>
              ))}
              
              {/* Desktop More Button */}
              <button onClick={() => setMobileOpen(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap text-slate-600 hover:text-slate-900 hover:bg-slate-100`}>
                <Menu className="w-3.5 h-3.5" /> More
              </button>
              
              {/* Notification Bell */}
              <div className="relative ml-2">
                <button 
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  )}
                </button>
                
                {notifDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                      {unreadNotifCount > 0 && (
                         <span className="text-xs text-primary font-medium">{unreadNotifCount} new</span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {userNotifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">No notifications yet.</div>
                      ) : (
                        userNotifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => { if (!n.isRead) markNotifRead(n.id); if(n.link) navigate(n.link); setNotifDropdownOpen(false); }}
                            className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                          >
                            <h4 className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:hidden flex items-center gap-1 shrink-0 justify-end ml-auto">
              <div className="relative">
                <button 
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="p-2 -mr-1 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-50"></span>
                  )}
                </button>
                {notifDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {userNotifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">No notifications.</div>
                      ) : (
                        userNotifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => { if (!n.isRead) markNotifRead(n.id); if(n.link) navigate(n.link); setNotifDropdownOpen(false); }}
                            className={`p-4 border-b border-slate-50 cursor-pointer ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                          >
                            <h4 className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setMobileOpen(true)} 
                className="p-2 -mr-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Removed old dropdown mobile menu */}
        </div>
      </nav>
      {activeNotif && (
        <div className={`${notifColors[activeNotif.type] || 'bg-blue-600'} text-white px-4 py-2.5 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-semibold shrink-0">{activeNotif.title}</span>
            <span className="text-xs text-white/80 truncate">{activeNotif.message}</span>
          </div>
          <button onClick={() => dismissNotif(activeNotif.id)} className="text-white/70 hover:text-white shrink-0 text-lg leading-none">×</button>
        </div>
      )}
      <main className="flex-1 w-full pb-8 relative">
        <div className={location.pathname === '/home' ? 'block' : 'hidden'}><Dashboard /></div>
        <div className={location.pathname === '/projects' ? 'block' : 'hidden'}><Projects /></div>
        <div className={location.pathname.startsWith('/coach') ? 'block' : 'hidden'}><CoachChat /></div>
        <div className={location.pathname === '/forum' || location.pathname === '/forum/' ? 'block' : 'hidden'}><Forum /></div>
        {(!['/home', '/projects', '/forum', '/forum/'].includes(location.pathname) && !location.pathname.startsWith('/coach')) && (
          <Outlet />
        )}
      </main>

      {/* Full screen menu (Mobile + Desktop) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-50/95 backdrop-blur-xl pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] px-4 overflow-y-auto flex flex-col items-center">
          <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-8 mt-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Navigation</h2>
            <button onClick={() => setMobileOpen(false)} className="p-2 -mr-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {[
              ["/home", LayoutDashboard, "Home"],
              ...(shouldShowLearn ? [["/learn", GraduationCap, "Learn"]] : []),
              ["/projects", Folder, "Projects"],
              ["/coach", Brain, "Coach"],
              ["/practice", Target, "Practice Rounds"],
              ["/mock-committee", Swords, "Mock Committee"],
              ["/memory-assist", Layers3, "Memory Assist"],
              ["/voice-practice", Mic, "Voice Practice"],
              ["/speech-timer", Timer, "Speech Timer"],
              ["/conference-profiles", Landmark, "Conference Rules"],
              ["/match", Swords, "Match Debate"],
              ["/forum", MessageSquare, "Forum"],
              ["/friends", Users, "Friends"],
              ["/ai-editor", Sparkles, "AI Editor"],
              ["/speech-generator", Megaphone, "Speech Generator"],
              ["/profile", User, "Profile"],
              ["/parliamentary", BookOpen, "Parliamentary"],
              ["/public-forum", BookOpen, "Public Forum"],
              ["/model-un", Globe, unMode ? "UN" : "Model UN"],
              ["/model-congress", FileText, "Congress"],
              ["/research", Search, "Research"],
              ["/other-documents", FileText, "Other Docs"],
              ["/formats", LayoutGrid, "Formats"],
              ["/office-hours", MessageSquare, "Office Hours"],
              ["/tournament", Trophy, "Tournament"],
            ].map(([to, Icon, label]) => {
              const isActive = to === "/home" ? location.pathname === "/home" : location.pathname.startsWith(to);
              return (
                <Link 
                  key={to} 
                  to={to} 
                  onClick={() => setMobileOpen(false)} 
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl gap-2 transition-all border ${isActive ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700 shadow-sm'}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
                </Link>
              );
            })}
            
            <button 
              onClick={() => { setMobileOpen(false); doLogout(); }}
              className="flex flex-col items-center justify-center p-4 rounded-2xl gap-2 transition-all border bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600 shadow-sm"
            >
              <LogOut className="w-6 h-6" />
              <span className="text-[11px] font-medium text-center leading-tight">Log out</span>
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}