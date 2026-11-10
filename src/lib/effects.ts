// Little celebrations: confetti, a short sound and a vibration. All of them can be switched off in
// the settings, and "reduce motion" turns the picture off too. Nothing here needs a file or a library.
import type { Settings } from '../types'

type Prefs = Pick<Settings, 'sound' | 'vibration' | 'animations'>
let prefs: Prefs = { sound: false, vibration: true, animations: true }
export const setEffectPrefs = (p: Prefs) => {
  prefs = p
}

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export type Cue = 'tick' | 'level' | 'streak' | 'surprise' | 'close'

const BEEPS: Record<Cue, number[]> = {
  tick: [660],
  surprise: [523, 784],
  level: [523, 659, 784, 1047],
  streak: [440, 554, 659],
  close: [392, 330],
}
const BUZZ: Record<Cue, number | number[]> = {
  tick: 15,
  surprise: [20, 40, 20],
  level: [30, 50, 30, 50, 60],
  streak: [30, 40, 30],
  close: 40,
}

let audio: AudioContext | undefined
function beep(freqs: number[]) {
  try {
    const Ctx = globalThis.AudioContext
    if (!Ctx) return
    audio ??= new Ctx()
    const ctx = audio
    const t0 = ctx.currentTime
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + i * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.1 + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + i * 0.1)
      osc.stop(t0 + i * 0.1 + 0.2)
    })
  } catch {
    /* no sound is fine */
  }
}

/** Sound and vibration for a moment (each only if switched on and supported). */
export function cue(kind: Cue) {
  if (prefs.sound) beep(BEEPS[kind])
  if (prefs.vibration) {
    try {
      navigator.vibrate?.(BUZZ[kind])
    } catch {
      /* iPhone has no vibration in a web app */
    }
  }
}

const COLORS = ['#2563eb', '#f97316', '#16a34a', '#eab308', '#8b5cf6', '#dc2626']

/** Confetti for a new level, a streak milestone or a closed day. A canvas that removes itself. */
export function confetti(pieces = 70) {
  if (!prefs.animations || reducedMotion() || typeof document === 'undefined') return
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return // no canvas in the test browser
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:70'
  const w = (canvas.width = window.innerWidth)
  const h = (canvas.height = window.innerHeight)
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return
  document.body.appendChild(canvas)
  const bits = Array.from({ length: pieces }, (_, i) => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.4,
    y: h * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 3,
    s: 5 + Math.random() * 5,
    c: COLORS[i % COLORS.length],
  }))
  const start = performance.now()
  const frame = (now: number) => {
    ctx.clearRect(0, 0, w, h)
    for (const b of bits) {
      b.x += b.vx
      b.y += b.vy
      b.vy += 0.35
      ctx.fillStyle = b.c
      ctx.fillRect(b.x, b.y, b.s, b.s * 0.6)
    }
    if (now - start < 1600) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}

/** Sound, vibration and confetti together, for the bigger moments. */
export function celebrate(kind: Cue) {
  cue(kind)
  confetti(kind === 'close' ? 30 : 70)
}
