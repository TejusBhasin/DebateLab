import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ParliamentaryDebate from './pages/ParliamentaryDebate';
import PublicForum from './pages/PublicForum';
import ModelUN from './pages/ModelUN';
import ModelCongress from './pages/ModelCongress';
import TournamentPage from './pages/TournamentPage';
import ProfilePage from './pages/ProfilePage';
import DebateWiki from './pages/DebateWiki';
import Learn from './pages/Learn';
import MatchDebate from './pages/MatchDebate';
import MatchRoom from './pages/MatchRoom';

import PracticeRound from './pages/PracticeRound';
import AICoach from './pages/AICoach';
import DebateFormats from './pages/DebateFormats';
import LandingPreview from './pages/LandingPreview';
import OfficeHours from './pages/OfficeHours';
import CoachChat from './pages/CoachChat';
import Forum from './pages/Forum';
import ForumPostDetail from './pages/ForumPostDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TermsAndPrivacy from './pages/TermsAndPrivacy';
import BanGate from './components/BanGate';
import Friends from './pages/Friends';
import AIEditor from './pages/AIEditor';
import VoicePractice from './pages/VoicePractice';
import SpeechTimer from './pages/SpeechTimer';
import ConferenceProfiles from './pages/ConferenceProfiles';
import MemoryAssist from './pages/MemoryAssist';
import MockCommittee from './pages/MockCommittee';
import OtherDocuments from './pages/OtherDocuments';
import Research from './pages/Research';
import SpeechGenerator from './pages/SpeechGenerator';
import Feedback from './pages/Feedback';
import DebateToolkit from './pages/DebateToolkit';
import EvidenceLibrary from './pages/EvidenceLibrary';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
    return (
      <Routes>
        <Route path="/" element={<LandingPreview />} />
        <Route path="/terms" element={<TermsAndPrivacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<LandingPreview />} />
      </Routes>
    );
    }
  }

  // Not authenticated → show auth pages, redirect everything else to login
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPreview />} />
        <Route path="/terms" element={<TermsAndPrivacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<LandingPreview />} />
      </Routes>
    );
  }

  // Authenticated → full app
  return (
    <BanGate>
      <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPreview />} />
        <Route path="/terms" element={<TermsAndPrivacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<Layout />}>
          <Route path="/home" element={null} />
          <Route path="/parliamentary" element={<ParliamentaryDebate />} />
          <Route path="/public-forum" element={<PublicForum />} />
          <Route path="/model-un" element={<ModelUN />} />
          <Route path="/model-congress" element={<ModelCongress />} />
          <Route path="/tournament" element={<TournamentPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wiki" element={<DebateWiki />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/match" element={<MatchDebate />} />
          <Route path="/match/:id" element={<MatchRoom />} />

          <Route path="/practice" element={<PracticeRound />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/coach" element={null} />
          <Route path="/office-hours" element={<OfficeHours />} />
          <Route path="/forum" element={null} />
          <Route path="/forum/:id" element={<ForumPostDetail />} />
          <Route path="/formats" element={<DebateFormats />} />
          <Route path="/projects" element={null} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/ai-editor" element={<AIEditor />} />
          <Route path="/voice-practice" element={<VoicePractice />} />
          <Route path="/speech-timer" element={<SpeechTimer />} />
          <Route path="/conference-profiles" element={<ConferenceProfiles />} />
          <Route path="/memory-assist" element={<MemoryAssist />} />
          <Route path="/mock-committee" element={<MockCommittee />} />
          <Route path="/other-documents" element={<OtherDocuments />} />
          <Route path="/research" element={<Research />} />
          <Route path="/speech-generator" element={<SpeechGenerator />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/toolkit" element={<DebateToolkit />} />
          <Route path="/evidence" element={<EvidenceLibrary />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      </AnimatePresence>
    </BanGate>
  );
};


function ThemeManager() {
  useEffect(() => {
    const applyTheme = () => {
      const mode = localStorage.getItem('theme_mode') || 'light';
      if (mode === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');

      const colors = JSON.parse(localStorage.getItem('custom_colors') || '{}');
      const root = document.documentElement;
      
      const hexToHsl = (hex) => {
        if (!hex) return null;
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        var r = parseInt(result[1], 16) / 255;
        var g = parseInt(result[2], 16) / 255;
        var b = parseInt(result[3], 16) / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
        if (max == min) { h = s = 0; }
        else {
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };

      if (colors.primary) root.style.setProperty('--primary', hexToHsl(colors.primary));
      else root.style.removeProperty('--primary');
      
      if (colors.secondary) root.style.setProperty('--secondary', hexToHsl(colors.secondary));
      else root.style.removeProperty('--secondary');
      
      if (colors.accent) root.style.setProperty('--accent', hexToHsl(colors.accent));
      else root.style.removeProperty('--accent');
    };
    
    const loadSavedTheme = async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user?.id) return;
      const byOwner = await base44.entities.UserProfile.filter({ ownerUserId: user.id }).catch(() => []);
      const profiles = byOwner.length > 0 ? byOwner : await base44.entities.UserProfile.filter({ created_by_id: user.id }).catch(() => []);
      const profile = profiles[0];
      if (profile?.themeMode) localStorage.setItem('theme_mode', profile.themeMode);
      if (profile?.customColors) localStorage.setItem('custom_colors', JSON.stringify(profile.customColors));
      if (profile?.themeMode || profile?.customColors) applyTheme();
    };

    applyTheme();
    loadSavedTheme();
    window.addEventListener('theme-changed', applyTheme);
    return () => window.removeEventListener('theme-changed', applyTheme);
  }, []);
  
  return null;
}

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeManager />
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App