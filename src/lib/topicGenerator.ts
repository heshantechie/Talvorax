// src/lib/topicGenerator.ts

// 1. Core Data Structures
export type TopicCategory = 'Technology' | 'Career' | 'Economy' | 'Society' | 'Personal Development' | 'Education' | 'Current Trends' | 'Abstract';
export type TopicDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Extreme';

interface WordPools {
  [key: string]: string[];
}

const CATEGORIES: TopicCategory[] = [
  'Technology', 'Career', 'Economy', 'Society', 
  'Personal Development', 'Education', 'Current Trends', 'Abstract'
];

const POOLS: WordPools = {
  Technology: ['AI', 'automation', 'cybersecurity', 'startups', 'social media', 'smartphones', 'virtual reality', 'the internet', 'coding', 'algorithms'],
  Career: ['jobs', 'freelancing', 'salary', 'layoffs', 'skills', 'remote work', 'office politics', 'promotions', 'work-life balance', 'networking'],
  Society: ['privacy', 'culture', 'habits', 'communication', 'cancel culture', 'fake news', 'nuclear families', 'hustle culture', 'mental health', 'community'],
  Economy: ['inflation', 'wealth', 'spending', 'investing', 'cryptocurrency', 'taxes', 'consumerism', 'globalization', 'the stock market', 'universal basic income'],
  PersonalDevelopment: ['success', 'failure', 'time management', 'procrastination', 'confidence', 'motivation', 'discipline', 'happiness', 'resilience', 'meditation'],
  Education: ['degrees', 'online courses', 'student debt', 'standardized testing', 'practical skills', 'school grades', 'teachers', 'homework', 'lifelong learning'],
  CurrentTrends: ['influencers', 'viral videos', 'subscription models', 'fast fashion', 'hustle culture', 'digital nomads', 'gig economy', 'streaming services', 'mindfulness apps'],
  Abstract: ['time', 'the future', 'human behavior', 'truth', 'freedom', 'art', 'perfection', 'nostalgia', 'luck', 'destiny']
};

interface Template {
  pattern: string;
  difficulty: TopicDifficulty;
}

const TEMPLATES: Record<TopicCategory, Template[]> = {
  Technology: [
    { pattern: "Is {0} making us more isolated or more connected?", difficulty: "Medium" },
    { pattern: "Should governments regulate {0} more strictly?", difficulty: "Medium" },
    { pattern: "What if {0} disappeared tomorrow?", difficulty: "Easy" },
    { pattern: "Explain the long-term impact of {0} on human behavior.", difficulty: "Hard" },
    { pattern: "Argue for or against the rapid adoption of {0} without safety rails.", difficulty: "Extreme" }
  ],
  Career: [
    { pattern: "Should freshers prioritize {0} over company loyalty?", difficulty: "Medium" },
    { pattern: "How is {0} changing the modern workplace?", difficulty: "Easy" },
    { pattern: "Is {0} the ultimate key to professional success?", difficulty: "Medium" },
    { pattern: "Analyze the hidden costs of {0} in today's economy.", difficulty: "Hard" },
    { pattern: "Design a future where {0} determines someone's entire career trajectory.", difficulty: "Extreme" }
  ],
  Society: [
    { pattern: "Is {0} a benefit or a problem for society?", difficulty: "Easy" },
    { pattern: "Why do people struggle so much with {0}?", difficulty: "Medium" },
    { pattern: "What if society completely abandoned {0}?", difficulty: "Hard" },
    { pattern: "How does {0} affect our daily decision-making?", difficulty: "Medium" },
    { pattern: "Defend a controversial stance on {0}.", difficulty: "Extreme" }
  ],
  Economy: [
    { pattern: "Is {0} primarily driven by greed or necessity?", difficulty: "Medium" },
    { pattern: "Should {0} be a core subject in high schools?", difficulty: "Easy" },
    { pattern: "How does {0} widen the gap between the rich and the poor?", difficulty: "Hard" },
    { pattern: "Explain {0} to a child without using technical terms.", difficulty: "Medium" },
    { pattern: "Propose a radical solution to the problems caused by {0}.", difficulty: "Extreme" }
  ],
  'Personal Development': [
    { pattern: "Is {0} overrated in modern self-help culture?", difficulty: "Medium" },
    { pattern: "How does one effectively balance {0} and relaxation?", difficulty: "Medium" },
    { pattern: "What role does {0} play in achieving long-term happiness?", difficulty: "Easy" },
    { pattern: "Deconstruct the myth surrounding {0}.", difficulty: "Hard" },
    { pattern: "Imagine living a life entirely dictated by {0}.", difficulty: "Extreme" }
  ],
  Education: [
    { pattern: "Are traditional {0} becoming obsolete?", difficulty: "Medium" },
    { pattern: "Should {0} be entirely free for everyone?", difficulty: "Easy" },
    { pattern: "Explain how {0} fail to prepare students for the real world.", difficulty: "Hard" },
    { pattern: "What if {0} were no longer a requirement for getting a job?", difficulty: "Medium" },
    { pattern: "Evaluate the ethical implications of monetizing {0}.", difficulty: "Extreme" }
  ],
  'Current Trends': [
    { pattern: "Is the rise of {0} a passing fad or a permanent shift?", difficulty: "Medium" },
    { pattern: "How are {0} negatively impacting younger generations?", difficulty: "Easy" },
    { pattern: "What is the psychological appeal behind {0}?", difficulty: "Hard" },
    { pattern: "Should we actively limit our exposure to {0}?", difficulty: "Medium" },
    { pattern: "Predict what will replace {0} in the next ten years.", difficulty: "Extreme" }
  ],
  Abstract: [
    { pattern: "Is {0} an illusion or a fundamental reality?", difficulty: "Hard" },
    { pattern: "If you could fully understand {0}, would you want to?", difficulty: "Extreme" },
    { pattern: "How does the concept of {0} change as we grow older?", difficulty: "Medium" },
    { pattern: "Can humans ever truly conquer {0}?", difficulty: "Hard" },
    { pattern: "Discuss the relationship between {0} and human suffering.", difficulty: "Extreme" }
  ]
};

// Stop words to ignore during similarity checking
const STOP_WORDS = new Set(["is", "the", "a", "an", "are", "do", "does", "will", "can", "should", "what", "how", "why", "if", "for", "or", "and", "of", "to", "in", "on", "with", "without"]);

function extractKeywords(sentence: string): string[] {
  return sentence
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = extractKeywords(str1);
  const words2 = extractKeywords(str2);
  
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  let matchCount = 0;
  for (const w of words2) {
    if (set1.has(w)) matchCount++;
  }

  // Calculate Jaccard similarity
  const union = new Set([...words1, ...words2]).size;
  return matchCount / union;
}

// 2. Local History Management
interface TopicHistoryItem {
  topic: string;
  category: TopicCategory;
  timestamp: number;
}

const HISTORY_KEY = 'hireready_jam_history';
const MAX_HISTORY = 50;

function getHistory(): TopicHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read topic history", e);
  }
  return [];
}

function addToHistory(item: TopicHistoryItem) {
  try {
    const history = getHistory();
    history.unshift(item);
    if (history.length > MAX_HISTORY) {
      history.pop();
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save topic history", e);
  }
}

// 3. Engine Implementation
export class TopicGenerator {
  
  /**
   * Generates a completely new, non-repeating topic based on the desired difficulty.
   */
  static generateTopic(targetDifficulty: TopicDifficulty | 'Mixed' = 'Mixed'): { topic: string; category: TopicCategory; difficulty: TopicDifficulty } {
    const history = getHistory();
    const recentCategories = history.slice(0, 3).map(h => h.category); // Avoid repeating categories too often

    let attempts = 0;
    while (attempts < 500) { // Safety ceiling to prevent infinite loops
      attempts++;

      // 1. Pick a category
      let category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      // If the category is very recent, re-roll once to reduce probability of back-to-back same categories
      if (recentCategories.includes(category)) {
        category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      }

      // 2. Pick a template matching difficulty
      const categoryTemplates = TEMPLATES[category];
      let filteredTemplates = categoryTemplates;
      
      if (targetDifficulty !== 'Mixed') {
        const difficultyMatches = categoryTemplates.filter(t => t.difficulty === targetDifficulty);
        if (difficultyMatches.length > 0) {
          filteredTemplates = difficultyMatches;
        }
      }

      const templateObj = filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)];
      
      // Map category name to WordPools key (remove spaces)
      const poolKey = category.replace(/\s+/g, '');
      const poolChoices = POOLS[poolKey] || POOLS.Technology; // fallback
      
      const word = poolChoices[Math.floor(Math.random() * poolChoices.length)];
      
      // Construct topic string
      const finalTopic = templateObj.pattern.replace('{0}', word);

      // 3. Check Repetition
      let isDuplicate = false;
      for (const past of history) {
        // Exact match
        if (past.topic === finalTopic) {
          isDuplicate = true;
          break;
        }
        
        // Semantic similarity check (e.g. Reject if similarity > 40%)
        const sim = calculateSimilarity(finalTopic, past.topic);
        if (sim > 0.4) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        addToHistory({
          topic: finalTopic,
          category,
          timestamp: Date.now()
        });
        
        return {
          topic: finalTopic,
          category,
          difficulty: templateObj.difficulty
        };
      }
    }

    // Fallback if we somehow spin 500 times without a hit (extremely rare given combinations)
    return {
      topic: "What is the single most important invention in human history?",
      category: "Technology",
      difficulty: "Medium"
    };
  }
}
