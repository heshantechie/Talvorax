// src/speech/reportGenerator.ts
import { FillerWordsResult } from './fillerWords';
import { VocabularyResult } from './vocabulary';
import { PauseEvent } from './recorder';
import { GrammarResult } from './grammar';
import { calculateOverallScore } from './scoring';

export interface DetailedFeedback {
  content: string;
  structure: string;
  fluency: string;
  confidence: string;
  grammar: string;
  vocabulary: string;
}

export interface SpeechEvaluationReport {
  // Legacy fields for backward compatibility
  contentScore: number;     // 0-10
  structureScore: number;   // 0-10
  fluencyScore: number;     // 0-10
  confidenceScore: number;   // 0-10
  wpm: number;
  fillerCount: number;
  topFiller: string;
  finalScore: number;       // 0-100
  suggestions: string[];

  // New detailed metrics
  grammarScore: number;     // 0-10
  vocabularyScore: number;  // 0-10
  
  fillerWordsAnalysis: FillerWordsResult;
  vocabularyAnalysis: VocabularyResult;
  grammarAnalysis: GrammarResult;
  
  pauseAnalysis: {
    averagePause: number;
    longestPause: number;
    count: number;
    list: PauseEvent[];
  };

  detailedActionableFeedback: DetailedFeedback;
}

export function generateEvaluationReport(params: {
  topic: string;
  transcript: string;
  durationSeconds: number;
  pauseEvents: PauseEvent[];
  fillerResult: FillerWordsResult;
  vocabResult: VocabularyResult;
  aiResult: {
    contentScore: number;
    structureScore: number;
    fluencyScore: number;
    confidenceScore: number;
    grammarScore: number;
    vocabularyScore: number;
    grammarMistakes: any[];
    grammarSuggestions: string[];
    advancedWordsDetected: string[];
    detailedFeedback: DetailedFeedback;
    suggestions: string[];
  };
}): SpeechEvaluationReport {
  const {
    transcript,
    durationSeconds,
    pauseEvents,
    fillerResult,
    vocabResult,
    aiResult
  } = params;

  // 1. Calculate local pause metrics
  const pauseCount = pauseEvents.length;
  let longestPause = 0;
  let totalPauseDuration = 0;
  pauseEvents.forEach(p => {
    totalPauseDuration += p.duration;
    if (p.duration > longestPause) {
      longestPause = p.duration;
    }
  });
  const averagePause = pauseCount > 0 ? parseFloat((totalPauseDuration / pauseCount).toFixed(1)) : 0;

  // 2. Clean up advanced words detected by AI
  const vocabularyAnalysis: VocabularyResult = {
    ...vocabResult,
    advancedWords: aiResult.advancedWordsDetected || []
  };

  // 3. Clean up grammar mistakes from AI
  const grammarAnalysis: GrammarResult = {
    score: aiResult.grammarScore,
    mistakes: aiResult.grammarMistakes || [],
    suggestions: aiResult.grammarSuggestions || []
  };

  // 4. Calculate deterministic overall score
  const finalScore = calculateOverallScore({
    contentQuality: aiResult.contentScore,
    structure: aiResult.structureScore,
    fluency: aiResult.fluencyScore,
    confidence: aiResult.confidenceScore,
    grammar: aiResult.grammarScore,
    vocabulary: aiResult.vocabularyScore
  });

  // 5. Gather combined suggestions (max 4 suggestions)
  const combinedSuggestions = [...aiResult.suggestions];
  
  // Inject highly specific local suggestion if filler rate is high
  if (fillerResult.totalCount > 4 && !combinedSuggestions.some(s => s.toLowerCase().includes('filler'))) {
    combinedSuggestions.push(
      `You used filler words ${fillerResult.totalCount} times (${fillerResult.percentage}% of your speech). Try pausing silently instead of saying "${fillerResult.topFiller}".`
    );
  }

  // Inject highly specific local suggestion if long pauses occur frequently
  if (pauseCount >= 4 && !combinedSuggestions.some(s => s.toLowerCase().includes('pause') || s.toLowerCase().includes('second'))) {
    combinedSuggestions.push(
      `You had ${pauseCount} pauses longer than 1.5 seconds. Your longest pause was ${longestPause} seconds. Practice maintaining a continuous speaking flow.`
    );
  }

  // Ensure WPM suggestions are present
  const wpm = calculateWPM(transcript, durationSeconds);
  if (wpm < 100 && !combinedSuggestions.some(s => s.toLowerCase().includes('slow') || s.toLowerCase().includes('wpm'))) {
    combinedSuggestions.push(`Your speaking pace was ${wpm} WPM (ideal is 120-150 WPM). Try speaking slightly faster to keep the audience engaged.`);
  } else if (wpm > 180 && !combinedSuggestions.some(s => s.toLowerCase().includes('fast') || s.toLowerCase().includes('breath'))) {
    combinedSuggestions.push(`Your speaking pace was ${wpm} WPM (ideal is 120-150 WPM). Try slowing down slightly and pausing to let your points breathe.`);
  }

  return {
    contentScore: aiResult.contentScore,
    structureScore: aiResult.structureScore,
    fluencyScore: aiResult.fluencyScore,
    confidenceScore: aiResult.confidenceScore,
    wpm,
    fillerCount: fillerResult.totalCount,
    topFiller: fillerResult.topFiller,
    finalScore,
    suggestions: combinedSuggestions.slice(0, 4),
    grammarScore: aiResult.grammarScore,
    vocabularyScore: aiResult.vocabularyScore,
    fillerWordsAnalysis: fillerResult,
    vocabularyAnalysis,
    grammarAnalysis,
    pauseAnalysis: {
      averagePause,
      longestPause,
      count: pauseCount,
      list: pauseEvents
    },
    detailedActionableFeedback: aiResult.detailedFeedback
  };
}

function calculateWPM(transcript: string, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const minutes = durationSeconds / 60;
  return Math.round(words.length / minutes);
}
