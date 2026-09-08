// src/speech/speechRecognition.ts
import { supabase } from '../lib/supabase';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64 = base64data.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export class SpeechRecognitionService {
  private recognition: any = null;
  private isRecording = false;
  private isWebSpeechSupported = false;
  private isFallbackActive = false;
  private restartTimer: any = null;
  private restartAttempts = 0;

  // Callbacks
  private onTranscriptUpdate: (text: string) => void;
  private onError: (error: string) => void;

  // Transcripts state
  private fullTranscript = '';
  private currentInterim = '';

  constructor(options: {
    onTranscriptUpdate: (text: string) => void;
    onError: (error: string) => void;
  }) {
    this.onTranscriptUpdate = options.onTranscriptUpdate;
    this.onError = options.onError;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.isWebSpeechSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        if (!this.isRecording) return;
        this.restartAttempts = 0; // Reset restart attempts on valid result

        let interimTranscript = '';
        let finalTranscriptPart = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptPart += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscriptPart) {
          this.fullTranscript += (this.fullTranscript ? ' ' : '') + finalTranscriptPart;
        }

        this.currentInterim = interimTranscript;
        const displayText = this.fullTranscript + (interimTranscript ? ' ' + interimTranscript : '');
        this.onTranscriptUpdate(displayText.trim());
      };

      this.recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognitionService] Web Speech API error event:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.onError('Microphone access denied. Please grant permission.');
        } else if (event.error === 'network') {
          console.warn('[SpeechRecognitionService] Network error in Web Speech API. Switching to Whisper cloud fallback...');
          this.switchToFallback();
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          this.switchToFallback();
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if user is still recording and Web Speech is active
        if (this.isRecording && !this.isFallbackActive) {
          if (this.restartTimer) clearTimeout(this.restartTimer);

          this.restartTimer = setTimeout(() => {
            if (!this.isRecording || this.isFallbackActive) return;
            try {
              this.recognition.start();
              console.log('[SpeechRecognitionService] Successfully restarted Web Speech listener.');
            } catch (e: any) {
              console.warn('[SpeechRecognitionService] Auto-restart attempt failed:', e?.message || e);
              this.restartAttempts++;
              if (this.restartAttempts > 3) {
                console.warn('[SpeechRecognitionService] Too many failed restarts. Switching to Whisper cloud fallback.');
                this.switchToFallback();
              }
            }
          }, 200);
        }
      };
    } else {
      console.warn('[SpeechRecognitionService] Web Speech API not supported. Falling back to Whisper.');
      this.isWebSpeechSupported = false;
      this.isFallbackActive = true;
    }
  }

  async start(): Promise<void> {
    this.isRecording = true;
    this.fullTranscript = '';
    this.currentInterim = '';
    this.restartAttempts = 0;

    if (this.isWebSpeechSupported && !this.isFallbackActive) {
      try {
        this.recognition.start();
      } catch (err: any) {
        console.warn('[SpeechRecognitionService] Start failed, forcing fallback:', err.message);
        this.switchToFallback();
      }
    } else {
      this.isFallbackActive = true;
    }
  }

  // Active Whisper slice transcription
  async processAudioSlice(audioBlob: Blob): Promise<void> {
    if (!this.isRecording || !this.isFallbackActive) return;

    try {
      const base64Audio = await blobToBase64(audioBlob);
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { audio: base64Audio, file_type: audioBlob.type },
      });

      if (error) throw error;
      if (data && data.text) {
        this.fullTranscript = data.text;
        this.onTranscriptUpdate(this.fullTranscript.trim());
      }
    } catch (err: any) {
      console.error('[SpeechRecognitionService] Whisper fallback error:', err.message);
    }
  }

  private switchToFallback() {
    if (this.isFallbackActive) return;
    console.log('[SpeechRecognitionService] Switching to Whisper/STT fallback backend...');
    this.isFallbackActive = true;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  async stop(finalBlob?: Blob): Promise<string> {
    this.isRecording = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }

    if (this.isFallbackActive && finalBlob && finalBlob.size > 0) {
      // Run final transcription using Whisper for maximum accuracy
      try {
        const base64Audio = await blobToBase64(finalBlob);
        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: base64Audio, file_type: finalBlob.type },
        });

        if (error) throw error;
        if (data && data.text) {
          this.fullTranscript = data.text;
        }
      } catch (err: any) {
        console.error('[SpeechRecognitionService] Final Whisper transcription failed:', err.message);
      }
    }

    const finalResult = this.fullTranscript + (this.currentInterim ? ' ' + this.currentInterim : '');
    return finalResult.trim();
  }

  getIsFallbackActive(): boolean {
    return this.isFallbackActive;
  }
}
