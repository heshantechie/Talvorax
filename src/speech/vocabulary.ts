// src/speech/vocabulary.ts

export interface VocabularyResult {
  uniqueCount: number;
  repeatedCount: number;
  lexicalDiversity: number; // unique / total ratio (0 to 1)
  richnessScore: number;     // 0 to 10 score
  repeatedWordsDetail: { word: string; count: number }[];
  advancedWords: string[];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'has', 'have',
  'had', 'do', 'does', 'did', 'but', 'if', 'because', 'as', 'until', 'while'
]);

export function analyzeVocabulary(transcript: string): VocabularyResult {
  const cleanTranscript = transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '');
  const words = cleanTranscript.split(/\s+/).filter(w => w.length > 1);
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      uniqueCount: 0,
      repeatedCount: 0,
      lexicalDiversity: 0,
      richnessScore: 0,
      repeatedWordsDetail: [],
      advancedWords: []
    };
  }

  const wordFrequencies: Record<string, number> = {};
  words.forEach(word => {
    wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
  });

  const uniqueCount = Object.keys(wordFrequencies).length;
  const lexicalDiversity = parseFloat((uniqueCount / totalWords).toFixed(2));

  // Identify heavily repeated words (excluding stop words)
  const repeatedWordsDetail: { word: string; count: number }[] = [];
  let repeatedCount = 0;

  Object.entries(wordFrequencies).forEach(([word, count]) => {
    if (count > 1 && !STOP_WORDS.has(word)) {
      repeatedWordsDetail.push({ word, count });
      repeatedCount += (count - 1);
    }
  });

  // Sort repeated words by frequency descending
  repeatedWordsDetail.sort((a, b) => b.count - a.count);

  // Map lexical diversity directly to a 0-10 richness score
  // Ideal lexical diversity for brief speech is usually between 0.40 and 0.70.
  // 0.60+ gets 10/10, scaled down below that.
  let richnessScore = Math.round(lexicalDiversity * 15);
  richnessScore = Math.min(10, Math.max(1, richnessScore));

  return {
    uniqueCount,
    repeatedCount,
    lexicalDiversity,
    richnessScore,
    repeatedWordsDetail,
    advancedWords: [] // Enriched by LLM analysis later
  };
}
