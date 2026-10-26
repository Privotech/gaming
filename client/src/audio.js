// ============================================================
// CITYVERSE NG  |  audio.js
// Procedural Web Audio API sound engine (no external assets needed)
// Horn, Engine RPM pitch, Generator rumble, Ambience, Fares, Food
// ============================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.generatorOsc = null;
    this.generatorGain = null;
    this.isMuted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Vehicle engine continuous synth
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();

      // Street Generator ("I pass my neighbor") ambient hum
      this.generatorOsc = this.ctx.createOscillator();
      this.generatorOsc.type = 'triangle';
      this.generatorOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

      const genFilter = this.ctx.createBiquadFilter();
      genFilter.type = 'lowpass';
      genFilter.frequency.setValueAtTime(160, this.ctx.currentTime);

      this.generatorGain = this.ctx.createGain();
      this.generatorGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.generatorOsc.connect(genFilter);
      genFilter.connect(this.generatorGain);
      this.generatorGain.connect(this.masterGain);
      this.generatorOsc.start();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Classic Nigerian dual-tone loud vehicle horn!
  playHorn() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(420, t);
    osc2.frequency.setValueAtTime(510, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(2, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.45);
    osc2.stop(t + 0.45);
  }

  // Cash / Fare collected chime (₦ Naira earnings)
  playCash() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const notes = [587.33, 880, 1174.66]; // D5, A5, D6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.2, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.25);
    });
  }

  // Door open/close sound for entering safehouse
  playDoor() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Buka food munching / refreshment sound
  playEat() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.1, 0.2].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280 + Math.random() * 80, t + offset);
      osc.frequency.exponentialRampToValueAtTime(140, t + offset + 0.07);

      gain.gain.setValueAtTime(0.18, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + 0.08);
    });
  }

  // Passenger boarding bell
  playChime() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, t); // G5
    osc.frequency.setValueAtTime(1046.50, t + 0.1); // C6

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Police / VIO traffic officer whistle chirp
  playPoliceWhistle() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.14].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, t + offset);
      osc.frequency.linearRampToValueAtTime(2800, t + offset + 0.05);
      osc.frequency.linearRampToValueAtTime(2300, t + offset + 0.1);

      gain.gain.setValueAtTime(0.3, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.11);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + 0.11);
    });
  }

  // Police / Patrol siren wail
  playPoliceSiren() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.linearRampToValueAtTime(1100, t + 0.35);
    osc.frequency.linearRampToValueAtTime(650, t + 0.7);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  // Radio tuning static burst
  playRadioTuning() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(3, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  // GTA 5 Punch Impact sound (fist melee hit)
  playPunch() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Fast whoosh + low punch thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    // Punch snap noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    noise.connect(nGain);
    nGain.connect(this.masterGain);
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.14);
    noise.start(t);
  }

  // Car metal dent / punch impact sound
  playDent() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(4, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Car door latch open and heavy slam shut
  playCarDoor() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Latch click
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(600, t);
    osc1.frequency.exponentialRampToValueAtTime(200, t + 0.06);
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc1.connect(g1);
    g1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.07);

    // Heavy metal door slam
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(140, t + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    g2.gain.setValueAtTime(0.45, t + 0.12);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc2.connect(g2);
    g2.connect(this.masterGain);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.38);
  }

  // Tyre screech / skid drift sound
  playScreech() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
    const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.linearRampToValueAtTime(1900, t + 0.15);
    filter.frequency.linearRampToValueAtTime(1400, t + 0.3);
    filter.Q.setValueAtTime(8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  // GTA 5 Iconic "WASTED" sub-bass death boom & reverb
  playWasted() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Deep sub-bass boom
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 1.2);
    subGain.gain.setValueAtTime(0.65, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 1.8);

    // Eerie minor interval drone
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(73.42, t); // D2
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    droneGain.gain.setValueAtTime(0.25, t);
    droneGain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    drone.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.masterGain);
    drone.start(t);
    drone.stop(t + 2.2);
  }

  // Driver/citizen alarm vocalization blip & horn honk
  playCarJackAlert() {
    this.playCarDoor();
    this.playHorn();
  }

  // Update vehicle engine pitch & volume based on driving speed (km/h) and throttle
  updateEngine(isDriving, speedKmh, throttle) {
    if (!this.initialized || !this.engineGain) return;
    if (!isDriving) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }
    const targetFreq = 42 + Math.min(speedKmh * 3.8, 160) + (throttle > 0 ? 30 : 0);
    const targetGain = 0.06 + Math.min(speedKmh / 120, 0.18) + (throttle !== 0 ? 0.08 : 0);

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
  }
}

// ---------- IN-CAR NIGERIAN RADIO STATIONS SYSTEM ----------
class RadioStationEngine {
  constructor(soundEngine) {
    this.se = soundEngine;
    this.currentStationIdx = 0; // 0 = Off
    this.timer = null;
    this.step = 0;
    this.radioGain = null;

    this.stations = [
      { id: 'off', name: 'Radio Off', freq: '--.-', tag: 'OFF', color: '#757575' },
      { id: 'splash', name: 'Splash FM 105.5', freq: '105.5 FM', tag: 'AFROBEATS HITS', title: 'Asake & Burna Vibes', color: '#ff9800' },
      { id: 'premier', name: 'Premier FM 93.5', freq: '93.5 FM', tag: 'IBADAN JUJU & HIGHLIFE', title: 'King Sunny Ade Classics', color: '#4caf50' },
      { id: 'fuji', name: 'Amúlùdùn 99.1 FM', freq: '99.1 FM', tag: 'FUJI POLYRHYTHM', title: 'Barrister & Pasuma Beats', color: '#e91e63' },
      { id: 'dugbe', name: 'Dugbe Radio 88.3', freq: '88.3 AM', tag: 'YORUBA TALK & NEWS', title: 'Oga Driver Traffic Report', color: '#00bcd4' },
    ];
  }

  getActiveStation() {
    return this.stations[this.currentStationIdx];
  }

  nextStation() {
    this.se.ensureContext();
    this.currentStationIdx = (this.currentStationIdx + 1) % this.stations.length;
    this.se.playRadioTuning();
    this.applyStation();
    return this.getActiveStation();
  }

  setStation(idx) {
    this.se.ensureContext();
    this.currentStationIdx = idx % this.stations.length;
    this.se.playRadioTuning();
    this.applyStation();
    return this.getActiveStation();
  }

  applyStation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.currentStationIdx === 0) return;

    if (!this.radioGain && this.se.ctx) {
      this.radioGain = this.se.ctx.createGain();
      this.radioGain.gain.setValueAtTime(0.22, this.se.ctx.currentTime);
      this.radioGain.connect(this.se.masterGain);
    }

    const st = this.stations[this.currentStationIdx];
    this.step = 0;

    // Tempo based on genre
    const intervalMs = st.id === 'fuji' ? 125 : st.id === 'splash' ? 144 : st.id === 'premier' ? 156 : 220;

    this.timer = setInterval(() => {
      this.tickRadioBeat(st.id);
    }, intervalMs);
  }

  tickRadioBeat(genre) {
    if (!this.se.ctx || !this.radioGain) return;
    const t = this.se.ctx.currentTime;
    const s = this.step % 16;
    this.step++;

    if (genre === 'splash') {
      // Afrobeats: Syncopated log drum / kick & bouncy chords
      if (s === 0 || s === 6 || s === 10) {
        // Log drum kick
        const osc = this.se.ctx.createOscillator();
        const g = this.se.ctx.createGain();
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(g);
        g.connect(this.radioGain);
        osc.start(t);
        osc.stop(t + 0.14);
      }
      if (s === 4 || s === 12) {
        // Snare / Shaker
        const osc = this.se.ctx.createOscillator();
        const g = this.se.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, t);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g);
        g.connect(this.radioGain);
        osc.start(t);
        osc.stop(t + 0.08);
      }
      // Melodic afro chords
      if (s % 4 === 0) {
        const chordRoots = [261.63, 329.63, 392.00, 440.00]; // C, E, G, A
        const note = chordRoots[(Math.floor(this.step / 4)) % chordRoots.length];
        const osc = this.se.ctx.createOscillator();
        const g = this.se.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, t);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(g);
        g.connect(this.radioGain);
        osc.start(t);
        osc.stop(t + 0.28);
      }
    } else if (genre === 'premier') {
      // Juju / Highlife: sweet bassline & syncopated guitar groove
      const bassNotes = [110, 138.59, 164.81, 146.83, 110, 98];
      const bFreq = bassNotes[(s * 2) % bassNotes.length];
      const bOsc = this.se.ctx.createOscillator();
      const bGain = this.se.ctx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(bFreq, t);
      bGain.gain.setValueAtTime(0.3, t);
      bGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      bOsc.connect(bGain);
      bGain.connect(this.radioGain);
      bOsc.start(t);
      bOsc.stop(t + 0.15);

      if (s % 2 === 1) {
        // Highlife bell rhythm
        const bell = this.se.ctx.createOscillator();
        const bg = this.se.ctx.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(880, t);
        bg.gain.setValueAtTime(0.1, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        bell.connect(bg);
        bg.connect(this.radioGain);
        bell.start(t);
        bell.stop(t + 0.06);
      }
    } else if (genre === 'fuji') {
      // Fuji: Energetic talking drum polyrhythm & driving tempo
      const fujiTones = [180, 240, 310, 270, 190, 360, 220];
      const tone = fujiTones[s % fujiTones.length];
      const osc = this.se.ctx.createOscillator();
      const g = this.se.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone, t);
      osc.frequency.exponentialRampToValueAtTime(tone * 0.8, t + 0.08);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(g);
      g.connect(this.radioGain);
      osc.start(t);
      osc.stop(t + 0.09);

      if (s % 4 === 0) {
        // Bass kick punch
        const kick = this.se.ctx.createOscillator();
        const kg = this.se.ctx.createGain();
        kick.frequency.setValueAtTime(110, t);
        kick.frequency.exponentialRampToValueAtTime(35, t + 0.12);
        kg.gain.setValueAtTime(0.4, t);
        kg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        kick.connect(kg);
        kg.connect(this.radioGain);
        kick.start(t);
        kick.stop(t + 0.12);
      }
    } else if (genre === 'dugbe') {
      // Dugbe Radio: Talk chatter tone & radio hum
      if (s % 3 === 0) {
        const talkFreq = 300 + Math.random() * 250;
        const osc = this.se.ctx.createOscillator();
        const g = this.se.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(talkFreq, t);

        const f = this.se.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(600, t);
        f.Q.setValueAtTime(4, t);

        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(f);
        f.connect(g);
        g.connect(this.radioGain);
        osc.start(t);
        osc.stop(t + 0.14);
      }
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.currentStationIdx = 0;
  }
}

export const sounds = new SoundEngine();
export const radio = new RadioStationEngine(sounds);

