// Shared technique vocabulary for AI coaching (backend prompts).
export const TECHNIQUES = [
  { name: "Mitigate", def: "Their argument is smaller or less significant than claimed." },
  { name: "Indict", def: "Their evidence is flawed, outdated, biased, or doesn't support their claim." },
  { name: "Non-unique", def: "Their impact happens either way, so their argument doesn't change the round." },
  { name: "De-link", def: "No connection between their warrant and their claim." },
  { name: "Link turn", def: "Their own warrant produces the opposite of what they say." },
  { name: "Impact turn", def: "Something they call bad is actually good." },
  { name: "Disadvantage", def: "Their plan/warrant triggers a harm that outweighs their benefit." },
  { name: "Weighing", def: "Scope, magnitude, probability, timeframe, reversibility, prerequisite." },
  { name: "Framing", def: "Set the standard/burden the judge must use." },
  { name: "Pre-empt", def: "Answer the response you know they will give before they say it." },
  { name: "Layering", def: "Stack multiple independent answers so one surviving answer wins." },
  { name: "Collapsing", def: "Drop weak arguments and spend time on the 1-2 you are winning." },
  { name: "Extend", def: "Re-explain a surviving argument with its warrant and impact after it is attacked." },
  { name: "Cross-apply", def: "Use an answer already made against a new argument." },
  { name: "Comparative worlds", def: "Compare the concrete world of your side against theirs." },
  { name: "Evidence comparison", def: "Argue why your source is more recent, qualified, or specific." },
  { name: "Impact calculus", def: "Combine weighing mechanisms into one clear reason you outweigh." },
  { name: "Cross-ex setup", def: "Ask short closed questions that lock in a concession." },
  { name: "Voters", def: "Give the judge the exact reasons for decision in the final speech." },
];

export const techniquePromptList = () => TECHNIQUES.map(t => `- ${t.name}: ${t.def}`).join("\n");

// A user has opted out of automatic (scheduled) coach suggestions.
export async function autoSuggestionsDisabled(base44, ownerId) {
    if (!ownerId) return false;
    const profiles = await base44.asServiceRole.entities.UserProfile
        .filter({ ownerUserId: ownerId }, { limit: 1 })
        .catch(() => []);
    const list = Array.isArray(profiles) ? profiles : (profiles?.items || []);
    const profile = list[0] || null;
    // No profile yet means the user never opted out.
    return profile ? profile.coachSuggestionsEnabled === false : false;
}