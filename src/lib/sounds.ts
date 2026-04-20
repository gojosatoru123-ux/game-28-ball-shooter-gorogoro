
class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private createOscillator(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.ctx || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playShot() {
    this.createOscillator(880, 'sine', 0.1, 0.1);
    this.createOscillator(440, 'square', 0.05, 0.05);
  }

  playHit() {
    this.createOscillator(1200, 'sine', 0.15, 0.1);
  }

  playGoldHit() {
    this.createOscillator(2000, 'sine', 0.3, 0.1);
    setTimeout(() => this.createOscillator(2500, 'sine', 0.2, 0.05), 50);
  }

  playBombHit() {
    this.init();
    if (!this.ctx) return;
    const duration = 0.5;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playMiss() {
    this.createOscillator(220, 'triangle', 0.2, 0.1);
  }

  playSlowMoActivate() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  playLevelUp() {
    const notes = [440, 554, 659, 880];
    notes.forEach((note, i) => {
      setTimeout(() => this.createOscillator(note, 'sine', 0.2, 0.1), i * 100);
    });
  }

  playShieldHit() {
    this.createOscillator(600, 'square', 0.1, 0.05);
  }
}

export const sounds = new SoundService();
