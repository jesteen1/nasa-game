"use client";

/**
 * Procedural Web Audio sound effects - no asset files.
 *
 * The AudioContext can only be created/resumed from a user gesture, so call
 * `unlock()` from click handlers (Play, Launch, sound toggle). Engine rumble is
 * a looping noise + sub-oscillator pair whose gain follows thrust.
 */

export type SfxCue =
  | "beep"
  | "final"
  | "click"
  | "ignition"
  | "liftoff"
  | "separation"
  | "fairing"
  | "deploy"
  | "maxq"
  | "success"
  | "failure"
  | "abort";

const VOLUME = 0.5;

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private subGain: GainNode | null = null;
  private muted = false;

  unlock() {
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    if (!this.ctx) {
      const ctx = new Ctor();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : VOLUME;
      master.connect(ctx.destination);
      this.master = master;
      this.noise = this.makeNoise(ctx);
      this.buildEngine(ctx, master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : VOLUME, this.ctx.currentTime, 0.05);
    }
  }

  /** 0 = silent, 1 = full thrust. Smoothed so 10 Hz HUD updates stay smooth. */
  setEngine(level: number) {
    if (!this.ctx || !this.engineGain || !this.engineFilter || !this.subGain) return;
    const target = Math.max(0, Math.min(1, level));
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(target * 0.3, t, 0.12);
    this.subGain.gain.setTargetAtTime(target * 0.16, t, 0.15);
    this.engineFilter.frequency.setTargetAtTime(240 + target * 520, t, 0.25);
  }

  playCue(cue: SfxCue) {
    if (!this.ctx || !this.master || this.muted) return;
    switch (cue) {
      case "beep":
        this.blip(880, 0.09, "sine", 0.1);
        break;
      case "final":
        this.blip(1320, 0.4, "sine", 0.14);
        this.blip(660, 0.4, "sine", 0.06);
        break;
      case "click":
        this.blip(240, 0.045, "square", 0.04);
        break;
      case "ignition":
        this.noiseHit(0.7, 0.24, 700, 180);
        this.blip(70, 0.7, "sawtooth", 0.16, 38);
        break;
      case "liftoff":
        this.noiseHit(1.5, 0.5, 1100, 90);
        this.blip(72, 1.1, "sawtooth", 0.28, 30);
        this.noiseHit(0.5, 0.2, 2600, 600, "bandpass", 0.05);
        break;
      case "separation":
        this.blip(95, 0.35, "triangle", 0.28, 50);
        this.noiseHit(0.3, 0.22, 1600, 350, "bandpass");
        break;
      case "fairing":
        this.noiseHit(0.45, 0.18, 500, 5000, "highpass");
        break;
      case "deploy":
        this.blip(660, 0.16, "sine", 0.1);
        this.blip(990, 0.22, "sine", 0.09, undefined, 0.13);
        break;
      case "maxq":
        this.noiseHit(0.65, 0.16, 160, 1100, "bandpass");
        break;
      case "success":
        [523, 659, 784, 1046].forEach((freq, i) =>
          this.blip(freq, 0.32, "triangle", 0.1, undefined, i * 0.13),
        );
        break;
      case "failure":
        this.noiseHit(1.8, 0.55, 1800, 70);
        this.blip(130, 1.5, "sawtooth", 0.28, 28);
        break;
      case "abort":
        [0, 0.22, 0.44].forEach((delay) =>
          this.blip(440, 0.16, "square", 0.12, 330, delay),
        );
        break;
    }
  }

  private makeNoise(ctx: AudioContext) {
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish noise
      data[i] = last * 3.2;
    }
    return buffer;
  }

  private buildEngine(ctx: AudioContext, master: GainNode) {
    if (!this.noise) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 260;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();

    const sub = ctx.createOscillator();
    sub.type = "sawtooth";
    sub.frequency.value = 46;
    const subFilter = ctx.createBiquadFilter();
    subFilter.type = "lowpass";
    subFilter.frequency.value = 120;
    const subGain = ctx.createGain();
    subGain.gain.value = 0;
    sub.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(master);
    sub.start();

    this.engineFilter = filter;
    this.engineGain = gain;
    this.subGain = subGain;
  }

  private blip(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(env);
    env.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  private noiseHit(
    duration: number,
    gain: number,
    fromHz: number,
    toHz: number,
    type: BiquadFilterType = "lowpass",
    delay = 0,
  ) {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(fromHz, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), t + duration);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }
}

export const sfx = new SfxEngine();
