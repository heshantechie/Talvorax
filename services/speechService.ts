/**
 * Speech Service for Talvorax Communication Coach
 * Handles recording, speech-to-text, and language detection.
 * Uses browser Web Speech API (no API key needed).
 *
 * KEY FIX: isAiSpeaking gate prevents AI voice leakage.
 * When the AI is speaking, recognition is hard-stopped and
 * cannot be restarted until setAiSpeaking(false) is called.
 */

export class SpeechService {
    private recognition: any = null;
    private onTranscriptUpdate: ((text: string) => void) | null = null;
    private onLanguageWarning: (() => void) | null = null;

    /** True when the user has explicitly requested recording to run */
    private isRecording = false;

    /** True when the Web Speech API instance is actively listening */
    private isRunning = false;

    /** TRUE while the AI TTS is playing — blocks ALL mic activity */
    private isAiSpeaking = false;

    private fullTranscript = '';
    private currentInterim = '';

    /** Pending restart timer (cleared when AI starts speaking) */
    private restartTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition is not supported in this browser.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        // Request echo cancellation + noise suppression to prevent AI TTS bleed
        if (navigator.mediaDevices?.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            }).catch(() => {
                // Silently ignore — browser will still grant mic access when recognition starts
            });
        }

        // ── onstart ────────────────────────────────────────────────────────
        this.recognition.onstart = () => {
            this.isRunning = true;
        };

        // ── onresult ───────────────────────────────────────────────────────
        this.recognition.onresult = (event: any) => {
            // CRITICAL GATE: discard all results while AI is speaking
            if (this.isAiSpeaking) {
                return;
            }
            if (!this.isRecording) return;

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
                if (this.detectNonEnglish(finalTranscriptPart)) {
                    this.onLanguageWarning?.();
                }
                this.fullTranscript +=
                    (this.fullTranscript ? ' ' : '') + finalTranscriptPart;
            }

            this.currentInterim = interimTranscript;
            const displayText =
                this.fullTranscript +
                (interimTranscript ? ' ' + interimTranscript : '');

            this.onTranscriptUpdate?.(displayText.trim());
        };

        // ── onerror ────────────────────────────────────────────────────────
        this.recognition.onerror = (event: any) => {
            if (event.error === 'aborted') {
                return;
            }
            if (event.error === 'no-speech') {
                return;
            }

            console.error('[SpeechService] Recognition error:', event.error);

            if (event.error === 'network' && this.isRecording && !this.isAiSpeaking) {
                console.log('[SpeechService] Network error — scheduling restart...');
                this.isRunning = false;
                this._scheduleRestart(1000);
            }
        };

        // ── onend ──────────────────────────────────────────────────────────
        this.recognition.onend = () => {
            this.isRunning = false;

            // Only auto-restart if user explicitly requested recording
            // AND the AI is NOT speaking.
            if (this.isRecording && !this.isAiSpeaking) {
                this._scheduleRestart(100);
            }
        };
    }

    // ── Public: AI speaking gate ───────────────────────────────────────────────

    /**
     * Call this BEFORE the AI TTS starts playing.
     * Immediately stops recognition and blocks any restart.
     */
    setAiSpeaking(speaking: boolean): void {
        this.isAiSpeaking = speaking;

        if (speaking) {
            this._clearRestartTimer();
            this._hardStop();
        }
    }

    // ── Public: Recording control ──────────────────────────────────────────────

    async startRecording(
        onTranscriptUpdate: (text: string) => void,
        onLanguageWarning: () => void
    ): Promise<void> {
        if (this.isAiSpeaking) {
            console.warn('[SpeechService] startRecording blocked — AI is speaking.');
            return;
        }

        this.onTranscriptUpdate = onTranscriptUpdate;
        this.onLanguageWarning = onLanguageWarning;
        this.fullTranscript = '';
        this.currentInterim = '';
        this.isRecording = true;

        if (!this.recognition) {
            console.error('[SpeechService] No recognition engine.');
            alert(
                'Speech recognition is not supported in this browser. ' +
                'Please use Google Chrome or Microsoft Edge.'
            );
            return;
        }

        if (!this.isRunning) {
            try {
                this.recognition.start();
            } catch (err: any) {
                console.warn('[SpeechService] start() failed:', err.message);
            }
        } else {
            console.log('[SpeechService] Recognition already running.');
        }
    }

    stopRecording(): Promise<string> {
        return new Promise((resolve) => {
            this.isRecording = false;
            this._clearRestartTimer();
            this._hardStop();

            const final =
                this.fullTranscript +
                (this.currentInterim ? ' ' + this.currentInterim : '');
            resolve(final.trim());
        });
    }

    getIsRecording(): boolean {
        return this.isRecording;
    }

    /** Expose the AI-speaking flag so callers can guard against voice leak */
    getIsAiSpeaking(): boolean {
        return this.isAiSpeaking;
    }

    getCurrentTranscript(): string {
        const final =
            this.fullTranscript +
            (this.currentInterim ? ' ' + this.currentInterim : '');
        return final.trim();
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private _hardStop(): void {
        if (this.recognition && this.isRunning) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.warn('[SpeechService] stop() error:', e);
            }
            this.isRunning = false;
        }
    }

    private _scheduleRestart(delayMs: number): void {
        this._clearRestartTimer();
        this.restartTimer = setTimeout(() => {
            if (this.isRecording && !this.isAiSpeaking && !this.isRunning) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.warn('[SpeechService] Restart failed:', e);
                }
            }
        }, delayMs);
    }

    private _clearRestartTimer(): void {
        if (this.restartTimer !== null) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
    }

    private detectNonEnglish(text: string): boolean {
        if (!text || text.trim().length < 3) return false;
        const nonLatinPattern = /[^\x00-\x7F\u00C0-\u024F]/g;
        const nonLatinChars = (text.match(nonLatinPattern) || []).length;
        const ratio = nonLatinChars / text.length;
        return ratio > 0.3;
    }
}

/**
 * Speak text using the browser's SpeechSynthesis.
 *
 * KEY FIX: Accepts a SpeechService instance and calls
 * setAiSpeaking(true/false) to hard-block the mic while the AI speaks.
 */
export function speakText(
    text: string,
    onEnd?: () => void,
    speechService?: SpeechService
): void {
    if (!('speechSynthesis' in window)) {
        onEnd?.();
        return;
    }

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;

    // ── Block mic before AI starts ─────────────────────────────────────────
    speechService?.setAiSpeaking(true);

    utterance.onstart = () => {
        // TTS started
    };

    const handleEnd = () => {
        // Safety delay so the speaker audio fully clears the mic buffer before we release
        setTimeout(() => {
            speechService?.setAiSpeaking(false);
            onEnd?.();
        }, 800);
    };

    utterance.onend = handleEnd;
    utterance.onerror = handleEnd;

    window.speechSynthesis.speak(utterance);
}
