// src/speech/evaluator.ts
import { PauseEvent } from './recorder';
import { analyzeFillerWords } from './fillerWords';
import { analyzeVocabulary } from './vocabulary';
import { generateEvaluationReport, SpeechEvaluationReport } from './reportGenerator';
import { evaluateMinuteTalkSpeech } from '../../services/gemini'; // New gemini service function

export async function evaluateSpeech(
  topic: string,
  transcript: string,
  durationSeconds: number,
  pauseEvents: PauseEvent[]
): Promise<SpeechEvaluationReport> {
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  
  if (words.length < 5) {
    // Return empty/minimal report for extremely short speech
    return {
      contentScore: 0,
      structureScore: 0,
      fluencyScore: 0,
      confidenceScore: 0,
      wpm: 0,
      fillerCount: 0,
      topFiller: 'None',
      finalScore: 0,
      suggestions: ['Please speak for a longer duration to receive a detailed evaluation.'],
      grammarScore: 0,
      vocabularyScore: 0,
      fillerWordsAnalysis: {
        totalCount: 0,
        frequencyPerMinute: 0,
        percentage: 0,
        topFiller: 'None',
        mostUsedFiller: 'None',
        counts: {},
        suggestions: []
      },
      vocabularyAnalysis: {
        uniqueCount: 0,
        repeatedCount: 0,
        lexicalDiversity: 0,
        richnessScore: 0,
        repeatedWordsDetail: [],
        advancedWords: []
      },
      grammarAnalysis: {
        score: 0,
        mistakes: [],
        suggestions: []
      },
      pauseAnalysis: {
        averagePause: 0,
        longestPause: 0,
        count: 0,
        list: []
      },
      detailedActionableFeedback: {
        content: 'No speech was recorded, or it was too short. Speak about the topic for at least 15-30 seconds to get feedback.',
        structure: 'Structure could not be evaluated due to lack of content.',
        fluency: 'Fluency could not be evaluated.',
        confidence: 'Confidence could not be evaluated.',
        grammar: 'Grammar could not be evaluated.',
        vocabulary: 'Vocabulary could not be evaluated.'
      }
    };
  }

  // 1. Run Local Analytics
  const fillerResult = analyzeFillerWords(transcript, durationSeconds);
  const vocabResult = analyzeVocabulary(transcript);

  // 2. Call the updated Gemini AI grading API
  const aiEvaluation = await evaluateMinuteTalkSpeech(topic, transcript);

  // 3. Assemble and return the complete report
  return generateEvaluationReport({
    topic,
    transcript,
    durationSeconds,
    pauseEvents,
    fillerResult,
    vocabResult,
    aiResult: {
      contentScore: aiEvaluation.contentScore,
      structureScore: aiEvaluation.structureScore,
      fluencyScore: aiEvaluation.fluencyScore,
      confidenceScore: aiEvaluation.confidenceScore,
      grammarScore: aiEvaluation.grammarScore,
      vocabularyScore: aiEvaluation.vocabularyScore,
      grammarMistakes: aiEvaluation.grammarMistakes || [],
      grammarSuggestions: aiEvaluation.grammarSuggestions || [],
      advancedWordsDetected: aiEvaluation.advancedWords || [],
      detailedFeedback: aiEvaluation.detailedFeedback,
      suggestions: aiResultSuggestions(aiEvaluation)
    }
  });
}

function aiResultSuggestions(aiEvaluation: any): string[] {
  const suggestions: string[] = [];
  if (aiEvaluation.detailedFeedback) {
    if (aiEvaluation.detailedFeedback.content && aiEvaluation.contentScore < 7) {
      suggestions.push(aiEvaluation.detailedFeedback.content);
    }
    if (aiEvaluation.detailedFeedback.structure && aiEvaluation.structureScore < 7) {
      suggestions.push(aiEvaluation.detailedFeedback.structure);
    }
    if (aiEvaluation.detailedFeedback.grammar && aiEvaluation.grammarScore < 7) {
      suggestions.push(aiEvaluation.detailedFeedback.grammar);
    }
    if (aiEvaluation.detailedFeedback.vocabulary && aiEvaluation.vocabularyScore < 7) {
      suggestions.push(aiEvaluation.detailedFeedback.vocabulary);
    }
  }

  // Fallback to suggestions array if detailed tips are empty
  if (suggestions.length === 0 && aiEvaluation.suggestions) {
    suggestions.push(...aiEvaluation.suggestions);
  }

  return suggestions;
}
