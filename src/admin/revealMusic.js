// Procedural soundtrack for the reveal — synthesized live with the Web Audio
// API, no audio files. Three moods:
//   groove  — easygoing lo-fi beat for the intro / slideshow / map
//   tension — low drone + rising pulse for the podium reveals
//   fanfare — brass hits + timpani roll into an upbeat "party" groove (winner)
// Browsers require a user gesture to start audio, so the reveal has an explicit
// 🔊 toggle; nothing plays until it's pressed.

const F = (midi) => 440 * Math.pow(2, (midi - 69) / 12)

export class MusicEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.mood = null
    this.timer = null
    this.step = 0
    this.nextTime = 0
    this.noiseBuf = null
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.16
      this.master.connect(this.ctx.destination)
      // 1s of white noise, reused for hats/snares/sweeps.
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      this.noiseBuf = buf
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  start(mood) {
    this.ensure()
    this.setMood(mood, true)
    if (!this.timer) {
      this.nextTime = this.ctx.currentTime + 0.06
      this.timer = setInterval(() => this.tick(), 25)
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.mood = null
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend()
  }

  setMood(mood, force = false) {
    if (!this.ctx) return
    if (mood === this.mood && !force) return
    if (mood === 'fanfare') {
      this.mood = 'party'
      this.playFanfare()
      return
    }
    this.mood = mood
    this.step = 0
    this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05)
  }

  get tempo() {
    return this.mood === 'tension' ? 92 : this.mood === 'party' ? 118 : 102
  }

  tick() {
    if (!this.ctx || !this.mood || this.ctx.state !== 'running') return
    const s16 = 60 / this.tempo / 4
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.schedule(this.step, this.nextTime)
      this.step++
      this.nextTime += s16
    }
  }

  schedule(step, t) {
    if (this.mood === 'tension') this.tension(step, t)
    else this.groove(step, t, this.mood === 'party')
  }

  // --- voices ---------------------------------------------------------------

  tone(type, freq, t0, dur, vol, cutoff) {
    const o = this.ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(vol, t0 + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    let head = o
    if (cutoff) {
      const f = this.ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = cutoff
      o.connect(f)
      head = f
    }
    head.connect(g)
    g.connect(this.master)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }

  hat(t0, vol = 0.12) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = this.ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 6500
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t0)
    src.stop(t0 + 0.08)
  }

  kick(t0, hi = 120, lo = 45, vol = 0.5) {
    const o = this.ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(hi, t0)
    o.frequency.exponentialRampToValueAtTime(lo, t0 + 0.12)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
    o.connect(g)
    g.connect(this.master)
    o.start(t0)
    o.stop(t0 + 0.3)
  }

  brass(freq, t0, dur, vol = 0.14) {
    for (const detune of [-5, 5]) {
      const o = this.ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = freq
      o.detune.value = detune
      const f = this.ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(900, t0)
      f.frequency.linearRampToValueAtTime(2200, t0 + 0.06)
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(vol, t0 + 0.03)
      g.gain.setValueAtTime(vol, t0 + dur * 0.7)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      o.connect(f)
      f.connect(g)
      g.connect(this.master)
      o.start(t0)
      o.stop(t0 + dur + 0.05)
    }
  }

  // --- patterns ---------------------------------------------------------------

  // Chill four-chord loop: C - G - Am - F. Party mode brightens + doubles up.
  groove(step, t, party) {
    const bar = Math.floor(step / 16) % 4
    const chords = [
      [48, 55, 60, 64], // C
      [43, 55, 59, 62], // G
      [45, 57, 60, 64], // Am
      [41, 53, 57, 60], // F
    ]
    const chord = chords[bar]
    const s = step % 16

    // Drums
    if (s === 0 || s === 8) this.kick(t)
    if (party && (s === 4 || s === 12)) this.kick(t, 100, 55, 0.3)
    if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.14 : 0.07)

    // Bass
    if (s === 0) this.tone('triangle', F(chord[0] - 12), t, 0.5, 0.3)
    if (s === 8) this.tone('triangle', F(chord[0] - 12), t, 0.3, 0.25)
    if (s === 12) this.tone('triangle', F(chord[1] - 12), t, 0.25, 0.22)

    // Arp
    if (s % 2 === 0) {
      const seq = [1, 2, 3, 2]
      const note = chord[seq[(s / 2) % 4]] + (party ? 12 : 0)
      this.tone('triangle', F(note), t, 0.22, party ? 0.09 : 0.07, 3200)
    }
    // Party sparkle
    if (party && s % 4 === 1) {
      this.tone('square', F(chord[(s / 4) % 4] + 24), t, 0.1, 0.03, 5000)
    }
  }

  // Low Am drone + timpani pulse that creeps upward. Drama.
  tension(step, t) {
    const s = step % 16
    if (s === 0) {
      // drone swells once a bar
      this.tone('sawtooth', F(33), t, 1.8, 0.1, 320) // A1
      this.tone('sawtooth', F(40), t, 1.8, 0.08, 320) // E2
    }
    if (s === 0 || s === 8) {
      const rise = Math.min(20, Math.floor(this.step / 32)) // creeps up over time
      this.kick(t, 80 + rise, 42 + rise / 2, 0.45)
    }
    if (s === 15) this.hat(t, 0.05)
    if (s === 4 || s === 12) this.tone('sine', F(57), t, 0.3, 0.04) // heartbeat A3
  }

  // Brass fanfare + timpani roll, then the party groove takes over.
  playFanfare() {
    const t = this.ctx.currentTime + 0.05
    const hits = [
      [0.0, [67, 72, 76], 0.3],
      [0.35, [67, 72, 76], 0.3],
      [0.7, [65, 69, 74], 0.4],
      [1.2, [67, 72, 76, 79], 1.3],
    ]
    for (const [dt, notes, dur] of hits) {
      for (const n of notes) this.brass(F(n), t + dt, dur)
    }
    for (let i = 0; i < 14; i++) this.kick(t + i * 0.08, 90, 50, 0.28) // timpani roll
    // party groove starts right as the last chord rings out
    this.step = 0
    this.nextTime = t + 2.5
  }
}
