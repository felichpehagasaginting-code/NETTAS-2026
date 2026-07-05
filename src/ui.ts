import {
  state, clicksRef, configRef, configThemeRef, configBgmRef, configVictoryBgmRef, configYoutubeIdRef,
  db, ref, onValue, runTransaction, waitForAuth,
} from './firebase';
import { initYouTube, destroyYouTube, playYouTube, setYouTubeVolume } from './youtube';
import { initPresence, markTap, subscribePresenceCount, subscribeActiveCount } from './presence';
import { isMusicEnabled, playTapSound, playMilestoneSound, bgMusic, victoryMusic, playVictoryAnthem, resetAudioState } from './audio';
import {
  fireworksShow, triggerMilestoneConfetti, createTapEffect, createShockwave,
  triggerImpact, spawnFallingEmojiOnClick, updateCanvasColor,
} from './effects';

let targetCount = 2026;

let els: {
  tapVal: HTMLElement | null;
  percentVal: HTMLElement | null;
  progressBar: HTMLElement | null;
  liquidFill: HTMLElement | null;
  hypeVal: HTMLElement | null;
  adminTargetInput: HTMLInputElement | null;
  victoryModal: HTMLElement | null;
  strobeLayer: HTMLElement | null;
  megaTitle: HTMLElement | null;
} | null = null;

let hypeIntervalId: ReturnType<typeof setInterval> | null = null;

function cacheElements(): void {
  els = {
    tapVal: document.getElementById('tap-val'),
    percentVal: document.getElementById('percent-val'),
    progressBar: document.getElementById('progress-bar'),
    liquidFill: document.getElementById('liquid-fill-img'),
    hypeVal: document.getElementById('hype-speed-val'),
    adminTargetInput: document.getElementById('admin-target-input') as HTMLInputElement,
    victoryModal: document.getElementById('victory-modal'),
    strobeLayer: document.getElementById('strobe-layer'),
    megaTitle: document.getElementById('mega-title'),
  };
}

export function initUI(): void {
  cacheElements();

  waitForAuth().then(() => {
    onValue(clicksRef, (snap) => {
      state.currentCount = snap.val() || 0;
      updateUI(state.currentCount);
    });

    onValue(configRef, (snap) => {
      const newTarget = snap.val();
      if (newTarget && typeof newTarget === 'number' && newTarget > 0) {
        targetCount = newTarget;
        state.target = newTarget;
        if (els?.adminTargetInput && !els.adminTargetInput.value) {
          els.adminTargetInput.placeholder = `Saat ini: ${newTarget}`;
        }
        updateUI(state.currentCount);
      }
    });

    onValue(configThemeRef, (snap) => {
      const globalTheme = snap.val();
      if (globalTheme) {
        document.documentElement.setAttribute('data-theme', globalTheme);
        updateCanvasColor();
      }
    });

    onValue(configBgmRef, (snap) => {
      const newBgmUrl = snap.val();
      if (newBgmUrl && newBgmUrl !== bgMusic.src) {
        bgMusic.src = newBgmUrl;
        if (isMusicEnabled()) {
          bgMusic.play().catch((e: Error) => console.warn('Music play failed:', e));
        }
      }
    });

    onValue(configVictoryBgmRef, (snap) => {
      const newVictoryBgmUrl = snap.val();
      if (newVictoryBgmUrl && newVictoryBgmUrl !== victoryMusic.src) {
        victoryMusic.src = newVictoryBgmUrl;
        if (isMusicEnabled()) {
          victoryMusic.play().catch((e: Error) => console.warn('Victory music play failed:', e));
        }
      }
    });

    onValue(configYoutubeIdRef, (snap) => {
      const videoId = snap.val();
      if (videoId && typeof videoId === 'string' && videoId.length === 11) {
        const wasPlaying = isMusicEnabled();
        initYouTube(videoId).then(() => {
          if (wasPlaying) {
            setYouTubeVolume(0.4);
            playYouTube();
          }
        });
      } else if (!videoId) {
        destroyYouTube();
      }
    });

    initPresence();

    subscribePresenceCount((n) => {
      const header = document.getElementById('presence-count');
      if (header) header.textContent = String(n);
      const adminNodes = document.getElementById('analytics-nodes');
      if (adminNodes) adminNodes.textContent = String(n);
      const adminAvg = document.getElementById('analytics-avg');
      if (adminAvg) adminAvg.textContent = n > 0 ? Math.round(state.currentCount / n).toLocaleString() : '0';
    });

    subscribeActiveCount((n) => {
      const el = document.getElementById('active-clickers');
      if (el) el.textContent = String(n);
    });
  });

  document.getElementById('tap-action')!.addEventListener('pointerdown', handleTap, { passive: true });

  // Spacebar support for triggering tap
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();

      const btn = document.getElementById('tap-action');
      if (btn && !btn.classList.contains('keyboard-active')) {
        btn.classList.add('keyboard-active');

        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        triggerTap(centerX, centerY);
      }
    }
  });

  document.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      const btn = document.getElementById('tap-action');
      if (btn) {
        btn.classList.remove('keyboard-active');
      }
    }
  });

  startHypeMeter();
}

function triggerTap(x: number, y: number): void {
  if (state.isFinished) return;
  playTapSound(x, y);
  if (navigator.vibrate) navigator.vibrate(50);

  runTransaction(clicksRef, (curr: number) => (curr || 0) + 1).catch((err) => {
    console.error('Gagal update clicks:', err);
  });

  markTap();
  createTapEffect(x, y, '');
  createShockwave(x, y);
  triggerImpact();
  spawnFallingEmojiOnClick();
}

function handleTap(e: PointerEvent): void {
  triggerTap(e.clientX, e.clientY);
}

function updateUI(count: number): void {
  state.currentCount = count;
  state.currentProgressPercentage = Math.min((count / targetCount) * 100, 100);

  if (els?.tapVal) {
    els.tapVal.innerText = count.toLocaleString() + ' / ' + targetCount.toLocaleString();
  }
  if (els?.percentVal) {
    els.percentVal.innerText = Math.floor(state.currentProgressPercentage) + '%';
  }
  if (els?.progressBar) {
    els.progressBar.style.width = state.currentProgressPercentage + '%';
  }
  if (els?.liquidFill) {
    els.liquidFill.style.clipPath = `inset(${100 - state.currentProgressPercentage}% 0 0 0)`;
  }



  if (state.currentProgressPercentage >= 100 && !state.isFinished) {
    if (!state.displayedMilestones.has(100)) {
      state.displayedMilestones.add(100);
      showMilestone(100, 'SYSTEM ONLINE<br>100% AWAKENED', '🏆');
    }
    win();
  }
}

function showMilestone(_percentage: number, title: string, icon: string): void {
  const overlay = document.getElementById('milestone-overlay')!;
  const titleEl = document.getElementById('milestone-title')!;
  const iconEl = document.getElementById('milestone-icon')!;

  iconEl.textContent = icon;
  titleEl.innerHTML = title;
  overlay.classList.add('show');

  triggerMilestoneConfetti();
  playMilestoneSound();

  setTimeout(() => {
    overlay.classList.remove('show');
  }, 3000);
}

function win(): void {
  if (state.isFinished) return;
  state.isFinished = true;
  (window as any).__victoryActive = true;

  if (hypeIntervalId) {
    clearInterval(hypeIntervalId);
    hypeIntervalId = null;
  }

  document.body.classList.add('bg-festive');
  if (els?.victoryModal) els.victoryModal.classList.add('show');
  if (els?.strobeLayer) els.strobeLayer.classList.add('strobe-bg');

  setTimeout(() => {
    if (els?.megaTitle) els.megaTitle.classList.add('pulse-text');
  }, 1000);

  fireworksShow();
  playVictoryAnthem();
}

function startHypeMeter(): void {
  if (hypeIntervalId) clearInterval(hypeIntervalId);
  hypeIntervalId = setInterval(() => {
    const now = Date.now();
    const timeDiffSec = (now - state.lastVelocityTime) / 1000;
    if (timeDiffSec <= 0) return;

    const clickDiff = state.currentCount - state.lastClicksCount;
    const rawTapsPerSec = clickDiff >= 0 ? Math.round(clickDiff / timeDiffSec) : 0;

    state.hypeSpeed = rawTapsPerSec;

    if (els?.hypeVal) els.hypeVal.innerText = String(rawTapsPerSec);

    const active = rawTapsPerSec >= 20;
    state.isHypeActive = active;
    if (active) {
      document.body.classList.add('hype-active');
    } else {
      document.body.classList.remove('hype-active');
    }

    state.lastClicksCount = state.currentCount;
    state.lastVelocityTime = now;
  }, 1000);
}

export function resetSystem(): void {
  (window as any).__victoryActive = false;
  if (hypeIntervalId) {
    clearInterval(hypeIntervalId);
    hypeIntervalId = null;
  }
  resetAudioState();
  document.getElementById('admin-pin-overlay')!.classList.add('show');
}
