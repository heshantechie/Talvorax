// src/speech/fillerWords.ts

export interface FillerWordsResult {
  totalCount: number;
  frequencyPerMinute: number;
  percentage: number;
  topFiller: string;
  mostUsedFiller: string; // compatibility alias
  counts: Record<string, number>;
  suggestions: string[];
}

const FILLER_WORDS_LIST = [
  'um',
  'uh',
  'like',
  'actually',
  'basically',
  'you know',
  'sort of',
  'kind of',
  'literally'
];

export function analyzeFillerWords(transcript: string, durationSeconds: number): FillerWordsResult {
  const cleanTranscript = transcript.toLowerCase();
  const words = cleanTranscript.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;

  const counts: Record<string, number> = {};
  let totalCount = 0;

  FILLER_WORDS_LIST.forEach((filler) => {
    // Escape for regex and check word boundaries
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    const matches = cleanTranscript.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      counts[filler] = count;
      totalCount += count;
    }
  });

  // Calculate top filler
  let topFiller = 'None';
  let maxCount = 0;
  Object.entries(counts).forEach(([filler, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topFiller = filler;
    }
  });

  const durationMinutes = Math.max(1, durationSeconds) / 60;
  const frequencyPerMinute = parseFloat((totalCount / durationMinutes).toFixed(1));
  const percentage = totalWords > 0 ? parseFloat(((totalCount / totalWords) * 100).toFixed(1)) : 0;

  const suggestions: string[] = [];
  if (totalCount > 0) {
    if (percentage > 8) {
      suggestions.push(`Filler words make up ${percentage}% of your speech. Try to pause silently instead of saying "${topFiller}".`);
    } else if (totalCount > 3) {
      suggestions.push(`You used the filler word "${topFiller}" ${maxCount} times. Try to maintain awareness and reduce it.`);
    }
  }

  return {
    totalCount,
    frequencyPerMinute,
    percentage,
    topFiller,
    mostUsedFiller: topFiller, // alias
    counts,
    suggestions,
  };
}
