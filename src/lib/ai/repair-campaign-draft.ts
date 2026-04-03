import { EXPERTISE_OPTIONS, INTEREST_OPTIONS } from "@/lib/constants";
import {
  questionId,
  type CampaignDraft,
  type DraftAudience,
  type DraftQuestion,
  type EvidenceCategory,
} from "./types";

type InterestOption = (typeof INTEREST_OPTIONS)[number];
type ExpertiseOption = (typeof EXPERTISE_OPTIONS)[number];

type AssumptionBundle = {
  index: number;
  assumption: string;
  questions: DraftQuestion[];
  categoryCount: number;
  hasNegative: boolean;
  isMonetization: boolean;
  score: number;
};

const PLAN_BY_FORMAT = {
  quick: {
    maxAssumptions: 2,
    questionsPerAssumption: 3,
  },
  standard: {
    maxAssumptions: 3,
    questionsPerAssumption: 3,
  },
} as const;

const INTEREST_PATTERNS: Record<InterestOption, RegExp[]> = {
  SaaS: [/\bsaas\b/i, /\bb2b\b/i, /\bworkflow\b/i, /\bdashboard\b/i, /\bsubscription\b/i],
  Consumer: [/\bconsumer\b/i, /\bhome\b/i, /\bpersonal\b/i, /\badults?\b/i, /\blifestyle\b/i],
  Health: [/\bhealth\b/i, /\bfitness\b/i, /\bworkout\b/i, /\bexercise\b/i, /\binjur/i, /\bwellness\b/i],
  Fintech: [/\bfintech\b/i, /\bfinance\b/i, /\bbudget\b/i, /\binvest/i, /\bpayment\b/i],
  Education: [/\beducation\b/i, /\bstudent\b/i, /\blearn/i, /\bcourse\b/i, /\bstudy\b/i],
  Marketplace: [/\bmarketplace\b/i, /\bmatch/i, /\brent/i, /\bbook\b/i, /\btwo-sided\b/i],
  "AI/ML": [/\bmachine learning\b/i, /\bllm\b/i, /\bgpt\b/i, /\bmodel\b/i, /\bprompt\b/i],
  Gaming: [/\bgaming\b/i, /\bgame\b/i, /\besports?\b/i],
  Climate: [/\bclimate\b/i, /\bcarbon\b/i, /\bsustain/i],
  "Creator Economy": [/\bcreator\b/i, /\binfluencer\b/i, /\byoutube\b/i, /\btiktok\b/i, /\bcontent\b/i],
  "E-commerce": [/\be-commerce\b/i, /\becommerce\b/i, /\bshop/i, /\bretail\b/i],
  "Food & Bev": [/\bfood\b/i, /\bmeal\b/i, /\brestaurant\b/i, /\bbeverage\b/i],
};

const EXPERTISE_PATTERNS: Record<ExpertiseOption, RegExp[]> = {
  Developer: [/\bdeveloper\b/i, /\bengineer\b/i, /\bcode\b/i, /\bapi\b/i],
  Designer: [/\bdesigner\b/i, /\bdesign\b/i, /\bui\b/i, /\bux\b/i, /\bfigma\b/i],
  Marketer: [/\bmarketer\b/i, /\bmarketing\b/i, /\bgrowth\b/i, /\bseo\b/i, /\bads\b/i],
  Founder: [/\bfounder\b/i, /\bstartup\b/i, /\bentrepreneur\b/i, /\bco-founder\b/i],
  Student: [/\bstudent\b/i, /\bcollege\b/i, /\buniversity\b/i],
  "Product Manager": [/\bproduct manager\b/i, /\bpm\b/i, /\broadmap\b/i],
  "Data/Analytics": [/\bdata\b/i, /\banalytics\b/i, /\banalyst\b/i, /\bmetrics\b/i],
  Sales: [/\bsales reps?\b/i, /\baccount executives?\b/i, /\bprospect\b/i, /\bpipeline\b/i, /\bbdr\b/i, /\bsdr\b/i],
  Operations: [/\boperations\b/i, /\bops\b/i, /\blogistics\b/i, /\binventory\b/i, /\bordering\b/i, /\bback-of-house\b/i, /\bsupply chain\b/i],
  "Healthcare Pro": [/\btherapist\b/i, /\bphysio\b/i, /\bclinician\b/i, /\bdoctor\b/i, /\bnurse\b/i, /\bhealthcare professional\b/i],
  "Finance Pro": [/\bfinance professional\b/i, /\bbanker\b/i, /\baccountant\b/i, /\bcfo\b/i],
};

const TAG_PATTERN_OVERRIDES: Record<string, RegExp[]> = {
  Managers: [/\bmanagers?\b/i, /\bteam leads?\b/i, /\bpeople managers?\b/i],
  "Knowledge Workers": [/\bknowledge workers?\b/i, /\bknowledge-work\b/i],
  "Remote Teams": [
    /\bremote teams?\b/i,
    /\bdistributed teams?\b/i,
    /\bhybrid teams?\b/i,
    /\bvideo meetings?\b/i,
    /\bzoom\b/i,
    /\bgoogle meet\b/i,
    /\bmicrosoft teams?\b/i,
  ],
  "Product Managers": [/\bproduct managers?\b/i],
  Operations: [/\boperations\b/i, /\bops\b/i],
  "Busy Professionals": [/\bbusy professionals?\b/i, /\bworking professionals?\b/i],
  "Home Workout Users": [/\bhome workout\b/i, /\bwork(?:ing)? out at home\b/i, /\bexercise at home\b/i],
  "Fitness Enthusiasts": [/\bfitness enthusiasts?\b/i, /\bfitness\b/i, /\bworkouts?\b/i],
  "Injury-Prone Athletes": [/\binjury-prone athletes?\b/i, /\bphysical limitations?\b/i, /\binjur/i],
};

const GENERIC_TAG_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "group",
  "people",
  "teams",
  "users",
]);

const BROAD_ROLE_TAGS = new Set(
  [
    ...EXPERTISE_OPTIONS,
    "Developers",
    "Designers",
    "Marketers",
    "Founders",
    "Students",
    "Product Managers",
    "Analysts",
    "Operations",
    "Sales",
  ].map((value) => value.toLowerCase())
);

const NON_MONETIZATION_PRIORITY: EvidenceCategory[] = [
  "behavior",
  "attempts",
  "pain",
  "willingness",
  "price",
];

const MONETIZATION_PRIORITY: EvidenceCategory[] = [
  "price",
  "willingness",
  "behavior",
  "attempts",
  "pain",
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeToken(token: string): string {
  const normalized = token.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (normalized.length > 4 && normalized.endsWith("ies")) {
    return `${normalized.slice(0, -3)}y`;
  }
  if (normalized.length > 3 && normalized.endsWith("s")) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function tagTokens(tag: string): string[] {
  const normalized = tag
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length >= 3 && !GENERIC_TAG_STOPWORDS.has(token));

  return [...new Set(normalized)];
}

function isMonetizationAssumption(assumption: string, questions: DraftQuestion[]): boolean {
  if (questions.some((question) => question.category === "price" || question.category === "willingness")) {
    return true;
  }

  return /\b(pay|price|cost|spend|subscription|monthly|per month|budget|purchase|switch)\b/i.test(
    assumption
  );
}

function assumptionBundles(draft: CampaignDraft): AssumptionBundle[] {
  const customQuestions = draft.questions.filter((question) => !question.isBaseline);

  return draft.assumptions.map((assumption, index) => {
    const questions = customQuestions.filter((question) => question.assumptionIndex === index);
    const categories = new Set(
      questions
        .map((question) => question.category)
        .filter((category): category is EvidenceCategory => Boolean(category))
    );
    const hasNegative = categories.has("negative");
    const monetization = isMonetizationAssumption(assumption, questions);

    return {
      index,
      assumption,
      questions,
      categoryCount: categories.size,
      hasNegative,
      isMonetization: monetization,
      score:
        questions.length * 4 +
        categories.size * 6 +
        (hasNegative ? 5 : 0) +
        (monetization ? 3 : 0),
    };
  });
}

function pickAssumptionIndexes(draft: CampaignDraft, maxAssumptions: number): number[] {
  const bundles = assumptionBundles(draft)
    .filter((bundle) => bundle.questions.length > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  if (bundles.length <= maxAssumptions) {
    return bundles.map((bundle) => bundle.index);
  }

  const picked = new Set<number>();
  const monetizationBundle = bundles.find((bundle) => bundle.isMonetization);
  if (monetizationBundle) {
    picked.add(monetizationBundle.index);
  }

  for (const bundle of bundles) {
    if (picked.size >= maxAssumptions) break;
    picked.add(bundle.index);
  }

  return [...picked].sort((left, right) => left - right);
}

function hasDisconfirmationOption(question: DraftQuestion): boolean {
  const options = question.options ?? [];
  return options.some((option) =>
    /not (a |interested|a problem)|never|0 |don't|doesn't apply|none of|already|not relevant|happy with/i.test(
      option.toLowerCase()
    )
  );
}

function categoryPriority(
  assumption: string,
  questions: DraftQuestion[]
): EvidenceCategory[] {
  const priority = isMonetizationAssumption(assumption, questions)
    ? MONETIZATION_PRIORITY
    : NON_MONETIZATION_PRIORITY;
  const existingCategories = new Set(
    questions
      .map((question) => question.category)
      .filter((category): category is EvidenceCategory => Boolean(category) && category !== "negative")
  );

  const chosen: EvidenceCategory[] = [];

  for (const category of priority) {
    if (existingCategories.has(category) && !chosen.includes(category)) {
      chosen.push(category);
    }
    if (chosen.length === 2) break;
  }

  for (const category of priority) {
    if (chosen.length >= 2) break;
    if (!chosen.includes(category)) {
      chosen.push(category);
    }
  }

  return [...chosen, "negative"];
}

function questionScore(question: DraftQuestion, targetCategory: EvidenceCategory): number {
  let score = 0;
  if (question.category === targetCategory) score += 100;
  if (targetCategory === "attempts" && question.type === "open") score += 25;
  if (question.type === "multiple_choice") score += 10;
  if (question.type === "open" && (question.anchors?.length ?? 0) >= 2) score += 8;
  if (targetCategory === "negative" && hasDisconfirmationOption(question)) score += 8;
  if (
    (targetCategory === "price" || targetCategory === "willingness") &&
    question.section === "followup"
  ) {
    score += 5;
  }
  if (
    targetCategory !== "price" &&
    targetCategory !== "willingness" &&
    question.section === "open"
  ) {
    score += 3;
  }
  score += Math.min(question.text.length / 40, 4);
  return score;
}

function extractTopic(assumption: string, summary: string): string {
  const normalized = normalizeWhitespace(assumption).replace(/\.$/, "");
  const lower = normalized.toLowerCase();

  const notAlreadyMatch = normalized.match(
    /\bwho\s+(.+?)\s+(?:are|is)\s+not already\b/i
  );
  if (notAlreadyMatch) {
    return normalizeWhitespace(notAlreadyMatch[1]);
  }

  const becauseIndex = lower.indexOf(" because ");
  if (becauseIndex !== -1) {
    return normalized.slice(becauseIndex + " because ".length);
  }

  const ifIndex = lower.indexOf(" if ");
  if (ifIndex !== -1) {
    return normalized.slice(ifIndex + " if ".length);
  }

  const currentlyIndex = lower.indexOf(" currently ");
  if (currentlyIndex !== -1) {
    return normalized.slice(currentlyIndex + " currently ".length);
  }

  const whoPredicateMatch = normalized.match(
    /\bwho\s+(.+?)\s+(?:are|is|would)\b/i
  );
  if (whoPredicateMatch) {
    return normalizeWhitespace(whoPredicateMatch[1]);
  }

  return normalizeWhitespace(summary.split(".")[0] ?? normalized).replace(/\.$/, "");
}

export function buildSyntheticQuestion(
  assumption: string,
  summary: string,
  category: EvidenceCategory,
  assumptionIndex: number
): DraftQuestion {
  const topic = extractTopic(assumption, summary);

  switch (category) {
    case "behavior":
      return {
        id: questionId(),
        text: `In the past month, how many times has this happened for you: ${topic}?`,
        type: "multiple_choice",
        options: [
          "0 times - this has not been a real issue",
          "1-2 times",
          "3-5 times",
          "6+ times",
          "I do not use anything for this today",
        ],
        section: "open",
        isBaseline: false,
        category,
        assumptionIndex,
      };
    case "attempts":
      return {
        id: questionId(),
        text: `When ${topic}, what do you usually do today instead?`,
        type: "open",
        options: null,
        section: "open",
        isBaseline: false,
        category,
        assumptionIndex,
        anchors: [
          "Name the tool, workaround, or person you rely on",
          "Include what happens next",
        ],
      };
    case "pain":
      return {
        id: questionId(),
        text: `When ${topic}, what is the biggest cost to you?`,
        type: "multiple_choice",
        options: [
          "No real cost - I adjust easily",
          "A little extra friction or time",
          "I skip part of what I planned",
          "I abandon it entirely",
          "I pay extra or need help to work around it",
        ],
        section: "open",
        isBaseline: false,
        category,
        assumptionIndex,
      };
    case "price":
      return {
        id: questionId(),
        text: "How much do you currently spend per month on tools, apps, or services related to this?",
        type: "multiple_choice",
        options: [
          "$0 - I only use free options",
          "Under $10/month",
          "$10-20/month",
          "$20-50/month",
          "$50+/month",
        ],
        section: "followup",
        isBaseline: false,
        category,
        assumptionIndex,
      };
    case "willingness":
      return {
        id: questionId(),
        text: "If a solution fixed this reliably right now, what would you realistically pay per month?",
        type: "multiple_choice",
        options: [
          "$0 - I would not pay for this",
          "$5-10/month",
          "$10-20/month",
          "$20-40/month",
          "I would pay once for lifetime access, not monthly",
        ],
        section: "followup",
        isBaseline: false,
        category,
        assumptionIndex,
      };
    case "negative":
      return {
        id: questionId(),
        text: "What is the strongest reason you would NOT switch to a new solution for this?",
        type: "multiple_choice",
        options: [
          "My current approach already works well enough",
          "The problem is too minor to pay for",
          "I do not trust a new solution to handle my situation",
          "Switching would take too much effort",
          "I do not run into this problem consistently",
        ],
        section: "open",
        isBaseline: false,
        category,
        assumptionIndex,
      };
  }
}

function remapQuestion(question: DraftQuestion, assumptionIndex: number): DraftQuestion {
  return {
    ...question,
    assumptionIndex,
    anchors: question.type === "open" && (question.anchors?.length ?? 0) > 0 ? question.anchors : undefined,
    options: question.type === "multiple_choice" ? question.options ?? [] : null,
  };
}

function repairQuestionsForAssumption(
  assumption: string,
  summary: string,
  questions: DraftQuestion[],
  nextAssumptionIndex: number
): DraftQuestion[] {
  const remaining = [...questions];
  const repaired: DraftQuestion[] = [];
  const targets = categoryPriority(assumption, questions);

  for (const target of targets) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index = 0; index < remaining.length; index++) {
      const question = remaining[index];
      if (question.category !== target) continue;
      const score = questionScore(question, target);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex !== -1) {
      const [picked] = remaining.splice(bestIndex, 1);
      repaired.push(remapQuestion(picked, nextAssumptionIndex));
      continue;
    }

    repaired.push(buildSyntheticQuestion(assumption, summary, target, nextAssumptionIndex));
  }

  return repaired;
}

function textMatches(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce(
    (score, pattern) => score + (pattern.test(text) ? 2 : 0),
    0
  );
}

function repairInterests(draft: CampaignDraft, text: string): InterestOption[] {
  const current = new Set(draft.audience.interests.filter((value): value is InterestOption =>
    (INTEREST_OPTIONS as readonly string[]).includes(value)
  ));

  const scored = INTEREST_OPTIONS.map((option) => {
    let score = textMatches(text, INTEREST_PATTERNS[option]);
    if (current.has(option)) score += 1;
    if (draft.category === option) score += 5;
    if (option === "AI/ML" && draft.category !== "AI/ML") score -= 2;
    if (option === "SaaS" && /\bhome\b|\bconsumer\b|\bfitness\b|\bworkout\b/i.test(text)) score -= 2;
    return { option, score };
  })
    .filter(({ score }) => score >= 2)
    .sort((left, right) => right.score - left.score);

  const picked = scored.slice(0, 3).map(({ option }) => option);
  if (picked.length > 0) return picked;

  if ((INTEREST_OPTIONS as readonly string[]).includes(draft.category)) {
    return [draft.category as InterestOption];
  }

  return ["Consumer"];
}

function repairExpertise(draft: CampaignDraft, text: string): ExpertiseOption[] {
  const current = new Set(draft.audience.expertise.filter((value): value is ExpertiseOption =>
    (EXPERTISE_OPTIONS as readonly string[]).includes(value)
  ));

  const looksLikeGeneralConsumerAudience =
    /\b(adults?|parents?|families|consumers?|home workout|fitness enthusiasts|busy professionals|people)\b/i.test(
      text
    ) &&
    !/\b(developer|designer|marketer|founder|student|product manager|analyst|sales|operations)\b/i.test(
      text
    );

  const scored = EXPERTISE_OPTIONS.map((option) => {
    let score = textMatches(text, EXPERTISE_PATTERNS[option]);
    if (current.has(option)) score += 1;
    return { option, score };
  })
    .filter(({ score }) => score >= 2)
    .sort((left, right) => right.score - left.score);

  if (looksLikeGeneralConsumerAudience && scored.every(({ score }) => score < 4)) {
    return [];
  }

  return scored.slice(0, 2).map(({ option }) => option);
}

function tagEvidenceScore(tag: string, evidenceText: string): number {
  const normalizedTag = normalizeWhitespace(tag);
  const lowerText = evidenceText.toLowerCase();
  let score = 0;

  if (lowerText.includes(normalizedTag.toLowerCase())) {
    score += 8;
  }

  for (const pattern of TAG_PATTERN_OVERRIDES[normalizedTag] ?? []) {
    if (pattern.test(evidenceText)) {
      score += 3;
    }
  }

  const tokens = tagTokens(normalizedTag);
  if (tokens.length > 0) {
    const matchedTokens = tokens.filter((token) =>
      new RegExp(`\\b${escapeRegExp(token)}(?:s|es)?\\b`, "i").test(evidenceText)
    ).length;

    if (matchedTokens === tokens.length) {
      score += 4;
    } else if (matchedTokens >= Math.ceil(tokens.length / 2)) {
      score += 2;
    } else if (matchedTokens >= 1) {
      score += 1;
    }
  }

  if (BROAD_ROLE_TAGS.has(normalizedTag.toLowerCase()) && score < 6) {
    score -= 3;
  }

  return score;
}

function repairTags(draft: CampaignDraft): string[] {
  const evidenceText = normalizeWhitespace(
    [
      draft.title,
      draft.summary,
      ...draft.assumptions,
      draft.audience.occupation,
      draft.audience.industry,
      draft.audience.nicheQualifier,
    ].join(" ")
  );

  const uniqueTags = [...new Set(draft.tags.map((tag) => normalizeWhitespace(tag)).filter(Boolean))];

  return uniqueTags
    .map((tag, index) => ({
      tag,
      index,
      score: tagEvidenceScore(tag, evidenceText),
    }))
    .filter(({ score }) => score >= 3)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 4)
    .map(({ tag }) => tag);
}

function repairAudience(draft: CampaignDraft): DraftAudience {
  const interestText = normalizeWhitespace(
    [
      draft.title,
      draft.summary,
      ...draft.tags,
      ...draft.assumptions,
      draft.audience.industry,
      draft.audience.occupation,
      draft.audience.nicheQualifier,
    ].join(" ")
  );

  const expertiseText = normalizeWhitespace(
    [
      draft.title,
      draft.summary,
      ...draft.assumptions,
      draft.audience.industry,
      draft.audience.occupation,
      draft.audience.nicheQualifier,
    ].join(" ")
  );

  const interests = repairInterests(draft, interestText);
  const expertise = repairExpertise(draft, expertiseText);

  return {
    ...draft.audience,
    interests,
    expertise,
    ageRanges: draft.audience.ageRanges.slice(0, 2),
    location: draft.audience.location.trim(),
    occupation: draft.audience.occupation.trim(),
    industry: draft.audience.industry.trim(),
    experienceLevel: draft.audience.experienceLevel.trim(),
    nicheQualifier: draft.audience.nicheQualifier.trim(),
  };
}

export function repairCampaignDraft(draft: CampaignDraft): CampaignDraft {
  const format = draft.format === "standard" ? "standard" : "quick";
  const plan = PLAN_BY_FORMAT[format];
  const repairedAudience = repairAudience(draft);
  const repairedTags = repairTags(draft);
  const baselineQuestions = draft.questions.filter((question) => question.isBaseline);
  const customQuestions = draft.questions.filter((question) => !question.isBaseline);

  const keptAssumptionIndexes = pickAssumptionIndexes(draft, plan.maxAssumptions);
  const nextQuestions: DraftQuestion[] = [];
  const nextAssumptions: string[] = [];

  keptAssumptionIndexes.forEach((assumptionIndex, nextIndex) => {
    nextAssumptions.push(draft.assumptions[assumptionIndex]);
    const mappedQuestions = customQuestions.filter(
      (question) => question.assumptionIndex === assumptionIndex
    );
    nextQuestions.push(
      ...repairQuestionsForAssumption(
        draft.assumptions[assumptionIndex],
        draft.summary,
        mappedQuestions,
        nextIndex
      )
    );
  });

  return {
    ...draft,
    tags: repairedTags,
    assumptions: nextAssumptions,
    questions: [...nextQuestions, ...baselineQuestions],
    audience: repairedAudience,
  };
}
