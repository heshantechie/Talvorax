// src/speech/metrics.ts

export interface SpeechMetrics {
  elapsedSeconds: number;
  wordCount: number;
  wpm: number;
  speedCategory: string;
}

export function calculateWPM(wordCount: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  const minutes = durationSeconds / 60;
  return Math.round(wordCount / minutes);
}

export function getSpeedCategory(wpm: number): string {
  if (wpm === 0) return 'None';
  if (wpm < 100) return 'Very Slow';
  if (wpm < 120) return 'Slow';
  if (wpm <= 150) return 'Good';
  if (wpm <= 180) return 'Fast';
  return 'Very Fast';
}

export class MetricsTracker {
  private startTime = 0;
  private elapsedSeconds = 0;

  start() {
    this.startTime = Date.now();
    this.elapsedSeconds = 0;
  }

  updateElapsed(): number {
    this.elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);
    return this.elapsedSeconds;
  }

  getMetrics(transcript: string): SpeechMetrics {
    const cleanText = transcript.trim();
    const wordCount = cleanText ? cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;
    const wpm = calculateWPM(wordCount, this.elapsedSeconds);
    const speedCategory = getSpeedCategory(wpm);

    return {
      elapsedSeconds: this.elapsedSeconds,
      wordCount,
      wpm,
      speedCategory,
    };
  }

  getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  reset() {
    this.startTime = 0;
    this.elapsedSeconds = 0;
  }
}
