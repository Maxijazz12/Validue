/* ─── Campaign Options ─── */

export const CATEGORY_OPTIONS = [
  "SaaS",
  "Consumer",
  "Health",
  "Fintech",
  "Education",
  "Marketplace",
  "AI/ML",
  "Other",
] as const;

export const REWARD_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed per response" },
  { value: "pool", label: "Reward pool" },
  { value: "top_only", label: "Top answers only" },
] as const;

/* ─── Respondent Profile Options ─── */

export const INTEREST_OPTIONS = [
  "SaaS",
  "Consumer",
  "Health",
  "Fintech",
  "Education",
  "Marketplace",
  "AI/ML",
  "Gaming",
  "Climate",
  "Creator Economy",
  "E-commerce",
  "Food & Bev",
] as const;

export const EXPERTISE_OPTIONS = [
  "Developer",
  "Designer",
  "Marketer",
  "Founder",
  "Student",
  "Product Manager",
  "Data/Analytics",
  "Sales",
  "Operations",
  "Healthcare Pro",
  "Finance Pro",
] as const;

export const AGE_RANGE_OPTIONS = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
] as const;

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "E-commerce",
  "Media & Entertainment",
  "Real Estate",
  "Food & Beverage",
  "Transportation",
  "Manufacturing",
  "Legal",
  "Other",
] as const;

export const EXPERIENCE_LEVEL_OPTIONS = [
  "Student",
  "Entry-level (0–2 years)",
  "Mid-level (3–5 years)",
  "Senior (6–10 years)",
  "Expert (10+ years)",
] as const;

/* ─── Landing Page ─── */

export const heroStats = [
  { number: "2,400+", label: "Ideas Validated" },
  { number: "94%", label: "Quality Score" },
  { number: "18min", label: "Avg. First Response" },
];

export const tickerFacts = [
  "$48,000+ earned by respondents",
  "Top respondents earn $200+/month",
  "Real target users, not random panels",
  "Quality-scored feedback, not surveys",
  "Most ideas get their first response in under 20 minutes",
  "Founders from 40+ countries and counting",
  "A new idea is posted every 47 minutes",
  "Real people, real stakes - no bots, no filler.",
];

export const howItWorksSteps = [
  {
    step: "01 - SUBMIT",
    title: "Describe Your Idea",
    description:
      "Share your concept, define your target audience, and craft 5–10 structured questions designed to extract real behavioral insights.",
  },
  {
    step: "02 - COLLECT",
    title: "Real People Respond",
    description:
      "Matched respondents from your exact target demographic answer with depth. Quality-scored, AI-verified, and time-tracked.",
  },
  {
    step: "03 - DECIDE",
    title: "Get Ranked Insights",
    description:
      "Receive your responses ranked by insight quality. See patterns, outliers, and top takeaways. Reward the best answers directly.",
  },
];

export const qualityBullets = [
  "AI-resistant question design",
  "Behavioral verification (keystroke + timing)",
  "Reputation-weighted payouts",
];

export const mockResponses = [
  {
    name: "Sarah K.",
    role: "Fitness Enthusiast · NYC",
    text: '"I would absolutely pay for this - I currently spend 20 min every Sunday googling meal plans that fit my macros. If your app auto-generated those from my grocery store, that\'s a no-brainer."',
    stars: 5,
    amount: "+$5.00",
    isTop: true,
    color: "#3b82f6",
  },
  {
    name: "Marcus T.",
    role: "Parent of 2 · Austin",
    text: '"Interesting concept but my family\'s dietary needs change week to week. I\'d need to customize heavily - if it felt rigid I\'d drop off fast. Flexibility is the dealbreaker here."',
    stars: 4,
    amount: "+$2.50",
    isTop: false,
    color: "#a855f7",
  },
];

export const pricingTiers = [
  {
    tier: "Free",
    price: "$0",
    per: "forever",
    features: [
      "1 campaign/month",
      "Up to ~75 people see each campaign",
      "Basic audience matching",
      "3 AI-generated questions",
      "$2 starter credit on your first campaign",
    ],
    efficiency: "1x",
    cta: "Get Started",
    featured: false,
  },
  {
    tier: "Starter",
    price: "$19",
    per: "/month",
    features: [
      "3 campaigns/month",
      "Up to ~250 people see each campaign",
      "1.5x more reach per dollar funded",
      "5 AI-generated questions",
      "Basic insight summaries",
    ],
    efficiency: "1.5x",
    cta: "Start Free Trial",
    featured: false,
  },
  {
    tier: "Pro",
    price: "$49",
    per: "/month",
    features: [
      "10 campaigns/month",
      "Up to ~600 people see each campaign",
      "2x more reach per dollar funded",
      "10 AI-generated questions",
      "Full insight summaries + CSV export",
      "Priority audience matching",
    ],
    efficiency: "2x",
    cta: "Launch Idea",
    featured: true,
  },
  {
    tier: "Scale",
    price: "$99",
    per: "/month",
    features: [
      "Unlimited campaigns",
      "Up to ~1,500 people see each campaign",
      "2.5x more reach per dollar funded",
      "15 AI-generated questions",
      "Trend insights + API export",
      "A/B testing + priority support",
    ],
    efficiency: "2.5x",
    cta: "Contact Us",
    featured: false,
  },
];

export const floatingNotifications = [
  { text: "Alex just earned +$12.00", color: "#E8725C" },
  { text: "New idea posted: AI Study Buddy", color: "#7BA67E" },
  { text: "Marcus T. earned +$5.00", color: "#6B8EA3" },
  { text: "42 responses in 2 hours", color: "#C4806F" },
];

export const socialProofCount = "2,400+";

export const mockWallIdeas = [
  {
    title: "AI-Powered Study Planner for College Students",
    description:
      "An app that analyzes your syllabus, learning style, and schedule to generate personalized study plans. Would you actually use this over your current system?",
    category: "Education",
    tags: ["Students", "AI/ML"],
    estimatedMinutes: 8,
    rewardAmount: 15,
    currentResponses: 38,
    targetResponses: 50,
    creatorName: "Priya Sharma",
    timeAgo: "2h ago",
    badge: "closing-soon" as const,
  },
  {
    title: "Subscription Toolbox for Freelance Designers",
    description:
      "A single monthly fee for curated fonts, icons, mockups, and templates - replacing 6+ separate subscriptions. How do you currently manage your design assets?",
    category: "SaaS",
    tags: ["Designers", "Freelancers"],
    estimatedMinutes: 6,
    rewardAmount: 25,
    currentResponses: 12,
    targetResponses: 40,
    creatorName: "Jake Morrison",
    timeAgo: "45m ago",
    badge: "new" as const,
  },
  {
    title: "Neighborhood Micro-Grocery Delivery",
    description:
      "Same-day delivery from local corner stores and specialty shops - not big-box warehouses. Would you pay a small premium for hyperlocal groceries?",
    category: "Consumer",
    tags: ["Urban Dwellers", "Parents"],
    estimatedMinutes: 10,
    rewardAmount: 20,
    currentResponses: 29,
    targetResponses: 35,
    creatorName: "Maria Chen",
    timeAgo: "5h ago",
    badge: "closing-soon" as const,
  },
  {
    title: "Cold Email Analyzer for B2B Founders",
    description:
      "Paste your outbound email, get a score and rewrite suggestions based on what actually gets replies. Built on real open/reply rate data.",
    category: "SaaS",
    tags: ["Founders", "Marketers"],
    estimatedMinutes: 5,
    rewardAmount: 30,
    currentResponses: 7,
    targetResponses: 50,
    creatorName: "David Okonkwo",
    timeAgo: "1h ago",
    badge: "high-reward" as const,
  },
  {
    title: "Pet Health Tracker with Vet Integration",
    description:
      "Log symptoms, medications, and vet visits in one place. Share a live health timeline with your vet before appointments.",
    category: "Health",
    tags: ["Pet Owners"],
    estimatedMinutes: 7,
    rewardAmount: 12,
    currentResponses: 19,
    targetResponses: 30,
    creatorName: "Lena Park",
    timeAgo: "3h ago",
    badge: "new" as const,
  },
  {
    title: "Gamified Savings Challenges for Gen Z",
    description:
      "Savings goals with social accountability - challenge friends, earn streaks, unlock rewards from partner brands.",
    category: "Fintech",
    tags: ["Students", "Gen Z"],
    estimatedMinutes: 8,
    rewardAmount: 18,
    currentResponses: 41,
    targetResponses: 50,
    creatorName: "Andre Williams",
    timeAgo: "6h ago",
    badge: "closing-soon" as const,
  },
];

export const startupQuotes = [
  {
    text: "Sara Blakely started Spanx with $5,000 in savings and no business degree. She's now a billionaire.",
    source: "Spanx, founded 2000",
  },
  {
    text: "Airbnb's founders sold custom cereal boxes called 'Obama O's' to fund their startup during the 2008 election.",
    source: "Airbnb, early days",
  },
  {
    text: "Instagram had 13 employees when it was acquired by Facebook for $1 billion.",
    source: "Instagram, 2012",
  },
  {
    text: "James Dyson built 5,127 failed prototypes before creating the first bagless vacuum cleaner that worked.",
    source: "Dyson, 1983–1993",
  },
  {
    text: "Mailchimp was bootstrapped for 12 years before becoming a $12 billion company. No VC money. Ever.",
    source: "Mailchimp, 2001–2021",
  },
  {
    text: "GitHub was started as a weekend project. It sold to Microsoft for $7.5 billion.",
    source: "GitHub, 2008–2018",
  },
  {
    text: "Shopify began because its founders couldn't find good e-commerce software for their snowboard shop.",
    source: "Shopify, 2006",
  },
  {
    text: "Jan Koum, co-founder of WhatsApp, was once rejected from a job at Facebook. They later paid $19B for his company.",
    source: "WhatsApp acquisition",
  },
  {
    text: "Slack started as an internal tool for a gaming company that failed. The tool became worth $27 billion.",
    source: "Slack / Tiny Speck",
  },
  {
    text: "The founder of Zoom was rejected for a US visa 8 times before finally getting approved and building the company.",
    source: "Eric Yuan, Zoom",
  },
  {
    text: "Brian Chesky of Airbnb maxed out three credit cards to keep the company alive in its early days.",
    source: "Airbnb, 2008",
  },
  {
    text: "Honda's founder was rejected by Toyota for an engineering job. He started making motorcycles in his garage instead.",
    source: "Soichiro Honda",
  },
  {
    text: "Canva's founder Melanie Perkins was rejected by over 100 investors before raising her first round.",
    source: "Canva, 2012",
  },
  {
    text: "Stripe was built by two brothers from rural Ireland. It's now valued at over $50 billion.",
    source: "Stripe, Collison brothers",
  },
  {
    text: "Pinterest's first year had almost no users. The founders personally emailed the first 5,000 people to sign up.",
    source: "Pinterest, 2010",
  },
  {
    text: "WD-40 is literally named after the 40th attempt. The first 39 formulas failed.",
    source: "WD-40, 1953",
  },
  {
    text: "Rovio made 51 unsuccessful games before Angry Birds became a global phenomenon.",
    source: "Rovio Entertainment",
  },
  {
    text: "Stewart Butterfield failed at making games — twice. Both failures produced billion-dollar companies: Flickr and Slack.",
    source: "Slack / Flickr",
  },
  {
    text: "Netflix was offered to Blockbuster for $50 million. Blockbuster laughed them out of the room.",
    source: "Netflix, 2000",
  },
  {
    text: "Y Combinator's first batch in 2005 included Reddit, which was built in three weeks.",
    source: "Reddit / Y Combinator",
  },
  {
    text: "Colonel Sanders was rejected 1,009 times before a restaurant accepted his fried chicken recipe.",
    source: "KFC",
  },
  {
    text: "Jeff Bezos told early Amazon investors there was a 70% chance the company would fail.",
    source: "Amazon, 1994",
  },
  {
    text: "Figma spent 3 years in stealth mode building their product before anyone outside the team ever used it.",
    source: "Figma, 2012–2015",
  },
  {
    text: "The first version of Google was hosted on Stanford's servers and nearly crashed the university's internet.",
    source: "Google, 1996",
  },
  {
    text: "Basecamp (37signals) has been profitable since day one and has never taken venture capital.",
    source: "Basecamp",
  },
  {
    text: "The average overnight success in Silicon Valley takes about 7 years.",
    source: "Industry data",
  },
  {
    text: "Before founding PayPal, Elon Musk slept at his office and showered at the local YMCA.",
    source: "PayPal / X.com, 1999",
  },
  {
    text: "Notion almost died in 2015 when they ran out of money. The team moved to Kyoto, Japan to rebuild from scratch.",
    source: "Notion, 2015",
  },
  {
    text: "Twitch started as Justin.tv — one guy streaming his life 24/7. It sold to Amazon for $970 million.",
    source: "Twitch, 2007–2014",
  },
  {
    text: "Calendly was bootstrapped and profitable from early on. No VC needed. Now valued at over $3 billion.",
    source: "Calendly",
  },
  {
    text: "The founders of Warby Parker mailed out glasses from their apartments for months before opening a real office.",
    source: "Warby Parker, 2010",
  },
  {
    text: "Dropbox's MVP was literally a 3-minute demo video. The waitlist went from 5,000 to 75,000 overnight.",
    source: "Dropbox, 2007",
  },
  {
    text: "Spanx founder Sara Blakely practiced her pitch in front of a mirror every night for a year.",
    source: "Sara Blakely",
  },
  {
    text: "Bumble was built by Whitney Wolfe Herd after she was pushed out of Tinder. It IPO'd at $8.2 billion.",
    source: "Bumble, 2014",
  },
  {
    text: "Loom recorded their YC demo day pitch with their own product. They sold to Atlassian for $975 million.",
    source: "Loom, 2023",
  },
  {
    text: "Minecraft was built by one person, Markus 'Notch' Persson, and sold to Microsoft for $2.5 billion.",
    source: "Minecraft, 2014",
  },
  {
    text: "Transistor.fm co-founder Justin Jackson spent 10 years building side projects before one finally worked.",
    source: "Transistor.fm",
  },
  {
    text: "Veed.io was rejected by every investor they pitched. They bootstrapped to $10M ARR and then raised funding on their own terms.",
    source: "Veed.io",
  },
  {
    text: "Superhuman spent 3 years building before launching, and charged $30/month for email from day one.",
    source: "Superhuman, 2014–2017",
  },
  {
    text: "Ben Francis started Gymshark at 19 from his parents' garage. It's now valued at over $1 billion.",
    source: "Gymshark, 2012",
  },
  {
    text: "Starbucks was a single coffee bean store for 16 years before Howard Schultz turned it into a global chain.",
    source: "Starbucks, 1971–1987",
  },
  {
    text: "GoPro's founder Nick Woodman funded the first prototype by selling bead and shell belts out of his VW van.",
    source: "GoPro, 2002",
  },
  {
    text: "Katrina Lake started Stitch Fix from her apartment while getting her MBA. It IPO'd at $1.4 billion.",
    source: "Stitch Fix, 2011",
  },
  {
    text: "Ring's founder, Jamie Siminoff, was rejected on Shark Tank. Amazon later acquired Ring for over $1 billion.",
    source: "Ring, 2018",
  },
  {
    text: "The founder of Tough Mudder started the company with a $7,000 credit card advance. It made $100M in year three.",
    source: "Tough Mudder, 2010",
  },
  {
    text: "Twitter's original name was 'twttr' because the domain twitter.com cost $7,500 — too expensive at the time.",
    source: "Twitter, 2006",
  },
  {
    text: "YouTube's first video, 'Me at the zoo,' is 18 seconds long. Google bought the company 20 months later for $1.65 billion.",
    source: "YouTube, 2005",
  },
  {
    text: "Plaid was rejected by every bank it tried to partner with at first. Visa tried to buy it for $5.3 billion.",
    source: "Plaid",
  },
];
