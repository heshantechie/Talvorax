// src/speech/recorder.ts

export interface PauseEvent {
  start: number;      // Seconds from recording start
  duration: number;   // Seconds of silence
}

export class SpeechRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private chunks: Blob[] = [];

  // Silence/Pause detection state
  private isSilenceTracking = false;
  private silenceStartTime: number | null = null;
  private pauseEvents: PauseEvent[] = [];
  private volumeCheckInterval: any = null;
  private recordingStartTime = 0;

  // Configuration
  private silenceThreshold = 0.008; // RMS threshold below which is silence
  private minPauseDurationMs = 1500; // 1.5 seconds silence is a "long pause"

  // Callbacks
  private onVolumeChange: ((volume: number) => void) | null = null;
  private onPauseDetected: ((pause: PauseEvent) => void) | null = null;
  private onDataAvailable: ((blob: Blob) => void) | null = null;

  constructor(options?: {
    silenceThreshold?: number;
    minPauseDurationMs?: number;
    onVolumeChange?: (volume: number) => void;
    onPauseDetected?: (pause: PauseEvent) => void;
    onDataAvailable?: (blob: Blob) => void;
  }) {
    if (options?.silenceThreshold !== undefined) this.silenceThreshold = options.silenceThreshold;
    if (options?.minPauseDurationMs !== undefined) this.minPauseDurationMs = options.minPauseDurationMs;
    if (options?.onVolumeChange) this.onVolumeChange = options.onVolumeChange;
    if (options?.onPauseDetected) this.onPauseDetected = options.onPauseDetected;
    if (options?.onDataAvailable) this.onDataAvailable = options.onDataAvailable;
  }

  async start(): Promise<void> {
    this.chunks = [];
    this.pauseEvents = [];
    this.silenceStartTime = null;
    this.recordingStartTime = Date.now();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      console.error('[SpeechRecorder] Mic access error:', err);
      throw new Error(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Microphone permission denied. Please allow mic access in your browser.'
        : `Failed to acquire microphone: ${err.message}`);
    }

    // 1. Initialize MediaRecorder for Whisper fallback audio slices
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
        if (this.onDataAvailable) {
          const currentBlob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType });
          this.onDataAvailable(currentBlob);
        }
      }
    };

    // 2. Initialize Web Audio API for real-time silence/pause detection
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;

      this.audioSource = this.audioContext.createMediaStreamSource(this.stream);
      this.audioSource.connect(this.analyser);

      this.startSilenceTracking();
    } catch (audioErr) {
      console.warn('[SpeechRecorder] Web Audio API not fully supported or blocked:', audioErr);
    }

    // Start recording, request data chunks every 1 second
    this.mediaRecorder.start(1000);
  }

  private startSilenceTracking() {
    if (!this.analyser) return;

    this.isSilenceTracking = true;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    this.volumeCheckInterval = setInterval(() => {
      if (!this.analyser || !this.isSilenceTracking) return;

      this.analyser.getByteTimeDomainData(dataArray);

      // Compute RMS (Root Mean Square) volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Trigger volume visualizer callback
      if (this.onVolumeChange) {
        this.onVolumeChange(rms);
      }

      // Check for silence/pause
      const isSilent = rms < this.silenceThreshold;
      const now = Date.now();

      if (isSilent) {
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now;
        }
      } else {
        if (this.silenceStartTime !== null) {
          const silenceDuration = now - this.silenceStartTime;
          if (silenceDuration >= this.minPauseDurationMs) {
            const pauseStartSec = (this.silenceStartTime - this.recordingStartTime) / 1000;
            const pauseDurationSec = silenceDuration / 1000;
            const pauseEvent: PauseEvent = {
              start: parseFloat(pauseStartSec.toFixed(2)),
              duration: parseFloat(pauseDurationSec.toFixed(2)),
            };
            this.pauseEvents.push(pauseEvent);
            if (this.onPauseDetected) {
              this.onPauseDetected(pauseEvent);
            }
          }
          this.silenceStartTime = null;
        }
      }
    }, 100);
  }

  async stop(): Promise<{ blob: Blob; pauseEvents: PauseEvent[] }> {
    this.isSilenceTracking = false;
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }

    // Check if we are ending in a silence/pause
    if (this.silenceStartTime !== null) {
      const silenceDuration = Date.now() - this.silenceStartTime;
      if (silenceDuration >= this.minPauseDurationMs) {
        const pauseStartSec = (this.silenceStartTime - this.recordingStartTime) / 1000;
        const pauseDurationSec = silenceDuration / 1000;
        this.pauseEvents.push({
          start: parseFloat(pauseStartSec.toFixed(2)),
          duration: parseFloat(pauseDurationSec.toFixed(2)),
        });
      }
      this.silenceStartTime = null;
    }

    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const finalBlob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
          this.cleanup();
          resolve({ blob: finalBlob, pauseEvents: this.pauseEvents });
        };
        this.mediaRecorder.stop();
      } else {
        this.cleanup();
        resolve({ blob: new Blob([], { type: 'audio/webm' }), pauseEvents: this.pauseEvents });
      }
    });
  }

  private cleanup() {
    // 1. Stop all audio tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // 2. Disconnect Web Audio nodes
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
  }
}
