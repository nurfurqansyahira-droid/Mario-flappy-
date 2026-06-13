/**
 * Retro Chiptune & Sound Effects Manager
 * Powered by HTML5 Web Audio API
 */

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // Audio state
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  
  // BGM sequencer states
  private sequencerTimer: NodeJS.Timeout | null = null;
  private nextNoteTime: number = 0.0;
  private currentStep: number = 0;
  
  // Tempo & music notes (lighthearted retro game vibe)
  private readonly tempo = 130; // BPM
  private readonly secondsPerBeat = 60.0 / 130;
  private readonly secondsPerStep = (60.0 / 130) / 2; // Eighth notes as steps
  
  // Melody loop (C Major / A Minor family)
  // Midi values: C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, B4=71, C5=72, D5=74, E5=76
  // 0 representsrest
  private readonly melodyPattern: number[] = [
    64, 0, 64, 67, 72, 0, 67, 0,
    69, 0, 69, 72, 67, 0, 0, 0,
    65, 0, 65, 69, 67, 0, 64, 0,
    62, 0, 62, 64, 60, 0, 62, 0,
    // Bar 5-8 variations
    64, 64, 67, 72, 76, 0, 72, 0,
    74, 0, 74, 76, 72, 0, 0, 0,
    69, 69, 72, 69, 67, 0, 64, 0,
    62, 0, 65, 62, 60, 0, 0, 0
  ];

  private readonly bassPattern: number[] = [
    48, 48, 55, 48, 52, 52, 55, 52,
    45, 45, 52, 45, 50, 50, 55, 50,
    41, 41, 48, 41, 43, 43, 50, 43,
    48, 48, 52, 48, 47, 47, 43, 47,
    // Repeat with variance
    48, 48, 55, 48, 52, 52, 55, 52,
    45, 45, 52, 45, 50, 50, 55, 50,
    41, 41, 48, 41, 43, 43, 50, 43,
    48, 48, 48, 48, 36, 48, 48, 0
  ];

  constructor() {
    // We defer actual Web Audio startup until first user interaction
  }

  /**
   * Safe AudioContext initialization
   */
  private ensureContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      
      this.ctx = new AudioCtxClass();
      
      // Setup node graph
      this.masterGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
      this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime); // keep music slightly quieter
      this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      
      this.bgmGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    
    // Resume context if suspended
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Helper to convert MIDI note to frequency
   */
  private midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  /**
   * Plays a jump SFX: sharp pitch sweep upwards (8-bit style)
   */
  public playJump() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      // Triangle or Square wave depending on classic 8-bit jump sound
      osc.type = 'triangle';
      
      // Quick pitch rise from 150Hz to 600Hz
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.15);

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(1.0, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gainNode);
      if (this.sfxGain) {
        gainNode.connect(this.sfxGain);
      } else {
        gainNode.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  /**
   * Plays a point point-earned SFX: classic double high-pitched beep arpeggio
   */
  public playPoint() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      // Square wave for energetic retro sound
      osc.type = 'square';
      
      // Play a short dynamic high beep pattern (C6 then G6)
      const noteDuration = 0.07;
      osc.frequency.setValueAtTime(1046.50, now); // C6
      osc.frequency.setValueAtTime(1567.98, now + noteDuration); // G6

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(0.8, now + 0.01);
      gainNode.gain.setValueAtTime(0.8, now + noteDuration);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + noteDuration * 2);

      osc.connect(gainNode);
      if (this.sfxGain) {
        gainNode.connect(this.sfxGain);
      } else {
        gainNode.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(now + noteDuration * 2.2);
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  /**
   * Plays a Game Over SFX: descending notes with a detuned buzzer arpeggio
   */
  public playGameOver() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      this.stopBgm(); // Stop background music under game over
      
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      const gain2 = this.ctx.createGain();

      // Despair-inducing downward pitch sweep
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(400, now);
      osc1.frequency.exponentialRampToValueAtTime(60, now + 0.85);

      gain1.gain.setValueAtTime(0.8, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.3);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      // Noise-like low rumble
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(120, now);
      osc2.frequency.setValueAtTime(100, now + 0.15);
      osc2.frequency.setValueAtTime(80, now + 0.3);
      osc2.frequency.setValueAtTime(50, now + 0.45);

      gain2.gain.setValueAtTime(0.9, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      osc1.connect(gain1);
      osc2.connect(gain2);
      
      if (this.sfxGain) {
        gain1.connect(this.sfxGain);
        gain2.connect(this.sfxGain);
      } else {
        gain1.connect(this.ctx.destination);
        gain2.connect(this.ctx.destination);
      }

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  /**
   * Plays a minor positive level-start SFX
   */
  public playStart() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      
      // Simple quick 1-2-3 arpeggio
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      });

      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.setValueAtTime(0.4, now + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gainNode);
      if (this.sfxGain) {
        gainNode.connect(this.sfxGain);
      } else {
        gainNode.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  /**
   * Audio Scheduler loop for procedural background music (chiptune)
   */
  private scheduler() {
    if (!this.ctx || !this.isBgmPlaying) return;

    // Schedule any notes that should fall within our lookahead window (next 100ms)
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }

    // Tick again shortly
    this.sequencerTimer = setTimeout(() => this.scheduler(), 35);
  }

  private advanceStep() {
    this.nextNoteTime += this.secondsPerStep;
    this.currentStep = (this.currentStep + 1) % this.melodyPattern.length;
  }

  /**
   * Schedule a melody and bass note at a precise audio timeline moment
   */
  private scheduleNote(stepNum: number, time: number) {
    if (!this.ctx || this.isMuted) return;

    const melMidi = this.melodyPattern[stepNum];
    const bassMidi = this.bassPattern[stepNum];

    // 1. Synthesize Melody (Square wave, bouncy 8-bit sound)
    if (melMidi > 0) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(this.midiToFreq(melMidi), time);

      // Cute staccato decay
      gainNode.gain.setValueAtTime(0.01, time);
      gainNode.gain.linearRampToValueAtTime(0.20, time + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + this.secondsPerStep - 0.02);

      osc.connect(gainNode);
      if (this.bgmGain) gainNode.connect(this.bgmGain);
      else gainNode.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + this.secondsPerStep);
    }

    // 2. Synthesize Bass (Triangle wave, deep & round)
    if (bassMidi > 0 && stepNum % 2 === 0) { // Keep bass running slightly steadier (quarter-notes vibes)
      const oscBass = this.ctx.createOscillator();
      const gainBass = this.ctx.createGain();

      oscBass.type = 'triangle';
      oscBass.frequency.setValueAtTime(this.midiToFreq(bassMidi), time);

      // Bass envelope
      gainBass.gain.setValueAtTime(0.01, time);
      gainBass.gain.linearRampToValueAtTime(0.35, time + 0.01);
      gainBass.gain.exponentialRampToValueAtTime(0.001, time + (this.secondsPerStep * 2) - 0.04);

      oscBass.connect(gainBass);
      if (this.bgmGain) gainBass.connect(this.bgmGain);
      else gainBass.connect(this.ctx.destination);

      oscBass.start(time);
      oscBass.stop(time + this.secondsPerStep * 2);
    }
  }

  /**
   * Toggles the BGM on or off
   */
  public toggleBgm(play: boolean) {
    this.ensureContext();
    if (!this.ctx) return;

    if (play) {
      if (!this.isBgmPlaying) {
        this.isBgmPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.currentStep = 0;
        this.scheduler();
      }
    } else {
      this.stopBgm();
    }
  }

  private stopBgm() {
    this.isBgmPlaying = false;
    if (this.sequencerTimer) {
      clearTimeout(this.sequencerTimer);
      this.sequencerTimer = null;
    }
  }

  /**
   * Mute and unmute master control
   */
  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.ensureContext();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0.0 : 0.4, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsBgmPlaying(): boolean {
    return this.isBgmPlaying;
  }
}

// Single active instance exported to remain global across hot/cold states
export const retroAudio = new RetroAudioEngine();
