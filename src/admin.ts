import { state, set, ref, db, get, clicksRef, configRef, configThemeRef, configBgmRef } from './firebase';
import { ADMIN_HASH } from './config';
import { customConfirm } from './modal';
import { toggleMusic } from './audio';

let adminOverlay: HTMLElement;
let adminPinOverlay: HTMLElement;
let analyticsInterval: ReturnType<typeof setInterval> | null = null;

export function initAdmin(): void {
  adminOverlay = document.getElementById('admin-overlay')!;
  adminPinOverlay = document.getElementById('admin-pin-overlay')!;

  let adminClickCount = 0;
  let adminClickTimer: ReturnType<typeof setTimeout> | null = null;
  document.getElementById('admin-trigger')!.addEventListener('click', () => {
    adminClickCount++;
    if (adminClickCount === 1) {
      adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 500);
    } else if (adminClickCount >= 2) {
      if (adminClickTimer) clearTimeout(adminClickTimer);
      adminClickCount = 0;
      openAdminAccess();
    }
  });

  document.getElementById('btn-admin-pin-confirm')!.addEventListener('click', handlePinLogin);
  document.getElementById('btn-admin-pin-cancel')!.addEventListener('click', closePinLogin);
  const pinInput = document.getElementById('admin-pin-input') as HTMLInputElement;
  if (pinInput) {
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-admin-pin-confirm')!.click();
    });
  }

  document.getElementById('btn-admin-close')!.addEventListener('click', closeAdmin);
  document.getElementById('btn-admin-logout')!.addEventListener('click', handleAdminLogout);

  document.getElementById('btn-admin-set-target')!.addEventListener('click', handleSetTarget);
  document.getElementById('btn-admin-set-clicks')!.addEventListener('click', handleSetClicks);
  document.getElementById('btn-admin-set-theme')!.addEventListener('click', handleSetTheme);
  document.getElementById('btn-admin-set-bgm')!.addEventListener('click', handleSetBgm);
  document.getElementById('btn-admin-reset')!.addEventListener('click', handleReset);
  document.getElementById('btn-admin-force-win')!.addEventListener('click', handleForceWin);
  document.getElementById('btn-admin-music-toggle')!.addEventListener('click', handleMusicToggle);

  adminOverlay.addEventListener('click', (e) => {
    if (e.target === adminOverlay) closeAdmin();
  });
}

function openAdminAccess(): void {
  if (state.isAdmin) {
    openAdminPanel();
  } else {
    openPinLogin();
  }
}

function openPinLogin(): void {
  adminPinOverlay.classList.add('show');
  (document.getElementById('admin-pin-input') as HTMLInputElement).value = '';
  document.getElementById('admin-pin-error')!.textContent = '';
  setTimeout(() => (document.getElementById('admin-pin-input') as HTMLInputElement).focus(), 100);
}

function closePinLogin(): void {
  adminPinOverlay.classList.remove('show');
}

function handlePinLogin(): void {
  const pin = (document.getElementById('admin-pin-input') as HTMLInputElement).value;
  const errorEl = document.getElementById('admin-pin-error')!;
  if (!pin) {
    errorEl.textContent = '⚠ Masukkan PIN administrator.';
    return;
  }
  if (pin === ADMIN_HASH) {
    state.isAdmin = true;
    closePinLogin();
    openAdminPanel();
  } else {
    errorEl.textContent = '⚠ PIN salah.';
  }
}

function handleAdminLogout(): void {
  state.isAdmin = false;
  closeAdmin();
  closePinLogin();
}

function openAdminPanel(): void {
  (document.getElementById('admin-target-input') as HTMLInputElement).value = String(state.target);
  (document.getElementById('admin-clicks-input') as HTMLInputElement).value = String(state.currentCount);
  clearAdminMessages();
  adminOverlay.classList.add('show');
  startAnalyticsUpdates();
}

function startAnalyticsUpdates(): void {
  if (analyticsInterval) clearInterval(analyticsInterval);
  updateAnalytics();
  analyticsInterval = setInterval(updateAnalytics, 3000);
}

function updateAnalytics(): void {
  const tpm = state.lastClicksCount > 0 ? state.hypeSpeed : 0;
  const tpmEl = document.getElementById('analytics-tpm');
  if (tpmEl) tpmEl.textContent = String(tpm * 60);

  const ttgEl = document.getElementById('analytics-ttg');
  if (ttgEl && tpm > 0) {
    const remaining = Math.max(0, state.target - state.currentCount);
    const seconds = Math.round(remaining / tpm);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    ttgEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  } else if (ttgEl) {
    ttgEl.textContent = '--:--';
  }
}

function closeAdmin(): void {
  adminOverlay.classList.remove('show');
  if (analyticsInterval) {
    clearInterval(analyticsInterval);
    analyticsInterval = null;
  }
}

function showAdminMsg(elId: string, message: string, type: 'success' | 'error'): void {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.className = `admin-status-msg ${type}`;
  setTimeout(() => {
    el.className = 'admin-status-msg';
    el.textContent = '';
  }, 4000);
}

function clearAdminMessages(): void {
  ['msg-target', 'msg-clicks', 'msg-theme', 'msg-bgm', 'msg-action'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.className = 'admin-status-msg';
      el.textContent = '';
    }
  });
}

function handleSetTarget(): void {
  const input = document.getElementById('admin-target-input') as HTMLInputElement;
  const newTarget = parseInt(input.value);
  if (isNaN(newTarget) || newTarget < 1) {
    showAdminMsg('msg-target', '⚠ Masukkan angka target yang valid (min. 1).', 'error');
    return;
  }
  set(configRef, newTarget)
    .then(() => showAdminMsg('msg-target', `✓ Target diperbarui ke ${newTarget.toLocaleString()} klik.`, 'success'))
    .catch(() => showAdminMsg('msg-target', '✗ Gagal memperbarui target. Cek koneksi.', 'error'));
}

function handleSetClicks(): void {
  const input = document.getElementById('admin-clicks-input') as HTMLInputElement;
  const newClicks = parseInt(input.value);
  if (isNaN(newClicks) || newClicks < 0) {
    showAdminMsg('msg-clicks', '⚠ Masukkan angka klik yang valid (min. 0).', 'error');
    return;
  }
  set(clicksRef, newClicks)
    .then(() => showAdminMsg('msg-clicks', `✓ Total klik diperbarui ke ${newClicks.toLocaleString()}.`, 'success'))
    .catch(() => showAdminMsg('msg-clicks', '✗ Gagal memperbarui total klik.', 'error'));
}

function handleSetTheme(): void {
  const select = document.getElementById('admin-theme-select') as HTMLSelectElement;
  const selectedTheme = select.value;
  set(configThemeRef, selectedTheme)
    .then(() => showAdminMsg('msg-theme', `✓ Tema global diubah ke ${selectedTheme}.`, 'success'))
    .catch(() => showAdminMsg('msg-theme', '✗ Gagal memperbarui tema global.', 'error'));
}

function handleSetBgm(): void {
  const input = document.getElementById('admin-bgm-input') as HTMLInputElement;
  const bgmUrl = input.value.trim();
  if (!bgmUrl) {
    showAdminMsg('msg-bgm', '⚠ URL musik tidak boleh kosong.', 'error');
    return;
  }
  set(configBgmRef, bgmUrl)
    .then(() => showAdminMsg('msg-bgm', '✓ URL BGM global diperbarui.', 'success'))
    .catch(() => showAdminMsg('msg-bgm', '✗ Gagal memperbarui URL BGM global.', 'error'));
}

async function handleReset(): Promise<void> {
  const ok = await customConfirm('⚠ Anda yakin ingin me-reset TOTAL progres aktivasi ke 0?<br>Tindakan ini tidak dapat dibatalkan!');
  if (!ok) return;
  state.isFinished = false;
  state.displayedMilestones.clear();
  document.getElementById('victory-modal')!.classList.remove('show');
  document.getElementById('strobe-layer')!.classList.remove('strobe-bg');
  document.body.classList.remove('bg-festive');

  set(clicksRef, 0)
    .then(() => showAdminMsg('msg-action', '✓ Progres berhasil direset ke 0.', 'success'))
    .catch(() => showAdminMsg('msg-action', '✗ Gagal melakukan reset progres. Cek koneksi.', 'error'));
}

function handleMusicToggle(): void {
  toggleMusic();
}

async function handleForceWin(): Promise<void> {
  const ok = await customConfirm('🏆 Aktifkan mode kemenangan sekarang?<br>Counter akan di-set ke nilai TARGET.');
  if (!ok) return;
  set(clicksRef, state.target)
    .then(() => {
      showAdminMsg('msg-action', '✓ Mode kemenangan diaktifkan!', 'success');
      adminOverlay.classList.remove('show');
    })
    .catch(() => showAdminMsg('msg-action', '✗ Gagal. Cek koneksi.', 'error'));
}
