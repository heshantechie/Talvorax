/**
 * Speech Service for Interview Coach
 * Handles recording, speech-to-text, and language detection.
 * Uses Deepgram for transcription with the provided API key.
 */

const STT_API_KEY = (process.env as any).STT_API_KEY || '';

export class SpeechService {
    private recognition: any = null;
    private onTranscriptUpdate: ((text: string) => void) | null = null;
    private onLanguageWarning: (() => void) | null = null;
    private isRecording = false;
    private fullTranscript = '';
    private currentInterim = '';

    constructor() {
        // Initialize Web Speech API
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event: any) => {
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
                    // Check for non-English whenever a final chunk arrives
                    if (this.detectNonEnglish(finalTranscriptPart)) {
                        this.onLanguageWarning?.();
                    }
                    this.fullTranscript += (this.fullTranscript ? ' ' : '') + finalTranscriptPart;
                }

                this.currentInterim = interimTranscript;
                const displayText = this.fullTranscript + (interimTranscript ? ' ' + interimTranscript : '');
                
                if (this.onTranscriptUpdate) {
                    this.onTranscriptUpdate(displayText.trim());
                }
            };

            this.recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
            };

            this.recognition.onend = () => {
                // Auto-restart if we are still supposed to be recording but it stopped (e.g. silence timeout)
                if (this.isRecording) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.error('Could not restart recognition:', e);
                    }
                }
            };
        } else {
            console.warn('Speech recognition is not supported in this browser.');
        }
    }

    async startRecording(
        onTranscriptUpdate: (text: string) => void,
        onLanguageWarning: () => void
    ): Promise<void> {
        this.onTranscriptUpdate = onTranscriptUpdate;
        this.onLanguageWarning = onLanguageWarning;
        this.fullTranscript = '';
        this.currentInterim = '';
        this.isRecording = true;

        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        } else {
            console.error('Microphone access denied or browser not supported.');
            alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
        }
    }

    stopRecording(): Promise<string> {
        return new Promise((resolve) => {
            this.isRecording = false;
            if (this.recognition) {
                try {
                    this.recognition.stop();
                } catch (e) {
                    console.error('Error stopping recognition:', e);
                }
            }

            const final = this.fullTranscript + (this.currentInterim ? ' ' + this.currentInterim : '');
            resolve(final.trim());
        });
    }

    /**
     * Basic heuristic to detect non-English text using character ranges
     */
    private detectNonEnglish(text: string): boolean {
        if (!text || text.trim().length < 3) return false;

        const nonLatinPattern = /[^\x00-\x7F\u00C0-\u024F]/g;
        const nonLatinChars = (text.match(nonLatinPattern) || []).length;
        const ratio = nonLatinChars / text.length;

        // If more than 30% of characters are non-Latin, flag as non-English
        return ratio > 0.3;
    }

    getIsRecording(): boolean {
        return this.isRecording;
    }

    getCurrentTranscript(): string {
        const final = this.fullTranscript + (this.currentInterim ? ' ' + this.currentInterim : '');
        return final.trim();
    }
}

// Use browser's SpeechSynthesis for TTS (interviewer asking questions)
export function speakText(text: string, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) {
        onEnd?.();
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
        || voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
}
