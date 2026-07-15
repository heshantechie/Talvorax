// src/speech/grammar.ts

export interface GrammarMistake {
  original: string;
  corrected: string;
  explanation: string;
  type: string; // Tense, Subject-Verb Agreement, Article, Preposition, Run-on, Fragment, General
}

export interface GrammarResult {
  score: number; // 0-10
  mistakes: GrammarMistake[];
  suggestions: string[];
}
