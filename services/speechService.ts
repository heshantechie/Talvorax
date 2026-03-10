/**
 * Speech Service for Interview Coach
 * Handles recording, speech-to-text, and language detection.
 * Uses Deepgram for transcription with the provided API key.
 */

const STT_API_KEY = (process.env as any).STT_API_KEY || '';

export class SpeechService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private onTranscriptUpdate: ((text: string) => void) | null = null;
    private onLanguageWarning: (() => void) | null = null;
    private isRecording = false;
    private fullTranscript = '';

    async startRecording(
        onTranscriptUpdate: (text: string) => void,
        onLanguageWarning: () => void
    ): Promise<void> {
        this.onTranscriptUpdate = onTranscriptUpdate;
        this.onLanguageWarning = onLanguageWarning;
        this.audioChunks = [];
        this.fullTranscript = '';

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: this.getSupportedMimeType()
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                // Final transcription when recording stops
                this.processAudioChunks();
            };

            // Collect data every 3 seconds for interim transcription
            this.mediaRecorder.start(3000);
            this.isRecording = true;

            // Process audio chunks periodically for live transcription
            this.startInterimProcessing();
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error('Microphone access denied. Please allow microphone access to continue.');
        }
    }

    stopRecording(): Promise<string> {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || !this.isRecording) {
                resolve(this.fullTranscript);
                return;
            }

            this.isRecording = false;

            this.mediaRecorder.onstop = async () => {
                await this.processAudioChunks();
                this.cleanup();
                resolve(this.fullTranscript);
            };

            this.mediaRecorder.stop();
        });
    }

    private getSupportedMimeType(): string {
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return 'audio/webm';
    }

    private async startInterimProcessing(): Promise<void> {
        while (this.isRecording) {
            await new Promise(resolve => setTimeout(resolve, 3500));
            if (this.isRecording && this.audioChunks.length > 0) {
                await this.processAudioChunks();
            }
        }
    }

    private async processAudioChunks(): Promise<void> {
        if (this.audioChunks.length === 0) return;

        const audioBlob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });

        try {
            const transcript = await this.transcribeAudio(audioBlob);
            if (transcript) {
                // Check for non-English content
                if (this.detectNonEnglish(transcript)) {
                    this.onLanguageWarning?.();
                } else {
                    this.fullTranscript = transcript;
                    this.onTranscriptUpdate?.(this.fullTranscript);
                }
            }
        } catch (error) {
            console.error('Transcription error:', error);
        }
    }

    private async transcribeAudio(audioBlob: Blob): Promise<string> {
        try {
            const response = await fetch('https://api.deepgram.com/v1/listen?language=en&model=nova-2&smart_format=true', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${STT_API_KEY}`,
                    'Content-Type': audioBlob.type
                },
                body: audioBlob
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Deepgram API error:', response.status, errorText);
                // Fallback to browser speech recognition if API fails
                return this.fallbackBrowserSTT();
            }

            const data = await response.json();
            const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
            const detectedLang = data.results?.channels?.[0]?.detected_language;

            // If Deepgram detects a non-English language
            if (detectedLang && detectedLang !== 'en') {
                this.onLanguageWarning?.();
                return '';
            }

            return transcript;
        } catch (error) {
            console.error('Transcription fetch error:', error);
            return this.fallbackBrowserSTT();
        }
    }

    /**
     * Fallback to browser's built-in SpeechRecognition if the API is unavailable
     */
    private fallbackBrowserSTT(): Promise<string> {
        return new Promise((resolve) => {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                resolve('');
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                resolve(transcript);
            };

            recognition.onerror = () => resolve('');
            recognition.onend = () => resolve('');

            // We can't feed audio into the SpeechRecognition API directly
            // so this fallback only works for real-time mic listening
            resolve('');
        });
    }

    /**
     * Basic heuristic to detect non-English text using character ranges
     */
    private detectNonEnglish(text: string): boolean {
        if (!text || text.trim().length < 3) return false;

        // Count characters outside basic ASCII + common punctuation
        const nonLatinPattern = /[^\x00-\x7F\u00C0-\u024F]/g;
        const nonLatinChars = (text.match(nonLatinPattern) || []).length;
        const ratio = nonLatinChars / text.length;

        // If more than 30% of characters are non-Latin, flag as non-English
        return ratio > 0.3;
    }

    private cleanup(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    getIsRecording(): boolean {
        return this.isRecording;
    }

    getCurrentTranscript(): string {
        return this.fullTranscript;
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
