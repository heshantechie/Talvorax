// src/lib/speechAnalysis.ts
import { MinuteTalkFeedback } from '../../types';
import { evaluateMinuteTalkContent } from '../../services/gemini';

// 1. Local Heuristics Logic

function calculateWPM(transcript: string, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const minutes = durationSeconds / 60;
  return Math.round(words.length / minutes);
}

function analyzeFillers(transcript: string): { count: number; topFiller: string } {
  const fillers = ["um", "uh", "like", "you know", "basically", "actually", "literally", "so"];
  const wordCounts: Record<string, number> = {};
  
  const lowerCaseTranscript = transcript.toLowerCase();
  
  let totalFillers = 0;

  fillers.forEach(filler => {
    // Basic regex: boundary -> filler -> boundary to exact match words, allowing punctuation
    const regex = new RegExp(`\\b${filler}\\b`, 'g');
    const matches = lowerCaseTranscript.match(regex);
    if (matches) {
      const count = matches.length;
      wordCounts[filler] = count;
      totalFillers += count;
    }
  });

  let topFiller = "None";
  let maxCount = 0;
  for (const [filler, count] of Object.entries(wordCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topFiller = filler;
    }
  }

  return { count: totalFillers, topFiller };
}

function calculateFluencyScore(wpm: number, fillerCount: number, durationSeconds: number): number {
  // Fluency is 0-10. 
  // Base 10. Subtract heavily for too many fillers relative to duration.
  // E.g., 5 fillers in 60 seconds is mild. 15 fillers is very punishing.
  let score = 10;
  
  const fillerRatePerMinute = (fillerCount / durationSeconds) * 60;
  if (fillerRatePerMinute > 3) score -= 1;
  if (fillerRatePerMinute > 6) score -= 2;
  if (fillerRatePerMinute > 10) score -= 2;
  
  if (wpm < 100) score -= 2;        // Too slow, lacks fluency
  else if (wpm > 170) score -= 1;   // Rushing, hurting fluency slightly

  return Math.max(0, score);
}

function calculateConfidenceScore(fluencyScore: number, wpm: number): number {
  // Confidence 0-10 based partly on fluency but penalizing extremes
  let score = fluencyScore;
  if (wpm >= 110 && wpm <= 160) {
    score += 1; // Bonus for ideal speed
  }
  return Math.min(10, Math.max(0, score));
}

function determineSpeedCategory(wpm: number): string {
  if (wpm < 100) return 'Too slow';
  if (wpm <= 160) return 'Ideal';
  return 'Too fast';
}

// 2. Final Aggregation

/**
 * Calculates a fully featured feedback report.
 * Uses local fast-heuristics for WPM, Fillers, Fluency, and Confidence.
 * Uses Gemini LLM for Content and Structure.
 */
export async function generateMinuteTalkFeedback(
  topic: string,
  transcript: string,
  durationSeconds: number = 60
): Promise<MinuteTalkFeedback> {
  const wpm = calculateWPM(transcript, durationSeconds);
  const { count: fillerCount, topFiller } = analyzeFillers(transcript);
  
  const fluencyScore = calculateFluencyScore(wpm, fillerCount, Math.max(1, durationSeconds));
  const confidenceScore = calculateConfidenceScore(fluencyScore, wpm);

  // Call LLM for Content & Structure (this takes time so we await it)
  // Maps 0-10 scores
  const aiEvaluation = await evaluateMinuteTalkContent(topic, transcript);
  
  const contentScore = aiEvaluation.contentScore;
  const structureScore = aiEvaluation.structureScore;

  // 8. Final Score (0-100) Weights:
  // Content: 30%
  // Fluency: 20%
  // Speed: 10% (Map: Ideal=10, Slow=5, Fast=8)
  // Fillers: 15% (Map: 0 fillers = 10, >10 fillers = 0)
  // Structure: 15%
  // Confidence: 10%

  const contentWeight = (contentScore / 10) * 30;
  const fluencyWeight = (fluencyScore / 10) * 20;
  
  const speedCat = determineSpeedCategory(wpm);
  let speedScoreRaw = speedCat === 'Ideal' ? 10 : (speedCat === 'Too slow' ? 5 : 8);
  const speedWeight = (speedScoreRaw / 10) * 10;

  const fillerScoreRaw = Math.max(0, 10 - fillerCount);
  const fillerWeight = (fillerScoreRaw / 10) * 15;

  const structureWeight = (structureScore / 10) * 15;
  const confidenceWeight = (confidenceScore / 10) * 10;

  const finalScore = Math.round(contentWeight + fluencyWeight + speedWeight + fillerWeight + structureWeight + confidenceWeight);

  // Add auto-generated heuristic tips to the LLM suggestions if needed
  const combinedSuggestions = [...aiEvaluation.suggestions];
  if (fillerCount > 5 && !combinedSuggestions.some(s => s.toLowerCase().includes('filler'))) {
    combinedSuggestions.push(`Try to reduce filler words like '${topFiller}' to sound more confident.`);
  }
  if (speedCat === 'Too slow') {
    combinedSuggestions.push('Your speaking pace is a bit slow. Try to maintain a steady, slightly faster rhythm.');
  } else if (speedCat === 'Too fast') {
    combinedSuggestions.push('You are speaking very fast. Pause occasionally to let your points breathe.');
  }

  return {
    contentScore,
    fluencyScore,
    wpm,
    fillerCount,
    topFiller,
    structureScore,
    confidenceScore,
    finalScore,
    suggestions: combinedSuggestions.slice(0, 4) // Max 4 tips
  };
}
