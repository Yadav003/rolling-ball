// Sound Synthesizer using Web Audio API (No external sound files required)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("playarenaMuted") === "true";
    this.rollingOsc = null;
    this.rollingGain = null;
    this.isRolling = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.initRollingSound();
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("playarenaMuted", String(this.muted));
    if (this.muted && this.rollingGain) {
      this.rollingGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  initRollingSound() {
    if (!this.ctx) return;
    try {
      this.rollingOsc = this.ctx.createOscillator();
      this.rollingOsc.type = "triangle";
      this.rollingOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.rollingGain = this.ctx.createGain();
      this.rollingGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.rollingOsc.connect(filter);
      filter.connect(this.rollingGain);
      this.rollingGain.connect(this.ctx.destination);

      this.rollingOsc.start();
      this.isRolling = true;
    } catch (e) {
      console.warn("Audio init error:", e);
    }
  }

  updateRolling(speed, isGrounded) {
    if (!this.ctx || !this.rollingGain || this.muted) return;
    const now = this.ctx.currentTime;
    if (!isGrounded || speed <= 1) {
      this.rollingGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }
    const targetGain = Math.min(0.12, 0.03 + (speed / 40) * 0.07);
    const targetFreq = Math.min(220, 50 + speed * 4);
    this.rollingGain.gain.setTargetAtTime(targetGain, now, 0.05);
    this.rollingOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
  }

  stopRolling() {
    if (!this.ctx || !this.rollingGain) return;
    this.rollingGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  playGem() {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playStart() {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const freqs = [349.23, 440.0, 523.25, 698.46];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + idx * 0.05 + 0.2);

      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.28);
    });
  }

  playBoost() {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  playJump() {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCrash() {
    if (!this.ctx || this.muted) return;
    this.resume();
    this.stopRolling();
    const now = this.ctx.currentTime;

    // Sub rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);

    // Noise burst
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.3);
    } catch (e) {}
  }

  playLevelComplete() {
    if (!this.ctx || this.muted) return;
    this.resume();
    this.stopRolling();
    const now = this.ctx.currentTime;

    // Uplifting victory fanfare (C - E - G - C arpeggio chord)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.24, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.6);
    });
  }
}

window.soundManager = new SoundManager();
