import { questionId as uid, type CampaignDraft, type DraftQuestion } from "./types";
import { CATEGORY_OPTIONS, INDUSTRY_OPTIONS } from "@/lib/constants";
import { recommendBaseline } from "@/lib/baseline-questions";

function extractTitle(text: string): string {
  // Try to extract a descriptive title, not just first sentence
  const firstSentence = text.match(/^[^.!?\n]+[.!?]?/);
  const raw = firstSentence ? firstSentence[0].trim() : text.slice(0, 80).trim();
  // Cap at 80 chars
  return raw.length > 80 ? raw.slice(0, 77) + "…" : raw;
}

function buildSummary(text: string): string {
  // Clean up and cap at 400 chars with proper sentence ending
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 400) return cleaned;
  const truncated = cleaned.slice(0, 397);
  const lastPeriod = truncated.lastIndexOf(".");
  if (lastPeriod > 200) return truncated.slice(0, lastPeriod + 1);
  return truncated + "…";
}

/* ─── Category Inference ─── */

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  const keywords: Record<string, string[]> = {
    SaaS: ["saas", "software", "platform", "dashboard", "tool", "api", "b2b", "subscription"],
    Consumer: ["consumer", "everyday", "shopping", "lifestyle", "social media", "dating", "entertainment"],
    Health: ["health", "fitness", "wellness", "medical", "mental health", "therapy", "nutrition", "diet"],
    Fintech: ["finance", "fintech", "banking", "payment", "money", "invest", "crypto", "budget", "savings"],
    Education: ["education", "learn", "student", "course", "study", "school", "teach", "tutor", "training"],
    Marketplace: ["marketplace", "connect buyers", "matching", "two-sided", "hire", "rent", "book"],
    "AI/ML": ["ai ", "machine learning", "gpt", "llm", "automat", "intelligent", "neural", "generative"],
  };
  let best = "Other";
  let bestScore = 0;
  for (const [cat, kws] of Object.entries(keywords)) {
    const score = kws.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return CATEGORY_OPTIONS.includes(best as (typeof CATEGORY_OPTIONS)[number])
    ? best
    : "Other";
}

/* ─── Tag Inference (expanded) ─── */

function inferTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tagMap: Record<string, string[]> = {
    Students: ["student", "college", "university", "school", "campus"],
    Founders: ["founder", "startup", "entrepreneur", "bootstrapp"],
    Developers: ["developer", "engineer", "code", "programming", "github"],
    Designers: ["design", "ui", "ux", "creative", "figma"],
    "Remote Workers": ["remote", "work from home", "distributed", "wfh"],
    Parents: ["parent", "family", "kids", "children", "mom", "dad"],
    Freelancers: ["freelanc", "contract", "independent", "solopreneur"],
    "Small Business": ["small business", "smb", "local business", "shop owner", "retail"],
    "Health-Conscious": ["health", "fitness", "wellness", "diet", "nutrition", "gym"],
    Creators: ["creator", "content", "youtube", "tiktok", "influencer", "podcast"],
    "Gen Z": ["gen z", "teen", "young", "tiktok"],
    Professionals: ["professional", "career", "corporate", "enterprise"],
    Travelers: ["travel", "nomad", "trip", "flight", "hotel", "booking"],
    Gamers: ["game", "gaming", "esport", "twitch"],
    "Pet Owners": ["pet", "dog", "cat", "vet"],
  };
  const tags: string[] = [];
  for (const [tag, kws] of Object.entries(tagMap)) {
    if (kws.some((k) => lower.includes(k))) tags.push(tag);
  }
  return tags.length > 0 ? tags.slice(0, 4) : ["General"];
}

/* ─── Audience Inference (improved) ─── */

function inferAudience(text: string) {
  const lower = text.toLowerCase();

  const interests: string[] = [];
  if (/saas|software|tool|b2b/.test(lower)) interests.push("SaaS");
  if (/\bai\b|machine|automat|gpt|llm/.test(lower)) interests.push("AI/ML");
  if (/health|fitness|wellness|nutrition/.test(lower)) interests.push("Health");
  if (/financ|money|pay|invest|budget|crypto/.test(lower)) interests.push("Fintech");
  if (/learn|student|educ|school|course|tutor/.test(lower)) interests.push("Education");
  if (/shop|ecommerce|retail|store/.test(lower)) interests.push("E-commerce");
  if (/game|gaming|esport/.test(lower)) interests.push("Gaming");
  if (/creator|content|youtube|tiktok|podcast/.test(lower)) interests.push("Creator Economy");
  if (/climate|sustain|green|carbon/.test(lower)) interests.push("Climate");
  if (/food|restaurant|meal|recipe|cook/.test(lower)) interests.push("Food & Bev");
  if (interests.length === 0) interests.push("Consumer");

  const expertise: string[] = [];
  if (/developer|engineer|code|programming/.test(lower)) expertise.push("Developer");
  if (/design|ui|ux|figma/.test(lower)) expertise.push("Designer");
  if (/market|growth|seo|ads/.test(lower)) expertise.push("Marketer");
  if (/founder|startup|entrepreneur/.test(lower)) expertise.push("Founder");
  if (/student|college|university/.test(lower)) expertise.push("Student");
  if (/product|pm|roadmap/.test(lower)) expertise.push("Product Manager");
  if (/data|analytics|metric/.test(lower)) expertise.push("Data/Analytics");
  if (/sales|revenue|deal/.test(lower)) expertise.push("Sales");
  if (expertise.length === 0) expertise.push("Founder");

  const ageRanges: string[] = [];
  if (/student|college|gen z|teen|young/.test(lower)) ageRanges.push("18-24");
  if (/professional|career|millennial|early career/.test(lower)) ageRanges.push("25-34");
  if (/senior|manager|executive|experienced/.test(lower)) ageRanges.push("35-44");
  if (ageRanges.length === 0) ageRanges.push("25-34");

  // Industry inference
  let industry = "";
  const industryMap: Record<string, string[]> = {
    Technology: ["software", "saas", "tech", "app", "api", "developer"],
    Healthcare: ["health", "medical", "clinic", "patient", "doctor", "therapy"],
    Finance: ["finance", "banking", "invest", "trading", "insurance"],
    Education: ["education", "school", "university", "course", "tutor"],
    "E-commerce": ["ecommerce", "shop", "retail", "store", "buy"],
    "Food & Beverage": ["food", "restaurant", "meal", "recipe", "coffee"],
    "Media & Entertainment": ["media", "content", "video", "music", "entertainment"],
  };
  for (const [ind, kws] of Object.entries(industryMap)) {
    if (kws.some((k) => lower.includes(k)) && INDUSTRY_OPTIONS.includes(ind as (typeof INDUSTRY_OPTIONS)[number])) {
      industry = ind;
      break;
    }
  }

  // Occupation inference
  let occupation = "";
  if (/freelanc/.test(lower)) occupation = "Freelancer";
  else if (/student/.test(lower)) occupation = "Student";
  else if (/founder|ceo/.test(lower)) occupation = "Founder / CEO";
  else if (/developer|engineer/.test(lower)) occupation = "Software Engineer";
  else if (/designer/.test(lower)) occupation = "Designer";
  else if (/manager/.test(lower)) occupation = "Manager";

  return {
    interests,
    expertise,
    ageRanges,
    location: "",
    occupation,
    industry,
    experienceLevel: "",
    nicheQualifier: "",
  };
}

/* ─── Assumption Generation (scribble-aware) ─── */

function generateAssumptions(text: string): string[] {
  const assumptions: string[] = [];
  const lower = text.toLowerCase();

  // Core: problem frequency
  assumptions.push(
    "The target audience encounters this problem frequently enough to actively seek a solution."
  );

  // Payment willingness
  if (/pay|price|cost|monetiz|revenue|subscri|premium/.test(lower)) {
    assumptions.push("Users are willing to pay a recurring fee for a reliable solution to this problem.");
  } else {
    assumptions.push("There is enough perceived value that users would consider paying for a dedicated solution.");
  }

  // Competitive landscape
  if (/exist|current|already|competitor|alternative|switch/.test(lower)) {
    assumptions.push("Current solutions leave meaningful gaps that a focused product could fill.");
  } else {
    assumptions.push("No existing solution adequately serves this specific audience and use case.");
  }

  // Collaboration / virality
  if (/team|collaborat|share|group|community/.test(lower)) {
    assumptions.push("The value increases when multiple people in the same team or group use it.");
  }

  // Trust / adoption
  if (/ai|automat|machine|gpt/.test(lower)) {
    assumptions.push("Users trust AI-generated outputs enough to act on them without manual verification.");
  } else if (/data|privacy|security/.test(lower)) {
    assumptions.push("Users will share the necessary data if they trust the product handles it securely.");
  }

  return assumptions.slice(0, 5);
}

/* ─── Open Question Templates (expanded) ─── */

const OPEN_TEMPLATES: { text: string; keywords?: RegExp }[] = [
  { text: "Walk me through how you currently deal with this problem. What does a typical experience look like?" },
  { text: "What's the most frustrating part of the way things work today?" },
  { text: "What tools or services have you tried for this? What made you stop using them?", keywords: /tool|app|software|platform/ },
  { text: "Have you ever looked for a solution to this? What happened?", keywords: /problem|issue|pain|frustrat/ },
  { text: "When was the last time this problem really got in your way? What happened?", keywords: /time|slow|waste|tedious/ },
  { text: "How often do you run into this problem, and what do you usually do when it happens?" },
  { text: "What does your current workflow look like for handling this? Walk me through the steps.", keywords: /process|workflow|manual/ },
  { text: "Who else is affected when this problem comes up — just you, or others too?" },
  { text: "If you could change one thing about how you handle this today, what would it be?" },
  { text: "What have you spent time or money on to try to solve this, even partially?", keywords: /pay|cost|money|spend/ },
];

const FOLLOWUP_TEMPLATES: { text: string; keywords?: RegExp }[] = [
  { text: "What would need to be true for you to try this in the first week it launched?" },
  { text: "If this solved the problem perfectly, what would change about your day-to-day?" },
  { text: "What would make you confident enough to pay for this before seeing full results?", keywords: /pay|price|cost|subscri/ },
  { text: "Who else in your team or circle would need to be involved for this to work?", keywords: /team|collaborat|share|group/ },
  { text: "What's the biggest reason you might NOT try something like this, even if it worked well?" },
  { text: "How would you describe this problem to a friend who doesn't experience it?" },
  { text: "What would a 'good enough' solution look like for you? What's the minimum bar?" },
  { text: "If you had to choose between this and your current approach, what would tip the decision?" },
];

function selectQuestions(
  templates: { text: string; keywords?: RegExp }[],
  text: string,
  count: number
): DraftQuestion[] {
  const lower = text.toLowerCase();
  const selected: typeof templates = [];

  // First pick keyword-matching templates
  for (const t of templates) {
    if (t.keywords && t.keywords.test(lower) && selected.length < count) {
      selected.push(t);
    }
  }

  // Fill remaining with non-keyword templates
  for (const t of templates) {
    if (!selected.includes(t) && selected.length < count) {
      selected.push(t);
    }
  }

  return selected.slice(0, count).map((t) => ({
    id: uid(),
    text: t.text,
    type: "open" as const,
    options: null,
    section: (templates === FOLLOWUP_TEMPLATES ? "followup" : "open") as "open" | "followup",
    isBaseline: false,
  }));
}

/* ─── Main Fallback Generator ─── */

/**
 * Deterministic fallback generator.
 * Used when AI is unavailable or API calls fail.
 * Produces a respectable draft with quality scoring.
 */
export async function generateCampaignDraftFallback(
  scribbleText: string
): Promise<CampaignDraft> {
  const title = extractTitle(scribbleText);
  const summary = buildSummary(scribbleText);
  const category = inferCategory(scribbleText);
  const tags = inferTags(scribbleText);
  const assumptions = generateAssumptions(scribbleText);
  const audience = inferAudience(scribbleText);

  const openQuestions = selectQuestions(OPEN_TEMPLATES, scribbleText, 3);
  const followupQuestions = selectQuestions(FOLLOWUP_TEMPLATES, scribbleText, 2);

  // Baseline questions from the curated library
  const baselineRecs = recommendBaseline(scribbleText);
  const baselineQuestions: DraftQuestion[] = baselineRecs.map((bq) => ({
    id: uid(),
    text: bq.text,
    type: "multiple_choice" as const,
    options: [...bq.options],
    section: "baseline" as const,
    isBaseline: true,
    baselineId: bq.id,
    category: bq.category,
  }));

  const draft: CampaignDraft = {
    title,
    summary,
    category,
    tags,
    assumptions,
    questions: [...openQuestions, ...followupQuestions, ...baselineQuestions],
    audience,
  };

  // Validate fallback output — fix common issues defensively
  if (draft.audience.interests.length === 0) {
    draft.audience.interests = ["Consumer"];
  }
  if (draft.audience.expertise.length === 0) {
    draft.audience.expertise = ["Founder"];
  }
  if (draft.audience.ageRanges.length === 0) {
    draft.audience.ageRanges = ["25-34"];
  }
  if (draft.assumptions.length === 0) {
    draft.assumptions = [
      "The target audience encounters this problem frequently enough to seek a solution.",
    ];
  }
  if (!draft.title || draft.title.length < 5) {
    draft.title = scribbleText.slice(0, 80).trim() || "Untitled Idea";
  }
  if (!draft.summary || draft.summary.length < 20) {
    draft.summary = scribbleText.trim();
  }

  return draft;
}
