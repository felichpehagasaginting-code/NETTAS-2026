import confetti from 'canvas-confetti';
import type { Particle } from './types';
import { TAP_PARTICLE_TEXTS, TAP_EMOJIS, FLOATING_EMOJIS } from './config';

export function createTapEffect(x: number, y: number, nodeName: string): void {
  const el = document.createElement('div');
  el.className = 'tap-particle';
  const texts = TAP_PARTICLE_TEXTS.map((t) => (t === '+1' ? `+1 ${nodeName}` : t));
  el.innerText = texts[Math.floor(Math.random() * texts.length)];
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

export function createShockwave(x: number, y: number): void {
  const el = document.createElement('div');
  el.className = 'shockwave';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 500);
}

export function triggerImpact(): void {
  const flash = document.getElementById('flash-overlay')!;
  flash.style.animation = 'none';
  void flash.offsetHeight;
  flash.style.animation = 'flash-anim 0.2s ease-out forwards';

  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 100);
}

export function spawnFallingEmojiOnClick(): void {
  const el = document.createElement('div');
  el.className = 'falling-emoji';
  el.innerText = TAP_EMOJIS[Math.floor(Math.random() * TAP_EMOJIS.length)];
  el.style.left = Math.random() * 90 + 'vw';
  el.style.animationDuration = 1.5 + Math.random() * 1.5 + 's';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function spawnFloatingEmoji(): void {
  const el = document.createElement('div');
  el.className = 'floating-emoji';
  el.innerText = FLOATING_EMOJIS[Math.floor(Math.random() * FLOATING_EMOJIS.length)];
  el.style.left = Math.random() * 90 + 'vw';
  el.style.animationDuration = 3 + Math.random() * 2 + 's';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

export function fireworksShow(): void {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 55, spread: 360, ticks: 120, zIndex: 21000 };

  function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 250,
        spread: 200,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FF1493', '#00FFFF', '#FF4500', '#00FF00', '#9400D3'],
        zIndex: 21000,
      });
    }, i * 300);
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = 80 * (timeLeft / duration);

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

    for (let i = 0; i < 3; i++) spawnFloatingEmoji();

    if (Math.random() > 0.5) {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.8 },
        zIndex: 21000,
        colors: ['#FFD700', '#FF1493'],
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.8 },
        zIndex: 21000,
        colors: ['#00FFFF', '#00FF00'],
      });
    }
  }, 150);
}

let pts: Particle[] = [];
let currentCanvasColor = 'rgba(191, 0, 255, 0.3)';

const canvas = document.getElementById('canvas-bg') as HTMLCanvasElement;
const ctx = canvas?.getContext('2d');

export function initParticles(): void {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pts = [];
  for (let i = 0; i < 80; i++) {
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
  requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', () => {
  initParticles();
});

export function triggerMilestoneConfetti(): void {
  confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, zIndex: 11000 });
}
