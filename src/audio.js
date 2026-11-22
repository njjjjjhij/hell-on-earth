/* ============================================================
   HELL ON EARTH — audio
   Voice comms: ElevenLabs synthesized lines (public/audio)
   Sound design: procedural WebAudio synthesis
   ============================================================ */

const VOICE_FILES = {
  no_ammo:        { file: 'no_ammo.mp3',        label: "I'M OUT OF AMMO!", sub: "I'm out of ammo! Somebody get me a weapon!" },
  unarmed_cover:  { file: 'unarmed_cover.mp3',  label: 'UNARMED', sub: "My weapon's gone! I'm unarmed, cover me!" },
  running_dry:    { file: 'running_dry.mp3',    label: 'DRY',     sub: "No gun! I'm running dry out here!" },
  toss_rifle:     { file: 'toss_rifle.mp3',     label: 'REQUEST', sub: "Somebody toss me a rifle! I'm unarmed!" },
  dry_need_weapon:{ file: 'dry_need_weapon.mp3',label: 'DRY',     sub: "I'm dry! Need a weapon, now!" },
  announcer_match:{ file: 'announcer_match.mp3',label: 'COMMAND', sub: 'Thirty versus thirty. Choose your side, soldier.' },
  dog_productive: { file: 'dog_productive.mp3', label: 'DP',      sub: 'Dog Productive.' },
  armor_inbound:  { file: 'armor_inbound.mp3',  label: 'COMMAND', sub: 'Hostile armor inbound. Get to cover. Hold the line.' }
};
export const VOICE_KEYS = Object.keys(VOICE_FILES);
export const voiceMeta = (k) => VOICE_FILES[k];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.vol = 0.8;
    this._voices = new Map();
    this._lastVoiceAt = 0;
    this._musicTimer = null;
    this._ambTimer = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.vol;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 22; comp.ratio.value = 5;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.95; this.sfxBus.connect(this.master);
    this.voiceBus = ctx.createGain(); this.voiceBus.gain.value = 1.0; this.voiceBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.0; this.musicBus.connect(this.master);
    this.noise = this._noiseBuffer();
    return ctx;
  }

  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }

  _noiseBuffer() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseSrc(loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise; s.loop = loop;
    return s;
  }

  /* ------------------------- weapons ------------------------- */
  shot(kind = 'rifle', dist = 0) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const far = Math.max(0, Math.min(1, dist / 90));
    const vol = (1 - far * 0.78) * (kind === 'launcher' ? 1.15 : 0.85);

    // crack
    const src = this._noiseSrc();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = kind === 'sniper' ? 1500 : kind === 'lmg' ? 900 : 1250;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    const dur = kind === 'sniper' ? 0.3 : 0.16;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    src.start(t); src.stop(t + dur + 0.02);

    // body / thump
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const f0 = kind === 'sniper' ? 110 : kind === 'lmg' ? 95 : 130;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(vol * 0.9, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(og); og.connect(this.sfxBus);
    osc.start(t); osc.stop(t + 0.16);

    // distant tail
    if (far > 0.15) {
      const tail = this._noiseSrc();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(vol * 0.35, t + 0.03);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      tail.connect(lp); lp.connect(tg); tg.connect(this.sfxBus);
      tail.start(t); tail.stop(t + 0.55);
    }
  }

  explosion(dist = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const vol = 1 - Math.min(0.8, dist / 140);
    const src = this._noiseSrc();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    src.connect(lp); lp.connect(g); g.connect(this.sfxBus);
    src.start(t); src.stop(t + 1.45);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(72, t);
    sub.frequency.exponentialRampToValueAtTime(24, t + 0.7);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(vol * 1.1, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    sub.connect(sg); sg.connect(this.sfxBus);
    sub.start(t); sub.stop(t + 0.95);
  }

  hit() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square'; o.frequency.setValueAtTime(1400, t);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + 0.08);
  }

  flesh() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = this._noiseSrc();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    s.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    s.start(t); s.stop(t + 0.12);
  }

  whiz() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = this._noiseSrc();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 4;
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    s.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    s.start(t); s.stop(t + 0.2);
  }

  reload() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [0, 0.16, 0.34].forEach((d, i) => {
      const s = this._noiseSrc();
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = i === 2 ? 2200 : 1500; bp.Q.value = 2.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, t + d);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.08);
      s.connect(bp); bp.connect(g); g.connect(this.sfxBus);
      s.start(t + d); s.stop(t + d + 0.1);
    });
  }

  step() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = this._noiseSrc();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    s.connect(lp); lp.connect(g); g.connect(this.sfxBus);
    s.start(t); s.stop(t + 0.12);
  }

  ui() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(760, t);
    o.frequency.exponentialRampToValueAtTime(1120, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + 0.1);
  }

  /* ------------------------- vehicles ------------------------- */
  engineStart() {
    if (!this.ctx) return { set(){}, stop(){} };
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    osc.type = 'sawtooth'; sub.type = 'square';
    osc.frequency.value = 48; sub.frequency.value = 24;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 2;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    osc.connect(lp); sub.connect(lp); lp.connect(g); g.connect(this.sfxBus);
    osc.start(); sub.start();
    g.gain.setTargetAtTime(0.1, ctx.currentTime, 0.4);
    let running = true;
    return {
      set(speed, throttle) {
        if (!running) return;
        const base = 44 + Math.abs(speed) * 2.4 + (throttle ? 12 : 0);
        osc.frequency.setTargetAtTime(base, ctx.currentTime, 0.12);
        sub.frequency.setTargetAtTime(base * 0.5, ctx.currentTime, 0.12);
        g.gain.setTargetAtTime(0.07 + Math.abs(speed) * 0.004, ctx.currentTime, 0.2);
      },
      stop() {
        running = false;
        g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
        setTimeout(() => { try { osc.stop(); sub.stop(); } catch (e) {} }, 700);
      }
    };
  }

  /* ------------------------- voices ------------------------- */
  speak(key, { volume = 1, subtitle = true, onSub } = {}) {
    const meta = VOICE_FILES[key];
    if (!meta) return null;
    if (!this.ctx) this.init();
    const now = performance.now();
    if (now - this._lastVoiceAt < 220) return null; // anti-spam
    this._lastVoiceAt = now;
    try {
      let a = this._voices.get(key);
      if (!a) {
        a = new Audio(`${import.meta.env.BASE_URL}audio/${meta.file}`);
        a.preload = 'auto';
        this._voices.set(key, a);
      }
      a.volume = Math.max(0, Math.min(1, volume * this.vol));
      try { a.currentTime = 0; } catch (e) {}
      if (!a._fallbackBound) {
        a._fallbackBound = true;
        a.addEventListener('error', () => this._ttsFallback(key, meta, volume), { once: true });
      }
      const p = a.play();
      if (p && p.catch) p.catch(() => this._ttsFallback(key, meta, volume));
      if (onSub) onSub(meta);
      return a;
    } catch (e) { return null; }
  }

  /* Browser speech fallback when a voice clip is unavailable (e.g. hosted build). */
  _ttsFallback(key, meta, volume) {
    if (!('speechSynthesis' in window)) return;
    if (!this._ttsTried) this._ttsTried = new Set();
    if (this._ttsTried.has(key)) return;
    this._ttsTried.add(key);
    try {
      const u = new SpeechSynthesisUtterance(String(meta.sub || '').replace(/^["']|["']$/g, ''));
      u.rate = 1.0; u.pitch = 0.8;
      u.volume = Math.max(0.05, Math.min(1, volume * this.vol));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }

  /* ------------------------- music / ambience ------------------------- */
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    const ctx = this.ctx;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(0.22, ctx.currentTime, 1.5);
    const root = 55;
    // drone
    const drone = ctx.createOscillator();
    const drone2 = ctx.createOscillator();
    drone.type = 'sawtooth'; drone2.type = 'sine';
    drone.frequency.value = root; drone2.frequency.value = root * 1.5;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    const dg = ctx.createGain(); dg.gain.value = 0.16;
    drone.connect(lp); drone2.connect(lp); lp.connect(dg); dg.connect(this.musicBus);
    drone.start(); drone2.start();
    this._drone = { drone, drone2, lp };

    // slow heartbeat / war drum
    let step = 0;
    this._musicTimer = setInterval(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      if (step % 4 === 0) {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(70, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.34);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.5);
      }
      if (step % 16 === 8) {
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(174.6, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.09, t + 1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
        o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 4.6);
      }
      step++;
    }, 620);
  }

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
    if (this._drone && this.ctx) {
      this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      setTimeout(() => {
        try { this._drone.drone.stop(); this._drone.drone2.stop(); } catch (e) {}
      }, 1500);
      this._drone = null;
    }
  }

  startAmbience() {
    if (!this.ctx || this._ambTimer) return;
    const ctx = this.ctx;
    const wind = this._noiseSrc(true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0.05;
    wind.connect(lp); lp.connect(g); g.connect(this.master);
    wind.start();
    this._wind = { wind, g };
    this._ambTimer = setInterval(() => {
      if (Math.random() < 0.45) this.explosion(70 + Math.random() * 60);
    }, 9000);
  }

  stopAmbience() {
    if (this._ambTimer) { clearInterval(this._ambTimer); this._ambTimer = null; }
    if (this._wind) {
      try { this._wind.wind.stop(); } catch (e) {}
      this._wind = null;
    }
  }
}
