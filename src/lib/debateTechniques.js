// Shared technique library used by the Techniques page, project tab, and AI prompts.
export const TECHNIQUE_GROUPS = [
  {
    id: "defense",
    title: "Defensive Strategies (MIND)",
    subtitle: "Reasons why your opponent is wrong",
    color: "bg-blue-50 border-blue-200 text-blue-900",
    items: [
      { name: "Mitigate", def: "Their argument isn't as large or significant as they say.", say: "Even if this happens, it affects far fewer people / far less severely than they claim because..." },
      { name: "Indict", def: "Their evidence is flawed or doesn't apply to their argument.", say: "Their source is outdated / biased / about a different country, so it can't prove their claim." },
      { name: "Non-unique", def: "Their impact happens either way, so their argument doesn't change the round.", say: "This problem exists in the status quo and will continue with or without their side." },
      { name: "De-link", def: "No connection between their evidence/analysis and their claim.", say: "Nothing in their warrant shows that the plan actually causes this outcome." },
    ],
  },
  {
    id: "offense",
    title: "Offensive Strategies (LID)",
    subtitle: "Reasons why you are right",
    color: "bg-red-50 border-red-200 text-red-900",
    items: [
      { name: "Link Turn", def: "Their warrant actually produces the opposite of what they say.", say: "Their own mechanism makes the problem worse, not better, because..." },
      { name: "Impact Turn", def: "Something they claim is bad is actually good.", say: "They say this causes X. X is actually beneficial because..." },
      { name: "Disadvantage", def: "Their warrant causes something bad for their side to happen.", say: "Their plan triggers [harm], which outweighs any benefit they get." },
    ],
  },
  {
    id: "weighing",
    title: "Weighing Mechanisms",
    subtitle: "Why you still win even if both sides' arguments are true",
    color: "bg-indigo-50 border-indigo-200 text-indigo-900",
    items: [
      { name: "Scope", def: "How many people or things are affected.", say: "My impact affects millions; theirs affects a few thousand." },
      { name: "Magnitude", def: "How severe the impact is.", say: "Even if they affect more people, mine is life-or-death while theirs is inconvenience." },
      { name: "Probability", def: "How likely the impact is to happen.", say: "Mine is already happening; theirs relies on a long chain of maybes." },
      { name: "Timeframe", def: "How soon the impact happens (or how long it lasts).", say: "My impact happens immediately; theirs takes decades, so we can solve it later." },
      { name: "Reversibility", def: "How easily the impact can be undone.", say: "Economies recover; deaths and extinctions don't. Prioritize the irreversible harm." },
      { name: "Prerequisite", def: "Your impact has to happen for theirs to.", say: "Quality education comes first; without it, none of their job gains are possible." },
      { name: "Otherization", def: "Your impact supports a historically marginalized group.", say: "My impact protects the communities who are already most vulnerable." },
    ],
  },
  {
    id: "beyond",
    title: "Advanced Techniques (beyond the basics)",
    subtitle: "What separates good debaters from winning debaters",
    color: "bg-emerald-50 border-emerald-200 text-emerald-900",
    items: [
      { name: "Framing / Burden", def: "Tell the judge what the round is about and what they must prove.", say: "The standard for this round is minimizing harm to the most people; every argument should be judged through that." },
      { name: "Signposting", def: "Tell the judge exactly where you are so they can flow you.", say: "Three points: first, their economy argument; second, my turn; third, weighing." },
      { name: "Overview", def: "A 15-second big-picture summary before the line-by-line.", say: "Two things decide this round: who stops more harm, and who is more likely." },
      { name: "Layering", def: "Stack multiple answers on one argument, strongest-first, so you win even if one fails.", say: "Three answers: they don't link, it's non-unique, and even if true, it's small." },
      { name: "Collapsing", def: "Drop weak arguments and spend your time on the 1-2 you're winning.", say: "I'm going to focus on the two arguments that decide the round." },
      { name: "Pre-empting", def: "Answer the response you know they'll give before they say it.", say: "They'll say this is too expensive. But the cost is paid back within two years because..." },
      { name: "Extending", def: "Re-explain your argument after it's attacked, with the warrant and impact, not just the name.", say: "Extend my second point: they never answered the warrant that..." },
      { name: "Cross-apply", def: "Use an answer you already made against a new argument.", say: "Cross-apply my non-unique from the first speech here too." },
      { name: "Conceding / Kicking", def: "Strategically give up an argument that's hurting you, or concede a point that doesn't matter.", say: "Even if I grant their first point, it doesn't change who wins." },
      { name: "Comparative Worlds", def: "Always compare the world of your side vs. theirs, not your argument vs. nothing.", say: "In the world of the plan vs. the status quo, here's what concretely changes." },
      { name: "Evidence Comparison", def: "Explain why your source/logic is better: more recent, more qualified, more specific.", say: "Their study is from 2009; ours reflects the last three years of data." },
      { name: "Impact Calculus", def: "Combine scope, magnitude, probability and timeframe into one clear reason you outweigh.", say: "Higher probability and greater magnitude means you vote for us." },
      { name: "Cross-Examination Setups", def: "Ask short, closed questions that lock in a concession you use in your next speech.", say: "So you agree the cost falls on small businesses? Thank you." },
      { name: "POIs (Points of Information)", def: "Offer short, sharp questions, not speeches. Wait to be recognized; none in first/last minute of constructives.", say: "On that point, if the policy is voluntary, how does it solve the problem?" },
      { name: "Voters / Reason for Decision", def: "In the last speech, give the judge the exact sentences to write on the ballot.", say: "Vote for us for two reasons: we stop more harm, and our impacts are more likely." },
      { name: "Delivery", def: "Vary pace, pause before key lines, and keep eye contact. Slow down on the weighing.", say: "(Not spoken) Slow, loud, and clear on your voting issues." },
    ],
  },
  {
    id: "roles",
    title: "Speech Order & Roles (Parliamentary)",
    subtitle: "Prop-Opp-Prop-Opp-Opp-Prop",
    color: "bg-amber-50 border-amber-200 text-amber-900",
    items: [
      { name: "1st Speaker (5 min)", def: "Constructive. Introduce arguments and define key terms. 1st Opp may start refuting.", say: "" },
      { name: "2nd Speaker (5 min)", def: "Constructive. Introduce new arguments, define terms, then refute the 1st speaker.", say: "" },
      { name: "3rd Speaker (4 min)", def: "Summary. Summarize best points, explain why you've won, paint the picture of your side's world. No new arguments.", say: "" },
      { name: "Prep / Extemp", def: "20 minutes of prep, notes on one colored sheet only, no internet. Extemp rounds give a context slide.", say: "" },
    ],
  },
];

// Compact text version for AI prompts.
export function techniquesPromptText() {
  return TECHNIQUE_GROUPS.filter(g => g.id !== "roles")
    .map(g => `${g.title}:\n` + g.items.map(i => `- ${i.name}: ${i.def}`).join("\n"))
    .join("\n\n");
}