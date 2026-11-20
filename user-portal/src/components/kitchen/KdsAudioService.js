'use client';

/**
 * KdsAudioService
 * Web Audio API synthesizer for loud, crystal-clear kitchen chimes.
 * Operates without external asset dependencies and works offline.
 */
class KdsAudioService {
  constructor() {
    this.ctx = null;
    this.muted = typeof window !== 'undefined' ? localStorage.getItem('kds_audio_muted') === 'true' : false;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kds_audio_muted', this.muted ? 'true' : 'false');
    }
  }

  playTone(freq, duration, delay = 0, type = 'sine') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const startTime = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Bell decay envelope
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    } catch (_) {}
  }

  /**
   * Loud, friendly two-tone kitchen order chime (D5 -> A5)
   */
  playNewOrderChime() {
    this.playTone(587.33, 0.45, 0);     // D5 note
    this.playTone(880.00, 0.70, 0.18);  // A5 note
  }

  /**
   * Gentle acknowledgment chime on station approval
   */
  playWelcomeChime() {
    this.playTone(523.25, 0.25, 0);     // C5
    this.playTone(659.25, 0.25, 0.12);  // E5
    this.playTone(783.99, 0.45, 0.24);  // G5
  }
}

export const kdsAudio = new KdsAudioService();
