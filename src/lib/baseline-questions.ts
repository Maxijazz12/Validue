import type { EvidenceCategory } from "@/lib/ai/types";

export interface BaselineQuestion {
  id: string;
  category: EvidenceCategory;
  text: string;
  options: string[];
  description: string;
}

export const BASELINE_QUESTIONS: BaselineQuestion[] = [
  // ─── Willingness (formerly Interest) ───
  {
    id: "bl-interest-1",
    category: "willingness",
    text: "How often do you actively look for a better way to handle this?",
    options: ["Every week", "Every month", "A few times a year", "Rarely or never"],
    description:
      "Measures active solution-seeking behavior — frequency reveals urgency.",
  },
  {
    id: "bl-interest-2",
    category: "willingness",
    text: "When was the last time you searched for a solution to this problem?",
    options: ["This week", "This month", "A while ago", "I've never looked"],
    description:
      "Tests recency of solution-seeking — recent search signals active pain.",
  },

  // ─── Willingness ───
  {
    id: "bl-willingness-1",
    category: "willingness",
    text: "What's the closest thing you've tried for this problem, and how long did you use it?",
    options: [
      "Currently using something",
      "Tried something but stopped",
      "Never tried anything",
      "I don't have this problem",
    ],
    description:
      "Reveals switching behavior and current solution satisfaction.",
  },
  {
    id: "bl-willingness-2",
    category: "willingness",
    text: "If you switched to a new tool for this, what would you lose from your current approach?",
    options: [
      "Nothing — my current approach doesn't work",
      "Some convenience",
      "Important features or workflows",
      "Too much — I'd never switch",
    ],
    description:
      "Measures switching cost — high cost means harder adoption.",
  },

  // ─── Price (formerly Payment) ───
  {
    id: "bl-payment-1",
    category: "price",
    text: "How much have you spent on tools or services for this problem in the past year?",
    options: ["$0 — only free options", "Under $50", "$50–$200", "Over $200"],
    description:
      "Reveals actual spending behavior — past spending predicts future willingness.",
  },
  {
    id: "bl-payment-2",
    category: "price",
    text: "What's the most you've paid for a single tool in this category?",
    options: [
      "Only free tools",
      "Under $10/month",
      "$10–$30/month",
      "$30+/month",
      "One-time purchase",
    ],
    description:
      "Establishes price ceiling from real purchase history.",
  },

  // ─── Behavior ───
  {
    id: "bl-behavior-1",
    category: "behavior",
    text: "What do you currently use to handle this?",
    options: [
      "A dedicated paid tool",
      "A free tool or app",
      "Spreadsheets or manual workaround",
      "Nothing — I just deal with it",
      "Not relevant to me",
    ],
    description:
      "Maps the competitive landscape through actual behavior.",
  },
  {
    id: "bl-behavior-2",
    category: "behavior",
    text: "How many times in the past week did you run into this problem?",
    options: [
      "0 times",
      "1–2 times",
      "3–5 times",
      "Daily",
      "Multiple times a day",
    ],
    description:
      "Measures problem frequency — daily problems justify daily-use products.",
  },

  // ─── Pain ───
  {
    id: "bl-pain-1",
    category: "pain",
    text: "What did you most recently give up on or work around because of this problem?",
    options: [
      "Gave up on a task entirely",
      "Found a clunky workaround",
      "Paid for a partial fix",
      "Nothing — it's not really a problem for me",
    ],
    description:
      "Surfaces real cost of the problem through recent concrete experience.",
  },
  {
    id: "bl-pain-2",
    category: "pain",
    text: "How much time do you waste on this problem per week?",
    options: ["None", "Under 30 minutes", "30 minutes to 2 hours", "Over 2 hours"],
    description:
      "Quantifies time cost — high time waste signals willingness to pay for a solution.",
  },
];

/**
 * Recommend the best 3 baseline questions for a given idea.
 * Uses keyword matching to select diverse categories.
 */
export function recommendBaseline(scribbleText: string): BaselineQuestion[] {
  const text = scribbleText.toLowerCase();

  // Score each category based on keyword presence (only categories with baseline questions)
  const categoryScores: Partial<Record<EvidenceCategory, number>> = {
    willingness: 2, // always useful — default fallback (includes old "interest" baselines)
    price: 0,
    behavior: 0,
    pain: 0,
  };

  // Price signals
  if (/pay|price|cost|subscri|revenue|monetiz|free|premium|charge/.test(text)) {
    categoryScores.price! += 3;
  }

  // Behavior signals
  if (/current|today|already|existing|how do|workaround|manual|process|workflow/.test(text)) {
    categoryScores.behavior! += 3;
  }

  // Pain signals
  if (/frustrat|annoying|painful|slow|broken|hate|waste|tedious|struggle|difficult/.test(text)) {
    categoryScores.pain! += 3;
  }

  // Willingness signals
  if (/try|switch|adopt|replace|use|download|sign up/.test(text)) {
    categoryScores.willingness! += 2;
  }

  // Sort categories by score descending, pick top 3
  const topCategories = (Object.entries(categoryScores) as [EvidenceCategory, number][])
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
