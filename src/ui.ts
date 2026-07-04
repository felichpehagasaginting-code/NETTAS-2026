import {
  state, clicksRef, configRef, configThemeRef, configBgmRef,
  db, ref, set, update, onValue, runTransaction, topUsersQuery,
  connectedRef, presenceRef, onDisconnect, tapDistributed,
} from './firebase';
import { playTapSound, playMilestoneSound, playSuccessSound, playPartyHorn, bgMusic } from './audio';
import {
  fireworksShow, triggerMilestoneConfetti, createTapEffect, createShockwave,
  triggerImpact, spawnFallingEmojiOnClick, updateCanvasColor,
} from './effects';
import type { LeaderboardEntry } from './types';
import { BADGE_DEFS } from './types';

let targetCount = 2026;

export function initUI(): void {
  onValue(connectedRef, (snap) => {
    if (snap.val() === true && state.myNodeName && state.myNodeId) {
      const myPresenceRef = ref(db, 'presence/' + state.myNodeId);
      set(myPresenceRef, state.myNodeName);
      onDisconnect(myPresenceRef).remove();
    }
  });

  onValue(presenceRef, (snap) => {
    const el = document.getElementById('presence-count');
    if (el) el.innerText = String(snap.size || 1);
  });

  onValue(clicksRef, (snap) => {
    state.currentCount = snap.val() || 0;
    updateUI(state.currentCount);
  });

  onValue(configRef, (snap) => {
    const newTarget = snap.val();
    if (newTarget && typeof newTarget === 'number' && newTarget > 0) {
      targetCount = newTarget;
      state.target = newTarget;
      const adminTargetInput = document.getElementById('admin-target-input') as HTMLInputElement;
      if (adminTargetInput && !adminTargetInput.value) {
        adminTargetInput.placeholder = `Saat ini: ${newTarget}`;
      }
      updateUI(state.currentCount);
    }
  });

  onValue(configThemeRef, (snap) => {
    const globalTheme = snap.val();
    if (globalTheme) {
      document.documentElement.setAttribute('data-theme', globalTheme);
      updateCanvasColor();
      const themeDropdown = document.getElementById('theme-dropdown') as HTMLSelectElement;
      if (themeDropdown) themeDropdown.value = globalTheme;
      const adminThemeSelect = document.getElementById('admin-theme-select') as HTMLSelectElement;
      if (adminThemeSelect) adminThemeSelect.value = globalTheme;
    }
  });

  onValue(configBgmRef, (snap) => {
    const newBgmUrl = snap.val();
    if (newBgmUrl && newBgmUrl !== bgMusic.src) {
      const isPlaying = !bgMusic.paused;
      bgMusic.src = newBgmUrl;
      if (isPlaying) {
        bgMusic.play().catch((e: Error) => console.warn('Music play failed:', e));
      }
    }
  });

  document.getElementById('tap-action')!.addEventListener('pointerdown', handleTap);

  document.getElementById('theme-dropdown')!.addEventListener('change', (e) => {
    const theme = (e.target as HTMLSelectElement).value;
    changeTheme(theme);
  });

  subscribeLeaderboard();
  startHypeMeter();
}

function checkBadges(clicks: number): string[] {
  const newBadges: string[] = [];
  if (clicks >= 1) newBadges.push('first_tap');
  if (clicks >= 10) newBadges.push('tap_10');
  if (clicks >= 50) newBadges.push('tap_50');
  if (clicks >= 100) newBadges.push('tap_100');
  if (clicks >= 500) newBadges.push('tap_500');
  return newBadges;
}

function showBadgeUnlock(badgeKey: string): void {
  const def = BADGE_DEFS[badgeKey];
  if (!def) return;
  const overlay = document.getElementById('milestone-overlay')!;
  const titleEl = document.getElementById('milestone-title')!;
  const iconEl = document.getElementById('milestone-icon')!;
  iconEl.textContent = def.icon;
  titleEl.innerHTML = `${def.label}<br><span style="font-size:0.7rem;font-weight:400;opacity:0.6">${def.desc}</span>`;
  overlay.classList.add('show');
  setTimeout(() => overlay.classList.remove('show'), 2500);
}

function handleTap(e: PointerEvent): void {
  if (state.isFinished) return;
  playTapSound(e.clientX, e.clientY);
  if (navigator.vibrate) navigator.vibrate(50);

  state.myLocalClicks++;
  const earnedBadges = checkBadges(state.myLocalClicks);
  const newBadges = earnedBadges.filter((b) => !state.myBadges.includes(b));
  if (newBadges.length > 0) {
    state.myBadges = [...state.myBadges, ...newBadges];
    newBadges.forEach(showBadgeUnlock);
  }
  renderLeaderboard();

  if (state.myNodeName) {
    tapDistributed({ nodeName: state.myNodeName, nodeId: state.myNodeId })
      .catch(() => {
        runTransaction(clicksRef, (curr: number) => (curr || 0) + 1);
        queueTapsSync();
      });
  } else {
    runTransaction(clicksRef, (curr: number) => (curr || 0) + 1);
    queueTapsSync();
  }

  createTapEffect(e.clientX, e.clientY, state.myNodeName);
  createShockwave(e.clientX, e.clientY);
  triggerImpact();
  spawnFallingEmojiOnClick();
}

function updateUI(count: number): void {
  state.currentProgressPercentage = Math.min((count / targetCount) * 100, 100);

  const tapVal = document.getElementById('tap-val');
  if (tapVal) {
    tapVal.innerText = count.toLocaleString() + ' / ' + targetCount.toLocaleString();
  }
  const percentVal = document.getElementById('percent-val');
  if (percentVal) {
    percentVal.innerText = Math.floor(state.currentProgressPercentage) + '%';
  }
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = state.currentProgressPercentage + '%';
  }
  const liquidFill = document.getElementById('liquid-fill-img');
  if (liquidFill) {
    liquidFill.style.clipPath = `inset(${100 - state.currentProgressPercentage}% 0 0 0)`;
  }

  const floorProgress = Math.floor(state.currentProgressPercentage);
  if (floorProgress >= 25 && floorProgress < 50 && !state.displayedMilestones.has(25)) {
    state.displayedMilestones.add(25);
    showMilestone(25, 'GRID CONNECTED<br>25% CHARGED', '🔌');
  } else if (floorProgress >= 50 && floorProgress < 75 && !state.displayedMilestones.has(50)) {
    state.displayedMilestones.add(50);
    showMilestone(50, 'CORE SYNCHRONIZED<br>50% CHARGED', '🔄');
  } else if (floorProgress >= 75 && floorProgress < 100 && !state.displayedMilestones.has(75)) {
    state.displayedMilestones.add(75);
    showMilestone(75, 'OVERLOAD DETECTED<br>75% CAPACITY', '⚡');
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

  playMilestoneSound();
  triggerMilestoneConfetti();

  setTimeout(() => {
    overlay.classList.remove('show');
  }, 3000);
}

function win(): void {
  if (state.isFinished) return;
  state.isFinished = true;

  document.body.classList.add('bg-festive');
  document.getElementById('victory-modal')!.classList.add('show');
  document.getElementById('strobe-layer')!.classList.add('strobe-bg');

  setTimeout(() => {
    const megaTitle = document.getElementById('mega-title');
    if (megaTitle) megaTitle.classList.add('pulse-text');
  }, 1000);

  playPartyHorn();
  setTimeout(playPartyHorn, 300);
  setTimeout(playPartyHorn, 600);
  playSuccessSound();
  fireworksShow();
}

function subscribeLeaderboard(): void {
  onValue(topUsersQuery, (snap) => {
    state.currentLeaderboardData = [];
    snap.forEach((child: any) => {
      state.currentLeaderboardData.push({ id: child.key, ...child.val() });
    });
    state.currentLeaderboardData.reverse();
    renderLeaderboard();
  });
}

function renderLeaderboard(): void {
  const listEl = document.getElementById('leaderboard-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  let displayUsers = [...state.currentLeaderboardData];

  let meFound = false;
  displayUsers = displayUsers.map((u: any) => {
    if (u.id === state.myNodeId) {
      meFound = true;
      return { ...u, clicks: Math.max(u.clicks || 0, state.myLocalClicks) };
    }
    return u;
  });

  if (!meFound && state.myLocalClicks > 0 && state.myNodeName) {
    displayUsers.push({ id: state.myNodeId, name: state.myNodeName, clicks: state.myLocalClicks });
    displayUsers.sort((a: any, b: any) => b.clicks - a.clicks);
    if (displayUsers.length > 5) {
      displayUsers = displayUsers.slice(0, 5);
    }
  }

  if (displayUsers.length === 0) {
    listEl.innerHTML =
      '<li class="leaderboard-item"><span class="leaderboard-name">Mulai Tapping!</span></li>';
    return;
  }

  displayUsers.forEach((u: any) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item' + (u.id === state.myNodeId ? ' is-me' : '');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'leaderboard-name';
    nameSpan.textContent = u.name;
    if (u.badges && u.badges.length > 0) {
      const badgeIcon = document.createElement('span');
      badgeIcon.style.marginLeft = '0.3rem';
      badgeIcon.style.fontSize = '0.7rem';
      const lastBadge = u.badges[u.badges.length - 1];
      badgeIcon.textContent = BADGE_DEFS[lastBadge]?.icon || '';
      nameSpan.appendChild(badgeIcon);
    }
    const valSpan = document.createElement('span');
    valSpan.className = 'leaderboard-val';
    valSpan.textContent = (u.clicks || 0).toLocaleString();
    li.appendChild(nameSpan);
    li.appendChild(valSpan);
    listEl.appendChild(li);
  });
}

function startHypeMeter(): void {
  setInterval(() => {
    const now = Date.now();
    const timeDiffSec = (now - state.lastVelocityTime) / 1000;
    if (timeDiffSec <= 0) return;

    const clickDiff = state.currentCount - state.lastClicksCount;
    const rawTapsPerSec = clickDiff >= 0 ? Math.round(clickDiff / timeDiffSec) : 0;

    state.hypeSpeed = rawTapsPerSec;

    const hypeVal = document.getElementById('hype-speed-val');
    if (hypeVal) hypeVal.innerText = String(rawTapsPerSec);

    if (rawTapsPerSec >= 20) {
      document.body.classList.add('hype-active');
    } else {
      document.body.classList.remove('hype-active');
    }

    state.lastClicksCount = state.currentCount;
    state.lastVelocityTime = now;
  }, 1000);
}

function queueTapsSync(): void {
  const now = Date.now();
  if (state.syncTimeout) clearTimeout(state.syncTimeout);

  if (now - state.lastSyncTime > 2000) {
    syncTapsToFirebase();
  } else {
    state.syncTimeout = setTimeout(syncTapsToFirebase, 800);
  }
}

function syncTapsToFirebase(): void {
  if (!state.myNodeId) return;
  if (state.myLocalClicks === state.lastSyncClicks) return;
  const refPath = ref(db, `users/${state.myNodeId}`);
  update(refPath, {
    name: state.myNodeName,
    clicks: state.myLocalClicks,
    badges: state.myBadges,
  })
    .then(() => {
      state.lastSyncClicks = state.myLocalClicks;
      state.lastSyncTime = Date.now();
    })
    .catch((e) => console.error('Error syncing personal taps:', e));
}

export function changeTheme(theme: string): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('nettas-theme', theme);
  updateCanvasColor();
}

export function resetSystem(): void {
  document.getElementById('admin-pin-overlay')!.classList.add('show');
}
