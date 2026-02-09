/**
 * Curated Suggestions Engine
 *
 * Maps goal categories to vetted resources.
 * Claude analyzes user goals, matches to categories,
 * and surfaces 1-2 relevant suggestions.
 *
 * For v1, we use a static curated list. Live internet search
 * will be added in Phase 2.
 */

export interface Suggestion {
  title: string;
  description: string;
  url: string;
  type: "video" | "article" | "tool" | "course";
  timeEstimate: string; // e.g., "30 min", "2 hours"
}

export interface SuggestionCategory {
  name: string;
  keywords: string[];
  suggestions: Suggestion[];
}

/**
 * Curated resource map: category → vetted resources.
 */
export const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    name: "learning-code",
    keywords: ["code", "programming", "javascript", "python", "typescript", "react", "software", "dev", "web"],
    suggestions: [
      {
        title: "JavaScript Basics in 30 Minutes",
        description: "Quick crash course on JavaScript fundamentals",
        url: "https://javascript.info/first-steps",
        type: "article",
        timeEstimate: "30 min",
      },
      {
        title: "freeCodeCamp Interactive Lessons",
        description: "Hands-on coding exercises for beginners",
        url: "https://www.freecodecamp.org",
        type: "course",
        timeEstimate: "1 hour",
      },
    ],
  },
  {
    name: "fitness",
    keywords: ["exercise", "workout", "gym", "run", "fitness", "health", "yoga", "stretch", "strength"],
    suggestions: [
      {
        title: "7-Minute Scientific Workout",
        description: "High-intensity circuit training you can do anywhere",
        url: "https://well.blogs.nytimes.com/2013/05/09/the-scientific-7-minute-workout/",
        type: "article",
        timeEstimate: "7 min",
      },
      {
        title: "Yoga With Adriene — Morning Flow",
        description: "Gentle 20-minute morning yoga routine",
        url: "https://www.youtube.com/@yogawithadriene",
        type: "video",
        timeEstimate: "20 min",
      },
    ],
  },
  {
    name: "productivity",
    keywords: ["organize", "plan", "productivity", "focus", "time management", "habits", "routine"],
    suggestions: [
      {
        title: "The Pomodoro Technique",
        description: "Work in focused 25-minute bursts with breaks",
        url: "https://todoist.com/productivity-methods/pomodoro-technique",
        type: "article",
        timeEstimate: "10 min",
      },
      {
        title: "Atomic Habits Summary",
        description: "Key takeaways from the bestselling habits book",
        url: "https://jamesclear.com/atomic-habits-summary",
        type: "article",
        timeEstimate: "15 min",
      },
    ],
  },
  {
    name: "career",
    keywords: ["career", "job", "interview", "resume", "networking", "promotion", "leadership", "manage"],
    suggestions: [
      {
        title: "How to Have Better 1-on-1s",
        description: "Framework for productive manager/report meetings",
        url: "https://hypercontext.com/blog/meetings/one-on-one-meeting-guide",
        type: "article",
        timeEstimate: "15 min",
      },
      {
        title: "LinkedIn Profile Optimization Guide",
        description: "Make your profile stand out to recruiters",
        url: "https://www.linkedin.com/pulse/how-optimize-your-linkedin-profile",
        type: "article",
        timeEstimate: "30 min",
      },
    ],
  },
  {
    name: "creative",
    keywords: ["write", "design", "art", "music", "creative", "draw", "paint", "photography", "video"],
    suggestions: [
      {
        title: "The Artist's Way Morning Pages",
        description: "Daily freewriting practice to unlock creativity",
        url: "https://juliacameronlive.com/basic-tools/morning-pages/",
        type: "article",
        timeEstimate: "20 min",
      },
      {
        title: "Canva Design School",
        description: "Free design tutorials for beginners",
        url: "https://www.canva.com/designschool/",
        type: "course",
        timeEstimate: "30 min",
      },
    ],
  },
  {
    name: "finance",
    keywords: ["budget", "save", "invest", "money", "finance", "financial", "retirement", "stocks"],
    suggestions: [
      {
        title: "50/30/20 Budget Rule",
        description: "Simple framework to organize your spending",
        url: "https://www.investopedia.com/ask/answers/022916/what-502030-budget-rule.asp",
        type: "article",
        timeEstimate: "10 min",
      },
      {
        title: "Beginner's Guide to Index Funds",
        description: "Low-effort investing strategy explained",
        url: "https://www.investopedia.com/terms/i/indexfund.asp",
        type: "article",
        timeEstimate: "15 min",
      },
    ],
  },
  {
    name: "reading",
    keywords: ["read", "book", "reading", "literature", "learn"],
    suggestions: [
      {
        title: "Blinkist — Book Summaries in 15 Minutes",
        description: "Get key insights from non-fiction books quickly",
        url: "https://www.blinkist.com",
        type: "tool",
        timeEstimate: "15 min",
      },
      {
        title: "How to Read More Books",
        description: "Practical strategies to build a reading habit",
        url: "https://jamesclear.com/read-more",
        type: "article",
        timeEstimate: "10 min",
      },
    ],
  },
];

/**
 * Match a goal to suggestion categories based on keywords.
 * Returns the matching category's suggestions (max 2).
 */
export function getSuggestionsForGoal(goalTitle: string, goalDescription?: string | null): Suggestion[] {
  const searchText = `${goalTitle} ${goalDescription || ""}`.toLowerCase();

  for (const category of SUGGESTION_CATEGORIES) {
    const hasMatch = category.keywords.some((keyword) =>
      searchText.includes(keyword)
    );
    if (hasMatch) {
      return category.suggestions.slice(0, 2);
    }
  }

  // Default: return productivity suggestions
  return SUGGESTION_CATEGORIES
    .find((c) => c.name === "productivity")!
    .suggestions.slice(0, 2);
}
