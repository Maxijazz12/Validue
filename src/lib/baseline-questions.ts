import type { BaselineCategory } from "@/lib/ai/types";

export interface BaselineQuestion {
  id: string;
  category: BaselineCategory;
  text: string;
  options: string[];
  description: string;
}

export const BASELINE_QUESTIONS: BaselineQuestion[] = [
  // ─── Interest ───
  {
    id: "bl-interest-1",
    category: "interest",
    text: "Would you consider using something like this?",
    options: ["Yes", "No", "I'm open to it"],
    description: "Measures baseline interest in the concept.",
  },
  {
    id: "bl-interest-2",
    category: "interest",
    text: "How relevant is this problem to your daily life or work?",
    options: ["Very relevant", "Somewhat relevant", "Not relevant"],
    description: "Gauges how strongly the problem resonates.",
  },

  // ─── Willingness ───
  {
    id: "bl-willingness-1",
    category: "willingness",
    text: "If this existed today, would you try it?",
    options: ["Yes", "Maybe", "No"],
    description: "Tests willingness to adopt a new solution.",
  },
  {
    id: "bl-willingness-2",
    category: "willingness",
    text: "Would you recommend something like this to a friend or colleague?",
    options: ["Definitely", "Possibly", "Unlikely"],
    description: "Measures advocacy potential and perceived value.",
  },

  // ─── Payment ───
  {
    id: "bl-payment-1",
    category: "payment",
    text: "Would you pay for something like this if it solved the problem well?",
    options: ["Yes", "Maybe", "No"],
    description: "Tests willingness to pay for a solution.",
  },
  {
    id: "bl-payment-2",
    category: "payment",
    text: "What would you expect to pay for a solution like this?",
    options: ["Free", "Under $10/mo", "$10–$30/mo", "$30+/mo", "One-time purchase"],
    description: "Gauges price sensitivity and expectations.",
  },

  // ─── Behavior ───
  {
    id: "bl-behavior-1",
    category: "behavior",
    text: "How do you currently handle this problem?",
    options: ["Existing solution", "Manual workaround", "Ignore it", "Not relevant to me"],
    description: "Reveals current behavior and alternatives.",
  },
  {
    id: "bl-behavior-2",
    category: "behavior",
    text: "How often do you encounter this problem?",
    options: ["Daily", "Weekly", "Monthly", "Rarely", "Never"],
    description: "Measures frequency and urgency of the pain point.",
  },

  // ─── Pain ───
  {
    id: "bl-pain-1",
    category: "pain",
    text: "How frustrated are you with the current way you handle this?",
    options: ["Very frustrated", "Somewhat frustrated", "Not frustrated", "I don't deal with this"],
    description: "Measures pain intensity around the problem.",
  },
  {
    id: "bl-pain-2",
    category: "pain",
    text: "If you could wave a magic wand and fix one thing about this problem, how impactful would that be?",
    options: ["Life-changing", "Very helpful", "Nice to have", "Wouldn't matter"],
    description: "Tests perceived impact of solving the problem.",
  },
];

/**
 * Recommend the best 3 baseline questions for a given idea.
 * Uses keyword matching to select diverse categories.
 */
export function recommendBaseline(scribbleText: string): BaselineQuestion[] {
  const text = scribbleText.toLowerCase();

  // Score each category based on keyword presence
  const categoryScores: Record<BaselineCategory, number> = {
    interest: 1, // always useful — default fallback
    willingness: 1,
    payment: 0,
    behavior: 0,
    pain: 0,
  };

  // Payment signals
  if (/pay|price|cost|subscri|revenue|monetiz|free|premium|charge/.test(text)) {
    categoryScores.payment += 3;
  }

  // Behavior signals
  if (/current|today|already|existing|how do|workaround|manual|process|workflow/.test(text)) {
    categoryScores.behavior += 3;
  }

  // Pain signals
  if (/frustrat|annoying|painful|slow|broken|hate|waste|tedious|struggle|difficult/.test(text)) {
    categoryScores.pain += 3;
  }

  // Willingness signals
  if (/try|switch|adopt|replace|use|download|sign up/.test(text)) {
    categoryScores.willingness += 2;
  }

  // Sort categories by score descending, pick top 3
  const topCategories = (Object.entries(categoryScores) as [BaselineCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  // Pick the first question from each top category
  const selected: BaselineQuestion[] = [];
  for (const cat of topCategories) {
    const q = BASELINE_QUESTIONS.find((bq) => bq.category === cat);
    if (q) selected.push(q);
  }

  return selected;
}
