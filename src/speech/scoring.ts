// src/speech/scoring.ts

export interface ScoreWeights {
  contentQuality: number; // 25%
  structure: number;      // 20%
  fluency: number;        // 20%
  confidence: number;     // 15%
  grammar: number;        // 10%
  vocabulary: number;     // 10%
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  contentQuality: 0.25,
  structure: 0.20,
  fluency: 0.20,
  confidence: 0.15,
  grammar: 0.10,
  vocabulary: 0.10
};

/**
 * Calculates the overall speech score out of 100 based on weighted 0-10 subscores.
 * Formula:
 * Final Score = Round(
 *   (Content Quality * 10 * 0.25) +
 *   (Structure * 10 * 0.20) +
 *   (Fluency * 10 * 0.20) +
 *   (Confidence * 10 * 0.15) +
 *   (Grammar * 10 * 0.10) +
 *   (Vocabulary * 10 * 0.10)
 * )
 */
export function calculateOverallScore(scores: {
  contentQuality: number; // 0-10
  structure: number;      // 0-10
  fluency: number;        // 0-10
  confidence: number;     // 0-10
  grammar: number;        // 0-10
  vocabulary: number;     // 0-10
}, weights = DEFAULT_WEIGHTS): number {
  const contentContribution = (scores.contentQuality / 10) * (weights.contentQuality * 100);
  const structureContribution = (scores.structure / 10) * (weights.structure * 100);
  const fluencyContribution = (scores.fluency / 10) * (weights.fluency * 100);
  const confidenceContribution = (scores.confidence / 10) * (weights.confidence * 100);
  const grammarContribution = (scores.grammar / 10) * (weights.grammar * 100);
  const vocabularyContribution = (scores.vocabulary / 10) * (weights.vocabulary * 100);

  const rawSum = contentContribution +
                 structureContribution +
                 fluencyContribution +
                 confidenceContribution +
                 grammarContribution +
                 vocabularyContribution;

  return Math.min(100, Math.max(0, Math.round(rawSum)));
}
