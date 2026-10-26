/**
 * Researched best-practice speech instructions per debate format.
 * Sources: NSDA Public Forum & Congressional Debate guides, Best Delegate MUN guides,
 * BP/parliamentary debate guides (Manchester Debating Union, CHSSA), and
 * congressional-debate procedure guides (NSDA, Congressional Debate Guide).
 */
const GUIDES = {
  parliamentary: `- Open with a hook, then immediately define key terms and set a fair framework/burden split that favors your side.
- Signpost every section ("I have two contentions: first... second...") and refer back to your roadmap throughout; judges reward clean structure.
- Build each contention as claim -> warrant -> impact, and explicitly link the impact back to the resolution.
- For rebuttal speeches, lead with direct refutation using the four-step method: "They said... / But that is not true because... / Here is the evidence... / Therefore..." — always address their STRONGEST argument first, never the weakest.
- Collapse the round rather than extending in the closing/whip speech: boil it down to 2-3 key clashes, weigh them, and do NOT introduce new material in the closing.
- Use "even if" (concession-based) arguments to appear reasonable while still winning the clash: "Even if you buy their second argument, we still win on X because..."
- End every speech by telling the judge exactly why your side met its burden and the other side did not.`,

  public_forum: `- Structure the case as: brief hook -> framework (a weighing standard both sides can meet) -> two well-developed contentions.
- Cite evidence in judge-friendly language every time: "According to Dr. Jane Smith of the Brookings Institution, in 2023..." — author, qualification, source, and date.
- Quantify and compare impacts on four scales: magnitude (how many are affected), probability, timeframe (how soon), and reversibility. PF rounds are won on weighing, not on volume of arguments.
- Extend arguments with three components: their rebuttal, your response to it, and why your original argument still stands.
- In summary-style speeches, condense the round: narrow to your 2 strongest voting issues and frontline (pre-empt answers) on your best argument.
- In final-focus-style closings: pick 1-2 clear voting issues, weigh them explicitly ("we outweigh on magnitude; theirs is non-unique"), and write for the judge's ballot — tell the story of the round in plain, persuasive language.
- Favor offense over defense: one turned argument beats four defensive responses.
- Never drop an argument — an unaddressed point is treated as conceded by most judges.`,

  model_un: `- Open formally ("Honorable Chair, fellow delegates...") and state your country's position on the topic within the first 15 seconds.
- Use the GSC structure: Goal — what you want the committee to achieve; Stake — why it matters, with one powerful example or statistic; Conflict — the obstacle or nuance, then your proposed solution.
- In moderated-caucus speeches, make ONE clear point in the time given: state the problem, give one piece of evidence, propose one concrete solution, then yield or end with a call for support.
- Propose realistic, specific solutions (funding mechanism, timeline, implementing body) rather than vague calls for "cooperation" or "awareness."
- Reference the committee's mandate and your bloc's position to build coalition credibility.
- End every speech with a direct call to action ("I urge all delegates to vote in favor...") or a signal to caucus ("I look forward to drafting a resolution with delegates who share this view").
- Use formal diplomatic language; never blame a specific country directly — frame critiques as concerns about policy, not personal attacks.`,

  model_congress: `- Sponsorship-style speech: introduce the legislation by name, establish the problem with cited evidence, explain exactly how the bill solves it (walk through the key sections in plain language), pre-empt the main counterargument, then close with the impact of passing it.
- Speeches run about 3 minutes followed by a questioning period — end on a memorable line before questions open, and be ready to defend every claim under direct questioning.
- Reference previous speakers by name and position ("As the senator from Texas argued..."), then extend their point or clash with it — judges score refutation and engagement, not repetition.
- In later speeches, crystallize: weigh the strongest arguments from both sides and tell the chamber exactly why the legislation should pass or fail.
- Tie every argument to real-world impact — who it affects, what it costs or saves, and what precedent it sets.
- For amendments: explain what changes, why it improves the bill, and why opponents should still support the amended version.
- Keep a congressional persona — address peers as "senator" or "representative" and speak through the chair.`,
};

const LABEL_TO_KEY = {
  parliamentary: 'parliamentary',
  public_forum: 'public_forum',
  'public forum': 'public_forum',
  model_un: 'model_un',
  'model un': 'model_un',
  mun: 'model_un',
  model_congress: 'model_congress',
  'model congress': 'model_congress',
  'congressional debate': 'model_congress',
  congress: 'model_congress',
};

/**
 * Returns the researched best-practice guide for a format, or '' when unknown.
 * Accepts project format enums ('public_forum') or display labels ('Public Forum').
 */
export function getSpeechFormatGuide(format) {
  if (!format) return '';
  const key = LABEL_TO_KEY[String(format).trim().toLowerCase()];
  return key ? GUIDES[key] : '';
}