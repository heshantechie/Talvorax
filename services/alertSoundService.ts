class AlertSoundService {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    // Only create one AudioContext, and wait until a user gesture has occurred
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if it was suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  public playAlertSound() {
    try {
      const context = this.getAudioContext();
      
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Setup sine wave beep
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, context.currentTime); // A4 note
      
      // Short envelope to prevent clicking and make it subtle
      const duration = 0.2; // 200ms
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);
    } catch (e) {
      console.warn('Failed to play alert sound:', e);
    }
  }
}

export const alertSoundService = new AlertSoundService();
