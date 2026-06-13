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

  // Upbeat Speedway Track patterns
  private readonly melodyPatternSpeedway: number[] = [
    72, 72, 76, 72, 79, 0, 79, 0,
    77, 0, 77, 79, 74, 0, 76, 0,
    72, 72, 76, 72, 79, 0, 79, 0,
    81, 0, 83, 84, 79, 0, 0, 0,
    77, 77, 81, 77, 76, 76, 79, 76,
    74, 74, 77, 74, 72, 0, 67, 0,
    69, 71, 72, 74, 76, 77, 79, 81,
    83, 0, 84, 0, 84, 0, 0, 0
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

  private readonly bassPatternSpeedway: number[] = [
    48, 48, 48, 48, 48, 48, 48, 48,
    50, 50, 50, 50, 50, 50, 50, 50,
    52, 52, 52, 52, 52, 52, 52, 52,
    55, 55, 55, 55, 48, 48, 48, 48,
    45, 45, 45, 45, 41, 41, 41, 41,
    43, 43, 43, 43, 48, 48, 48, 48,
    45, 45, 47, 47, 48, 48, 50, 50,
    52, 0, 55, 0, 48, 0, 0, 0
  ];

  private activeMusicTrack: "CASTLE" | "SPEEDWAY" = "CASTLE";

  constructor() {
    // We defer actual Web Audio startup until first user interaction
  }

  /**
   * Safe AudioContext initialization
   */
  private ensureContext() {
    if (typeof window === "undefined") return;
    if (this.ctx && this.ctx.state === "running") return;

    if (!this.ctx) {
      try {
        const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass || typeof AudioCtxClass !== "function") return;
        
        try {
          this.ctx = new AudioCtxClass();
        } catch (innerErr) {
          console.warn("Native AudioContext instantiation failed:", innerErr);
          this.ctx = null;
        }
        
        if (this.ctx) {
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
      } catch (e) {
        console.warn("Failed to initialize Web Audio context (possibly blocked or mock sandbox):", e);
        this.ctx = null;
        this.masterGain = null;
        this.bgmGain = null;
        this.sfxGain = null;
      }
    }
    
    // Resume context if suspended
    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch((err) => console.warn("AudioContext resume failed:", err));
      }
    } catch (e) {
      console.warn("Failed to resume audio context:", e);
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
   * Plays a crisp high metal gold coin chime sound
   */
  public playCoin() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine'; // pure round metal pitch
      
      const dur = 0.08;
      // High-pitched coin pickup chime (B5 rising rapidly to E6)
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + dur);

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(0.75, now + 0.01);
      gainNode.gain.setValueAtTime(0.75, now + dur);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + dur * 2);

      osc.connect(gainNode);
      if (this.sfxGain) {
        gainNode.connect(this.sfxGain);
      } else {
        gainNode.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(now + dur * 2.1);
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
   * Synthesizes an energetic, funny 8-bit chip vocalization that sounds just like "Mamma Mia!"
   */
  public playMammaMia() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      this.stopBgm(); // Always shut down background music immediately on defeat

      // Let's create an oscillator for the vocal formant approximation
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      // Use "sawtooth" for a nice buzzy, speech-like retro tone
      osc.type = "sawtooth"; 

      // Frequencies for the syllables: "Mam-ma Mi-a!"
      // G5 (784 Hz), A5 (880 Hz), C6 (1047 Hz), E5 (659 Hz)
      const t1 = now + 0.0;
      const t2 = now + 0.09;
      const t3 = now + 0.18;
      const t4 = now + 0.32;
      const tEnd = now + 0.55;

      // Pitch automation to mimic speech cadence
      osc.frequency.setValueAtTime(783.99, t1); // "Mam"
      osc.frequency.setValueAtTime(880.00, t2); // "ma"
      osc.frequency.setValueAtTime(1046.50, t3); // "Mi"
      osc.frequency.setValueAtTime(783.99, t4); // "a"
      osc.frequency.exponentialRampToValueAtTime(523.25, tEnd); // slide down (exclamation!)

      // Tone volume envelope to give distinct syllable boundaries (muttering effect)
      gainNode.gain.setValueAtTime(0, now);
      // "Mam"
      gainNode.gain.linearRampToValueAtTime(0.4, t1 + 0.02);
      gainNode.gain.setValueAtTime(0.4, t2 - 0.015);
      gainNode.gain.linearRampToValueAtTime(0.01, t2 - 0.005);
      
      // "ma"
      gainNode.gain.linearRampToValueAtTime(0.4, t2 + 0.02);
      gainNode.gain.setValueAtTime(0.4, t3 - 0.015);
      gainNode.gain.linearRampToValueAtTime(0.01, t3 - 0.005);
      
      // "Mi" (louder emphasis!)
      gainNode.gain.linearRampToValueAtTime(0.55, t3 + 0.02);
      gainNode.gain.setValueAtTime(0.55, t4 - 0.015);
      gainNode.gain.linearRampToValueAtTime(0.01, t4 - 0.005);
      
      // "a" (slide out)
      gainNode.gain.linearRampToValueAtTime(0.45, t4 + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, tEnd);

      // Lowpass filter to emulate the distinct warm/toyish low-fidelity speaker of retro cabinets
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.5, now);

      osc.connect(filter);
      filter.connect(gainNode);

      if (this.sfxGain) {
        gainNode.connect(this.sfxGain);
      } else {
        gainNode.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(tEnd + 0.05);

      // Second harmonizing oscillator for cartoonish depth (detuned triangle wave)
      const oscSec = this.ctx.createOscillator();
      const gainSec = this.ctx.createGain();
      oscSec.type = "triangle";
      
      oscSec.frequency.setValueAtTime(783.99 / 2, t1); // octaves lower to give body
      oscSec.frequency.setValueAtTime(880.00 / 2, t2);
      oscSec.frequency.setValueAtTime(1046.50 / 2, t3);
      oscSec.frequency.setValueAtTime(783.99 / 2, t4);
      oscSec.frequency.exponentialRampToValueAtTime(523.25 / 2, tEnd);

      gainSec.gain.setValueAtTime(0, now);
      gainSec.gain.linearRampToValueAtTime(0.2, t1 + 0.05);
      gainSec.gain.exponentialRampToValueAtTime(0.01, tEnd);

      oscSec.connect(gainSec);
      if (this.sfxGain) {
        gainSec.connect(this.sfxGain);
      } else {
        gainSec.connect(this.ctx.destination);
      }
      oscSec.start(now);
      oscSec.stop(tEnd + 0.05);
      
    } catch (e) {
      console.warn("Could not play Mamma Mia speech:", e);
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

  private getActiveMelodyPattern(): number[] {
    return this.activeMusicTrack === "SPEEDWAY" ? this.melodyPatternSpeedway : this.melodyPattern;
  }

  private getActiveBassPattern(): number[] {
    return this.activeMusicTrack === "SPEEDWAY" ? this.bassPatternSpeedway : this.bassPattern;
  }

  public setBgmTrack(track: "CASTLE" | "SPEEDWAY") {
    this.activeMusicTrack = track;
  }

  public getBgmTrack(): "CASTLE" | "SPEEDWAY" {
    return this.activeMusicTrack;
  }

  private advanceStep() {
    this.nextNoteTime += this.secondsPerStep;
    const activeMelody = this.getActiveMelodyPattern();
    this.currentStep = (this.currentStep + 1) % activeMelody.length;
  }

  /**
   * Schedule a melody and bass note at a precise audio timeline moment
   */
  private scheduleNote(stepNum: number, time: number) {
    if (!this.ctx || this.isMuted) return;

    const activeMelody = this.getActiveMelodyPattern();
    const activeBass = this.getActiveBassPattern();

    const melMidi = activeMelody[stepNum % activeMelody.length];
    const bassMidi = activeBass[stepNum % activeBass.length];

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
