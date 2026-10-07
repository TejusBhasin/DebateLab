import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Zap, Sparkles, Brain, Trophy, FileText, Globe,
  TrendingUp, Search, MessageSquare, Menu, X } from
"lucide-react";

const NAV_TABS = [
{ id: "home", label: "Home" },
{ id: "discover", label: "Discover" },
{ id: "formats", label: "Formats" },
{ id: "about", label: "About" }];


const FORMATS = [
{
  name: "Parliamentary",
  tag: "Parli",
  desc: "British Parliamentary, American Parliamentary, and MSPDP formats with government/opposition roles, POIs, and prep time management.",
  tools: ["AI Contentions", "Practice Rounds", "Flow Sheet", "Case Vault"],
  dotClass: "bg-blue-400"
},
{
  name: "Public Forum",
  tag: "PF",
  desc: "NSDA Public Forum with crossfire prep, weighing mechanisms, summary/final focus strategy, and evidence pairing for both sides.",
  tools: ["Contentions", "Crossfire Prep", "Evidence", "Flow Sheet"],
  dotClass: "bg-violet-400"
},
{
  name: "Model UN",
  tag: "MUN",
  desc: "Complete MUN toolkit — position papers, draft resolutions, working papers, bloc strategy memos, and speech scripts for any committee.",
  tools: ["Position Papers", "Resolutions", "Country Profiles", "Speeches"],
  dotClass: "bg-teal-400"
},
{
  name: "Model Congress",
  tag: "Congress",
  desc: "Draft bills and resolutions, write authorship and floor debate speeches, and prepare legislative strategy for any chamber.",
  tools: ["Bill Drafting", "Speeches", "Floor Strategy", "Committee Prep"],
  dotClass: "bg-amber-400"
}];


const FEATURES = [
{ icon: Sparkles, label: "AI Contentions", desc: "Generate tournament-ready arguments for any resolution in seconds." },
{ icon: Brain, label: "AI Coaching", desc: "Get personalized performance insights and a custom prep plan." },
{ icon: MessageSquare, label: "Practice Rounds", desc: "Debate against an AI opponent and receive a full judge decision." }];


export default function LandingPreview() {
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-body">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-neutral-950 border-b border-white border-opacity-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-neutral-900 border border-white border-opacity-10 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-bold text-white text-base font-heading">DebateLab</span>
          </div>

          {/* Center tabs */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_TABS.map((tab) =>
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm transition-all ${
              activeTab === tab.id ?
              "text-blue-400 font-semibold" :
              "text-white text-opacity-40 hover:text-opacity-70"}`
              }>
              
                {activeTab === tab.id &&
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              }
                {tab.label}
              </button>
            )}
          </div>

          {/* Auth buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <Link to="/login">
              <button className="px-4 py-1.5 text-sm text-white border border-white border-opacity-20 rounded-lg transition-all hover:border-opacity-40">
                Sign In
              </button>
            </Link>
            <Link to="/register">
              <button className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                Get Started
              </button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-3">
            <Link to="/login">
              <button className="px-3 py-1.5 text-xs text-white border border-white border-opacity-20 rounded-lg">
                Sign In
              </button>
            </Link>
            <button onClick={() => setMobileOpen(true)} className="p-1 text-white opacity-70 hover:opacity-100">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-6 h-14 border-b border-white border-opacity-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-neutral-900 border border-white border-opacity-10 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <span className="font-bold text-white text-base font-heading">DebateLab</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-1 text-white opacity-70 hover:opacity-100">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col p-6 gap-4">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileOpen(false); }}
                className={`text-left text-lg font-medium py-3 border-b border-white border-opacity-5 ${
                  activeTab === tab.id ? "text-blue-400" : "text-white opacity-70"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="flex flex-col gap-3 mt-6">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <button className="w-full py-3 text-sm text-white border border-white border-opacity-20 rounded-xl">
                  Sign In
                </button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <button className="w-full py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* HOME */}
      {activeTab === "home" &&
      <div className="flex flex-col items-center text-center px-6">
          <div className="mt-10 sm:mt-16 mb-6 sm:mb-8 w-14 h-14 sm:w-16 sm:h-16 bg-neutral-900 border border-white border-opacity-10 rounded-2xl flex items-center justify-center shadow-2xl">
            <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-heading leading-tight mb-4 max-w-2xl">
            Your debate prep,{" "}
            <span className="text-blue-400">supercharged.</span>
          </h1>

          <p className="text-white text-opacity-50 text-base sm:text-lg max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed">
            AI-powered contentions, practice rounds, MUN documents, and coaching — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mb-12 sm:mb-16">
            <Link to="/register" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all text-sm">
                Get Started Free <span>→</span>
              </button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-6 py-3 text-sm text-white border border-white border-opacity-20 rounded-xl hover:border-opacity-40 transition-all">
                Sign In
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-16 sm:mb-20">
            {FEATURES.map(({ icon: Icon, label, desc }) =>
          <div key={label} className="bg-neutral-900 border border-white border-opacity-10 rounded-2xl p-6 text-left hover:border-opacity-20 transition-all">
                <Icon className="w-5 h-5 text-blue-400 mb-3" />
                <div className="font-semibold text-white text-sm mb-1.5">{label}</div>
                <p className="text-xs text-white text-opacity-40 leading-relaxed">{desc}</p>
              </div>
          )}
          </div>
        </div>
      }

      {/* DISCOVER */}
      {activeTab === "discover" &&
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold font-heading mb-3">Discover powerful features.</h2>
            <p className="text-white text-opacity-40 text-base max-w-md mx-auto">
              Explore the tools that give DebateLab users a competitive edge in every round.
            </p>
          </div>
          
          <div className="space-y-8">
            <div className="bg-neutral-900 border border-white border-opacity-10 rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 items-center hover:border-opacity-20 transition-all">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">AI Coach</h3>
                </div>
                <p className="text-white text-opacity-50 leading-relaxed mb-6">
                  Meet your personalized, 24/7 debate coach. Our AI analyzes your performance, tracks your win rates and speaker points, and gives you actionable feedback after every practice round. Review your strengths and target specific weaknesses before tournament day.
                </p>
                <Link to="/register"><button className="text-sm font-semibold text-blue-400 hover:text-blue-300">Try AI Coach →</button></Link>
              </div>
              <div className="w-full md:w-1/2 aspect-[4/3] rounded-xl overflow-hidden shadow-2xl">
                <img src="https://media.base44.com/images/public/6a1d6e51e5d2301311f71188/96838290d_generated_image.png" alt="AI Coach" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            </div>

            <div className="bg-neutral-900 border border-white border-opacity-10 rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row-reverse gap-6 sm:gap-8 items-center hover:border-opacity-20 transition-all">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="w-6 h-6 text-violet-400" />
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">Practice Rounds</h3>
                </div>
                <p className="text-white text-opacity-50 leading-relaxed mb-6">
                  Debate against an advanced AI opponent that simulates realistic tournament conditions. Customize the difficulty, format, and side. Deliver your speeches, get cross-examined, and receive a comprehensive judge decision (RFD) with detailed scoring.
                </p>
                <Link to="/register"><button className="text-sm font-semibold text-violet-400 hover:text-violet-300">Start Practicing →</button></Link>
              </div>
              <div className="w-full md:w-1/2 aspect-[4/3] rounded-xl overflow-hidden shadow-2xl">
                <img src="https://media.base44.com/images/public/6a1d6e51e5d2301311f71188/a38e20df3_generated_image.png" alt="Practice Rounds" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            </div>

            <div className="bg-neutral-900 border border-white border-opacity-10 rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 items-center hover:border-opacity-20 transition-all">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-teal-400" />
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">Rebuttal Hub</h3>
                </div>
                <p className="text-white text-opacity-50 leading-relaxed mb-6">
                  Instantly counter your opponent's arguments. Type in their claims during the round, and the Rebuttal Hub generates real-time, evidence-backed counter-arguments perfectly aligned with your side of the motion. Say goodbye to struggling during prep time.
                </p>
                <Link to="/register"><button className="text-sm font-semibold text-teal-400 hover:text-teal-300">Explore Rebuttals →</button></Link>
              </div>
              <div className="w-full md:w-1/2 aspect-[4/3] rounded-xl overflow-hidden shadow-2xl">
                <img src="https://media.base44.com/images/public/6a1d6e51e5d2301311f71188/db0119a2b_generated_image.png" alt="Rebuttal Hub" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            </div>

            <div className="bg-neutral-900 border border-white border-opacity-10 rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row-reverse gap-6 sm:gap-8 items-center hover:border-opacity-20 transition-all">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <Globe className="w-6 h-6 text-amber-400" />
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">Office Hours</h3>
                </div>
                <p className="text-white text-opacity-50 leading-relaxed mb-6">
                  Stuck on debate jargon, rules, or tournament strategy? Drop into Office Hours to ask our AI debate expert anything. Get immediate, clear answers on formatting, speaker duties, and tactical maneuvers.
                </p>
                <Link to="/register"><button className="text-sm font-semibold text-amber-400 hover:text-amber-300">Join Office Hours →</button></Link>
              </div>
              <div className="w-full md:w-1/2 aspect-[4/3] rounded-xl overflow-hidden shadow-2xl">
                <img src="https://media.base44.com/images/public/6a1d6e51e5d2301311f71188/e71aee368_generated_image.png" alt="Office Hours" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            </div>
          </div>
        </div>
      }

      {/* FORMATS */}
      {activeTab === "formats" &&
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold font-heading mb-3">Every format, covered.</h2>
            <p className="text-white text-opacity-40 text-base max-w-md mx-auto">
              Purpose-built toolkits for the four major competitive debate and speech formats.
            </p>
          </div>
          <div className="space-y-4">
            {FORMATS.map((f) =>
          <div key={f.name} className="bg-neutral-900 border border-white border-opacity-10 rounded-2xl p-6 hover:border-opacity-20 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${f.dotClass}`} />
                  <h3 className="font-bold text-white font-heading">{f.name}</h3>
                  <span className="text-xs text-white text-opacity-30 bg-white bg-opacity-5 px-2 py-0.5 rounded-full">{f.tag}</span>
                </div>
                <p className="text-white text-opacity-40 text-sm leading-relaxed mb-4 ml-5">{f.desc}</p>
                <div className="flex flex-wrap gap-2 ml-5">
                  {f.tools.map((t) =>
              <span key={t} className="text-xs text-white text-opacity-50 bg-white bg-opacity-5 border border-white border-opacity-10 px-2.5 py-1 rounded-full">{t}</span>
              )}
                </div>
              </div>
          )}
          </div>
          <div className="text-center mt-10">
            <Link to="/register">
              <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all text-sm">
                Get Started Free →
              </button>
            </Link>
          </div>
        </div>
      }

      {/* ABOUT */}
      {activeTab === "about" &&
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="w-16 h-16 bg-neutral-900 border border-white border-opacity-10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold font-heading mb-4">Built for serious debaters</h2>
          <p className="text-white text-opacity-40 leading-relaxed mb-6">
            DebateLab was built by competitors for competitors. Every tool is designed around the real workflows of Parliamentary, Public Forum, Model UN, and Model Congress debaters — from first-round prep to final-round strategy.
          </p>
          <p className="text-white text-opacity-30 text-sm leading-relaxed mb-10">
            Whether you're a first-year student or a seasoned debater, DebateLab gives you the AI tools to prepare faster and argue smarter.
          </p>
          <div className="border-t border-white border-opacity-10 pt-8 text-xs text-white text-opacity-20 flex items-center justify-center gap-5 flex-wrap">
            <Link to="/terms" className="hover:text-opacity-50 transition-colors">Terms of Service</Link>
            <Link to="/terms" className="hover:text-opacity-50 transition-colors">Privacy Policy</Link>
            <a href="mailto:DebateLab@outlook.com" className="hover:text-opacity-50 transition-colors">DebateLab@outlook.com</a>
          </div>
        </div>
      }

      {/* Footer */}
      <div className="border-t border-white border-opacity-10 py-6 px-6 text-center text-xs text-white text-opacity-20 flex items-center justify-center gap-5">
        <Link to="/terms" className="hover:text-opacity-40 transition-colors">Terms</Link>
        <Link to="/terms" className="hover:text-opacity-40 transition-colors">Privacy</Link>
        <a href="mailto:DebateLab@outlook.com" className="hover:text-opacity-40 transition-colors">Contact</a>
        <span>© 2026 DebateLab</span>
      </div>
    </div>);

}