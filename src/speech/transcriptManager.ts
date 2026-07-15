// src/speech/transcriptManager.ts

export class TranscriptManager {
  private interimTranscript = '';
  private finalizedTranscript = '';
  private totalTranscript = '';

  update(displayText: string) {
    this.totalTranscript = displayText;
  }

  setFinalized(text: string) {
    this.finalizedTranscript = text;
    this.interimTranscript = '';
    this.totalTranscript = text;
  }

  setInterim(text: string) {
    this.interimTranscript = text;
    this.totalTranscript = (this.finalizedTranscript + ' ' + text).trim();
  }

  getTranscript(): string {
    return this.totalTranscript.trim();
  }

  getInterim(): string {
    return this.interimTranscript;
  }

  getFinalized(): string {
    return this.finalizedTranscript;
  }

  reset() {
    this.interimTranscript = '';
    this.finalizedTranscript = '';
    this.totalTranscript = '';
  }
}
