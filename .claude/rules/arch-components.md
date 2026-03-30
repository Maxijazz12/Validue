---
description: Component groups map — landing, dashboard, creation, response, payout, wall, UI primitives
globs: ["src/components/**/*.{ts,tsx}"]
---

## Component Groups

### Landing (src/components/landing/) — 12 files, zero coupling
Navbar, Hero, WallPreview, Ticker, HowItWorks, QualityFeature, Pricing, PricingButtons, PricingCalculator, DidYouKnow, CtaBanner, Footer, FloatingCard

### Dashboard Shell
Sidebar, MobileTabBar, CommandPalette, NotificationPanel, NotificationToast, ProfilePrompt, SubscriptionBanner, AchievementBanner, WeeklyDigestBanner, KeyboardHint

### Campaign Creation (src/components/dashboard/create-idea/) — 6 files
CreateIdeaFlow -> ScribbleStep -> GeneratingStep -> DraftReviewStep (+ AudienceTargetingPanel, BaselineQuestionPicker, SurveyEditor, SignalStrengthMeter)

### Response Flow (src/components/dashboard/respond/) — 6 files
ResponseFlow -> CampaignDetail -> QuestionStepper -> MultipleChoiceAnswer / OpenEndedAnswer -> ProgressBar -> SubmissionConfirmation

### Response Review & Payout — 5 files
ResponseList -> ResponseCard, ResponseSection, RankButton, PayoutAllocator, ExportResponsesButton

### Wall Feed
WallFeed -> WallCard[] -> WallReactionBar, WallCardTracker, TrendingRow, ActivityTicker

### UI Primitives (src/components/ui/) — 9 files, zero coupling
Button, Input, ChipSelect, Avatar, ReputationBadge, Skeleton, SectionHeader
