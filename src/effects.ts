import confetti from 'canvas-confetti';
import type { Particle } from './types';
import { TAP_PARTICLE_TEXTS, TAP_EMOJIS, FLOATING_EMOJIS } from './config';

// ─── Pooling / throttling constants ──────────────────────────────────────────
// Limits the maximum number of simultaneously active DOM effect nodes.
// This prevents DOM node accumulation during hype mode (rapid tapping).
const MAX_TAP_PARTICLES = 35;
const MAX_FALLING_EMOJIS = 12;
const MAX_FLOATING_EMOJIS = 10;
const MAX_SHOCKWAVES = 8;

// ─── Isolated effects container ──────────────────────────────────────────────
// All DOM effects are appended to this isolated element instead of <body>.
// The container has CSS `contain: layout style paint;` to prevent global reflows.
let effectsContainer: HTMLElement | null = null;

function getEffectsContainer(): HTMLElement {
  if (!effectsContainer) {
    effectsContainer = document.getElementById('effects-overlay-container');
    if (!effectsContainer) {
      // Fallback: create if not found in HTML
      effectsContainer = document.createElement('div');
      effectsContainer.id = 'effects-overlay-container';
      document.body.appendChild(effectsContainer);
    }
  }
  return effectsContainer;
}

// ─── Generic pooled spawner ───────────────────────────────────────────────────
// Removes the oldest child if the container has too many active children,
// preventing unbounded DOM growth during hype mode.
function spawnEffect(el: HTMLElement, className: string, maxCount: number): void {
  const container = getEffectsContainer();
  el.className = className;

  // Evict oldest element if over the pool limit
  const existing = container.querySelectorAll(`.${className}`);
  if (existing.length >= maxCount) {
    existing[0].remove();
  }

  container.appendChild(el);
}

// ─── Tap particle ─────────────────────────────────────────────────────────────

export function createTapEffect(x: number, y: number, nodeName: string): void {
  const el = document.createElement('div');
  const texts = TAP_PARTICLE_TEXTS.map((t) => (t === '+1' ? `+1 ${nodeName}` : t));
  el.innerText = texts[Math.floor(Math.random() * texts.length)];
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  spawnEffect(el, 'tap-particle', MAX_TAP_PARTICLES);
  setTimeout(() => el.remove(), 1000);
}

// ─── Shockwave ────────────────────────────────────────────────────────────────

export function createShockwave(x: number, y: number): void {
  const el = document.createElement('div');
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  spawnEffect(el, 'shockwave', MAX_SHOCKWAVES);
  setTimeout(() => el.remove(), 500);
}

// ─── Impact flash & shake ─────────────────────────────────────────────────────

export function triggerImpact(): void {
  const flash = document.getElementById('flash-overlay')!;
  flash.style.animation = 'none';
  void flash.offsetHeight;
  flash.style.animation = 'flash-anim 0.2s ease-out forwards';

  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 100);
}

// ─── Falling emoji (spawned on tap) ──────────────────────────────────────────

export function spawnFallingEmojiOnClick(): void {
  const el = document.createElement('div');
  el.innerText = TAP_EMOJIS[Math.floor(Math.random() * TAP_EMOJIS.length)];
  el.style.left = Math.random() * 90 + 'vw';
  el.style.animationDuration = 1.5 + Math.random() * 1.5 + 's';
  spawnEffect(el, 'falling-emoji', MAX_FALLING_EMOJIS);
  setTimeout(() => el.remove(), 3000);
}

// ─── Floating emoji (spawned during fireworks) ───────────────────────────────

export function spawnFloatingEmoji(): void {
  const el = document.createElement('div');
  el.innerText = FLOATING_EMOJIS[Math.floor(Math.random() * FLOATING_EMOJIS.length)];
  el.style.left = Math.random() * 90 + 'vw';
  el.style.animationDuration = 3 + Math.random() * 2 + 's';
  spawnEffect(el, 'floating-emoji', MAX_FLOATING_EMOJIS);
  setTimeout(() => el.remove(), 5000);
}

// ─── Fireworks (celebration) ──────────────────────────────────────────────────

export function fireworksShow(): void {
  const duration = 8 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 40, spread: 120, ticks: 40, zIndex: 21000 };

  function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FF1493', '#00FFFF', '#FF4500', '#00FF00', '#9400D3'],
        zIndex: 21000,
      });
    }, i * 400);
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = Math.floor(30 * (timeLeft / duration));

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 },
      colors: ['#fff', '#f00', '#ff0', '#0f0', '#00f'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 },
      colors: ['#0ff', '#f0f', '#fff', '#ffa500', '#ff1493'],
    });
  }, 500);
}

// ─── Background canvas particles ─────────────────────────────────────────────

let pts: Particle[] = [];
let currentCanvasColor = 'rgba(191, 0, 255, 0.3)';
let animFrameId: number | null = null;

const canvas = document.getElementById('canvas-bg') as HTMLCanvasElement;
const ctx = canvas?.getContext('2d');

// Adaptive particle count: fewer particles on mobile to preserve battery/CPU.
function getParticleCount(): number {
  return window.innerWidth < 768 ? 40 : 80;
}

export function initParticles(): void {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pts = [];
  const count = getParticleCount();
  for (let i = 0; i < count; i++) {
    pts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      s: Math.random() * 2,
    });
  }
  updateCanvasColor();
}

export function updateCanvasColor(): void {
  currentCanvasColor =
    getComputedStyle(document.documentElement).getPropertyValue('--canvas-color').trim() ||
    'rgba(191, 0, 255, 0.3)';
}

export function drawParticles(): void {
  // Pause when tab hidden or victory screen shown
  if (document.hidden || (window as any).__victoryActive) {
    animFrameId = requestAnimationFrame(drawParticles);
    return;
  }

  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = currentCanvasColor;

  const speedMultiplier = document.body.classList.contains('hype-active') ? 4 : 1;
  pts.forEach((p) => {
    p.x += p.vx * speedMultiplier;
    p.y += p.vy * speedMultiplier;
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
    ctx!.beginPath();
    ctx!.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    ctx!.fill();
  });
  animFrameId = requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', () => {
  initParticles();
});

// Visibility API: pause/resume rAF loop to save resources when tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && animFrameId === null) {
    drawParticles();
  }
});

export function triggerMilestoneConfetti(): void {
  confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, zIndex: 11000 });
}
