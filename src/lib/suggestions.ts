/**
 * Curated Suggestions Engine
 *
 * Maps goal categories to vetted resources.
 * Each category has 5-6 suggestions for variety when refreshing.
 * Supports excluding already-seen URLs.
 */

export interface Suggestion {
  title: string;
  description: string;
  url: string;
  type: "video" | "article" | "tool" | "course";
  timeEstimate: string;
}

export interface SuggestionCategory {
  name: string;
  keywords: string[];
  suggestions: Suggestion[];
}

export const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    name: "learning-code",
    keywords: ["code", "programming", "javascript", "python", "typescript", "react", "software", "dev", "web"],
    suggestions: [
      { title: "JavaScript Basics in 30 Minutes", description: "Quick crash course on JavaScript fundamentals", url: "https://javascript.info/first-steps", type: "article", timeEstimate: "30 min" },
      { title: "freeCodeCamp Interactive Lessons", description: "Hands-on coding exercises for beginners", url: "https://www.freecodecamp.org", type: "course", timeEstimate: "1 hour" },
      { title: "TypeScript Handbook", description: "Official guide to TypeScript fundamentals", url: "https://www.typescriptlang.org/docs/handbook/", type: "article", timeEstimate: "45 min" },
      { title: "React Tutorial for Beginners", description: "Build your first React app step by step", url: "https://react.dev/learn", type: "course", timeEstimate: "1 hour" },
      { title: "CS50 Introduction to Computer Science", description: "Harvard's legendary intro CS course", url: "https://cs50.harvard.edu/x/", type: "course", timeEstimate: "2 hours" },
      { title: "Exercism Coding Practice", description: "Free code practice with mentorship", url: "https://exercism.org", type: "tool", timeEstimate: "30 min" },
    ],
  },
  {
    name: "fitness",
    keywords: ["exercise", "workout", "gym", "run", "fitness", "health", "yoga", "stretch", "strength"],
    suggestions: [
      { title: "7-Minute Scientific Workout", description: "High-intensity circuit training anywhere", url: "https://well.blogs.nytimes.com/2013/05/09/the-scientific-7-minute-workout/", type: "article", timeEstimate: "7 min" },
      { title: "Yoga With Adriene — Morning Flow", description: "Gentle 20-minute morning yoga routine", url: "https://www.youtube.com/@yogawithadriene", type: "video", timeEstimate: "20 min" },
      { title: "Couch to 5K Program", description: "Build up to running 5K in 9 weeks", url: "https://www.nhs.uk/live-well/exercise/running-and-aerobic-exercises/get-running-with-couch-to-5k/", type: "course", timeEstimate: "30 min" },
      { title: "Darebee No-Equipment Workouts", description: "Hundreds of free illustrated workout routines", url: "https://darebee.com/workouts.html", type: "tool", timeEstimate: "20 min" },
      { title: "Stretching Guide for Desk Workers", description: "Combat sitting with targeted stretches", url: "https://www.healthline.com/health/deskercise", type: "article", timeEstimate: "10 min" },
    ],
  },
  {
    name: "productivity",
    keywords: ["organize", "plan", "productivity", "focus", "time management", "habits", "routine"],
    suggestions: [
      { title: "The Pomodoro Technique", description: "Work in focused 25-minute bursts with breaks", url: "https://todoist.com/productivity-methods/pomodoro-technique", type: "article", timeEstimate: "10 min" },
      { title: "Atomic Habits Summary", description: "Key takeaways from the bestselling habits book", url: "https://jamesclear.com/atomic-habits-summary", type: "article", timeEstimate: "15 min" },
      { title: "Getting Things Done Method", description: "David Allen's trusted productivity system", url: "https://gettingthingsdone.com/what-is-gtd/", type: "article", timeEstimate: "15 min" },
      { title: "Forest App — Focus Timer", description: "Stay focused by growing virtual trees", url: "https://www.forestapp.cc", type: "tool", timeEstimate: "5 min" },
      { title: "Deep Work — Cal Newport Summary", description: "Rules for focused success in a distracted world", url: "https://www.samuelthomasdavies.com/book-summaries/business/deep-work/", type: "article", timeEstimate: "20 min" },
    ],
  },
  {
    name: "career",
    keywords: ["career", "job", "interview", "resume", "networking", "promotion", "leadership", "manage"],
    suggestions: [
      { title: "How to Have Better 1-on-1s", description: "Framework for productive manager/report meetings", url: "https://hypercontext.com/blog/meetings/one-on-one-meeting-guide", type: "article", timeEstimate: "15 min" },
      { title: "LinkedIn Profile Optimization Guide", description: "Make your profile stand out to recruiters", url: "https://www.linkedin.com/pulse/how-optimize-your-linkedin-profile", type: "article", timeEstimate: "30 min" },
      { title: "STAR Interview Method", description: "Structure your interview answers effectively", url: "https://www.themuse.com/advice/star-interview-method", type: "article", timeEstimate: "10 min" },
      { title: "Radical Candor Framework", description: "Give feedback that helps people grow", url: "https://www.radicalcandor.com/our-approach/", type: "article", timeEstimate: "15 min" },
      { title: "Negotiation Skills Guide", description: "Get better outcomes in salary and business talks", url: "https://www.pon.harvard.edu/daily/negotiation-skills-daily/", type: "article", timeEstimate: "20 min" },
    ],
  },
  {
    name: "creative",
    keywords: ["write", "design", "art", "music", "creative", "draw", "paint", "photography", "video"],
    suggestions: [
      { title: "The Artist's Way Morning Pages", description: "Daily freewriting practice to unlock creativity", url: "https://juliacameronlive.com/basic-tools/morning-pages/", type: "article", timeEstimate: "20 min" },
      { title: "Canva Design School", description: "Free design tutorials for beginners", url: "https://www.canva.com/designschool/", type: "course", timeEstimate: "30 min" },
      { title: "Skillshare Creative Classes", description: "Learn illustration, photography, and more", url: "https://www.skillshare.com", type: "course", timeEstimate: "45 min" },
      { title: "Draw A Box — Free Drawing Course", description: "Structured drawing fundamentals course", url: "https://drawabox.com", type: "course", timeEstimate: "30 min" },
      { title: "750 Words Daily Writing Practice", description: "Build a daily writing habit", url: "https://750words.com", type: "tool", timeEstimate: "15 min" },
    ],
  },
  {
    name: "finance",
    keywords: ["budget", "save", "invest", "money", "finance", "financial", "retirement", "stocks"],
    suggestions: [
      { title: "50/30/20 Budget Rule", description: "Simple framework to organize your spending", url: "https://www.investopedia.com/ask/answers/022916/what-502030-budget-rule.asp", type: "article", timeEstimate: "10 min" },
      { title: "Beginner's Guide to Index Funds", description: "Low-effort investing strategy explained", url: "https://www.investopedia.com/terms/i/indexfund.asp", type: "article", timeEstimate: "15 min" },
      { title: "YNAB Budgeting Method", description: "Give every dollar a job", url: "https://www.ynab.com/the-four-rules", type: "tool", timeEstimate: "15 min" },
      { title: "Emergency Fund Calculator", description: "Figure out how much you need saved", url: "https://www.nerdwallet.com/article/banking/emergency-fund-calculator", type: "tool", timeEstimate: "5 min" },
      { title: "Bogleheads Investment Philosophy", description: "Simple, evidence-based investing principles", url: "https://www.bogleheads.org/wiki/Bogleheads%C2%AE_investment_philosophy", type: "article", timeEstimate: "20 min" },
    ],
  },
  {
    name: "reading",
    keywords: ["read", "book", "reading", "literature", "learn"],
    suggestions: [
      { title: "Blinkist — Book Summaries in 15 Minutes", description: "Get key insights from non-fiction books quickly", url: "https://www.blinkist.com", type: "tool", timeEstimate: "15 min" },
      { title: "How to Read More Books", description: "Practical strategies to build a reading habit", url: "https://jamesclear.com/read-more", type: "article", timeEstimate: "10 min" },
      { title: "Goodreads Reading Challenge", description: "Set and track your annual reading goal", url: "https://www.goodreads.com/challenges/show/reading_challenge", type: "tool", timeEstimate: "5 min" },
      { title: "Speed Reading Techniques", description: "Double your reading speed with practice", url: "https://www.mindtools.com/a3ycjhj/speed-reading", type: "article", timeEstimate: "15 min" },
      { title: "Libby — Free Library Ebooks", description: "Borrow ebooks free with your library card", url: "https://www.overdrive.com/apps/libby", type: "tool", timeEstimate: "5 min" },
    ],
  },
];

/**
 * Match a goal to suggestion categories based on keywords.
 * Returns matching suggestions, excluding any in the excludeUrls set.
 */
export function getSuggestionsForGoal(
  goalTitle: string,
  goalDescription?: string | null,
  excludeUrls: string[] = []
): Suggestion[] {
  const searchText = `${goalTitle} ${goalDescription || ""}`.toLowerCase();
  const excludeSet = new Set(excludeUrls);

  for (const category of SUGGESTION_CATEGORIES) {
    const hasMatch = category.keywords.some((keyword) =>
      searchText.includes(keyword)
    );
    if (hasMatch) {
      return category.suggestions
        .filter((s) => !excludeSet.has(s.url))
        .slice(0, 2);
    }
  }

  // Default: return productivity suggestions
  return SUGGESTION_CATEGORIES
    .find((c) => c.name === "productivity")!
    .suggestions
    .filter((s) => !excludeSet.has(s.url))
    .slice(0, 2);
}
