import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, FileText, Target, Users, X, ChevronRight, Check, Scale, Mic } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppStorePromoStep from "@/components/AppStorePromoStep";
import { shouldShowAppStorePromo } from "@/lib/platform";

const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Welcome to DebateLab",
    desc: "Your complete AI-powered debate prep platform. Let's take a quick tour of what you can do.",
    icon: <Users className="w-10 h-10 text-blue-500" />
  },
  {
    id: "contentions",
    title: "Generate Contentions",
    desc: "Enter your resolution and let our AI generate complete, tournament-ready arguments with claims, warrants, impacts, and cited evidence — all shown right on your contentions tab.",
    icon: <FileText className="w-10 h-10 text-indigo-500" />
  },
  {
    id: "both_sides",
    title: "Prepare Both Sides",
    desc: "Each project holds both sides — pick Gov, Opp, or Both to see everything for that side in one place, so you can prep a round from either bench.",
    icon: <Scale className="w-10 h-10 text-teal-500" />
  },
  {
    id: "speaking",
    title: "Speaking Mode",
    desc: "Rehearse full-screen, or turn on Split to view two contentions side by side at 1/4, 1/2, or 3/4 width and flow the round live.",
    icon: <Mic className="w-10 h-10 text-rose-500" />
  },
  {
    id: "practice",
    title: "Practice Rounds",
    desc: "Debate directly against an AI opponent. When you're done, get a full Reason for Decision (RFD) from our AI judge.",
    icon: <Target className="w-10 h-10 text-green-500" />
  },
  {
    id: "coach",
    title: "AI Coaching",
    desc: "Review your performance across practice rounds to identify strengths, weaknesses, and areas for improvement.",
    icon: <Brain className="w-10 h-10 text-violet-500" />
  },
  {
    id: "experience",
    title: "Debate Experience",
    desc: "Tell us about your background so we can personalize your learning path.",
    icon: <Users className="w-10 h-10 text-orange-500" />
  },
  {
    id: "ai_mode",
    title: "AI Preference",
    desc: "Choose how you want DebateLab's AI to assist you.",
    icon: <Brain className="w-10 h-10 text-violet-500" />
  },
  {
    id: "profile",
    title: "Complete Your Profile",
    desc: "Set your display name so you can post on forums, share content, and add friends.",
    icon: <Users className="w-10 h-10 text-orange-500" />
  }
];

const APPSTORE_STEP = { id: "appstore", title: "", desc: "" };

export default function TourModal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  // App Store promo step only for genuine web visitors (not native app, not
  // an installed PWA). Decided once on mount so the step list stays stable.
  const [steps] = useState(() => {
    const promo = shouldShowAppStorePromo();
    if (!promo.show) {
      const reasonEvent = {
        native_app: "onboarding_skipped_due_to_native_app",
        existing_install: "onboarding_skipped_due_to_existing_install",
      }[promo.reason];
      if (reasonEvent) base44.analytics.track({ eventName: reasonEvent });
      return TOUR_STEPS;
    }
    return [...TOUR_STEPS, APPSTORE_STEP];
  });
  const [formData, setFormData] = useState({ 
    displayName: "", 
    skillLevel: "", 
    preferredFormat: "",
    learnTabEnabled: true,
    learningPathType: "debate",
    learningPathFormat: "public_forum",
    defaultAiMode: "full"
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      let byOwner = await base44.entities.UserProfile.filter({ ownerUserId: user.id });
      if (byOwner.length === 0 && user.email) {
        byOwner = await base44.entities.UserProfile.filter({ ownerEmail: user.email });
      }
      if (byOwner.length > 0) return byOwner[0];
      const res = await base44.entities.UserProfile.filter({ created_by_id: user.id });
      return res[0] || null;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        displayName: profile.displayName || user?.full_name || "",
        skillLevel: profile.skillLevel || "",
        preferredFormat: profile.preferredFormat || "",
        learnTabEnabled: profile.learnTabEnabled !== false,
        learningPathType: profile.learningPathType || "debate",
        learningPathFormat: profile.learningPathFormat || "public_forum",
        defaultAiMode: profile.defaultAiMode || "full"
      }));
    } else if (user) {
      setFormData(prev => ({ ...prev, displayName: user.full_name || "" }));
    }
  }, [profile, user]);

  const saveProfile = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, ownerUserId: user?.id, ownerEmail: user?.email || "" };
      if (profile?.id) {
        return base44.entities.UserProfile.update(profile.id, payload);
      } else {
        // Re-check by email/userId before creating to avoid duplicates from tour.
        let existing = await base44.entities.UserProfile.filter({ ownerUserId: user?.id });
        if (existing.length === 0 && user?.email) {
          existing = await base44.entities.UserProfile.filter({ ownerEmail: user.email });
        }
        if (existing.length > 0) {
          return base44.entities.UserProfile.update(existing[0].id, payload);
        }
        return base44.entities.UserProfile.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    }
  });

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("debatelab_tour_seen");
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("debatelab_tour_seen", "true");
    setIsOpen(false);
  };

  const handleNext = async () => {
    if (steps[step].id === "experience" && !formData.skillLevel) {
      // Must select skill level
      return;
    }

    if (steps[step].id === "profile") {
      try {
        await saveProfile.mutateAsync(formData);
      } catch (e) {
        console.error("Failed to save profile:", e);
      }
      // If an App Store promo step follows, advance to it; otherwise finish.
      if (step < steps.length - 1) {
        setStep(step + 1);
      } else {
        handleClose();
      }
    } else if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-8 relative">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {currentStep.id === "appstore" ? (
            <AppStorePromoStep onContinue={handleClose} />
          ) : (
          <>
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
              {currentStep.icon}
            </div>
          </div>

          <h2 className="text-2xl font-bold font-heading text-slate-900 mb-3 text-center">{currentStep.title}</h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-center">
            {currentStep.desc}
          </p>

          {currentStep.id === "experience" && (
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Debate Experience Level <span className="text-red-500">*</span></label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-base text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm [&>option]:text-black"
                  value={formData.skillLevel} 
                  onChange={e => setFormData({...formData, skillLevel: e.target.value})}
                >
                  <option value="" disabled>Select Experience Level</option>
                  <option value="new">New</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {["new", "beginner", "intermediate"].includes(formData.skillLevel) && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Learning Path Focus</label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-base text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm [&>option]:text-black"
                      value={formData.learningPathType} 
                      onChange={e => setFormData({...formData, learningPathType: e.target.value})}
                    >
                      <option value="debate">Debate</option>
                      <option value="model_un">Model UN</option>
                      <option value="model_congress">Model Congress</option>
                    </select>
                  </div>
                  {formData.learningPathType === "debate" && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Debate Format</label>
                      <select 
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-base text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm [&>option]:text-black"
                        value={formData.learningPathFormat} 
                        onChange={e => setFormData({...formData, learningPathFormat: e.target.value})}
                      >
                        <option value="public_forum">Public Forum</option>
                        <option value="parliamentary">Parliamentary</option>
                      </select>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                    <Checkbox 
                      id="disable-learn" 
                      checked={!formData.learnTabEnabled}
                      onCheckedChange={(checked) => setFormData({...formData, learnTabEnabled: !checked})}
                    />
                    <label htmlFor="disable-learn" className="text-sm text-slate-600 font-medium cursor-pointer">
                      Don't include the Learn tab
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep.id === "ai_mode" && (
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-1 gap-4">
                <div 
                  onClick={() => setFormData({...formData, defaultAiMode: "full"})}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.defaultAiMode === "full" ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">Full AI Assistance</h3>
                    {formData.defaultAiMode === "full" && <Check className="w-5 h-5 text-primary" />}
                  </div>
                  <p className="text-sm text-slate-500">AI will generate complete speeches, cases, briefs, and arguments for you.</p>
                </div>
                
                <div 
                  onClick={() => setFormData({...formData, defaultAiMode: "dampened"})}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.defaultAiMode === "dampened" ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">Dampened AI</h3>
                    {formData.defaultAiMode === "dampened" && <Check className="w-5 h-5 text-primary" />}
                  </div>
                  <p className="text-sm text-slate-500">AI acts as a guide, providing outlines, evidence, and research directions instead of writing for you. Encourages independent thinking.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep.id === "profile" && (
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Display Name</label>
                <Input value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="How you appear to others" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-slate-200'}`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="text-slate-500 font-medium" onClick={handleClose}>
                Skip
              </Button>
              <Button onClick={handleNext} disabled={currentStep.id === "profile" && saveProfile.isPending} className="gap-1.5 rounded-xl font-medium px-6">
                {step === steps.length - 1 ? (
                  <>{saveProfile.isPending ? "Saving..." : "Get Started"} {!saveProfile.isPending && <Check className="w-4 h-4" />}</>
                ) : (
                  <>Next <ChevronRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}