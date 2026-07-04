import { state, onValue, set, ref, db, get, clicksRef, configRef, configThemeRef, configBgmRef } from './firebase';
import { ADMIN_HASH } from './config';
import { customConfirm } from './modal';
import { bgMusic, victoryMusic } from './audio';

let adminOverlay: HTMLElement;
let adminPinOverlay: HTMLElement;
let analyticsInterval: ReturnType<typeof setInterval> | null = null;

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
  document.getElementById('btn-admin-reset-users')!.addEventListener('click', handleResetUsers);
  document.getElementById('btn-admin-force-win')!.addEventListener('click', handleForceWin);

  adminOverlay.addEventListener('click', (e) => {
    if (e.target === adminOverlay) closeAdmin();
  });

  document.getElementById('btn-admin-export-csv')!.addEventListener('click', handleExportCsv);

  onValue(ref(db, 'users'), (snap) => {
    renderUsersList(snap);
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
  (document.getElementById('admin-bgm-input') as HTMLInputElement).value =
    (document.getElementById('music-status')?.innerText === 'MUSIC: ON'
      ? 'https://cdn.pixabay.com/audio/2022/03/24/audio_7306283b27.mp3'
      : '');
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'nettas';
  (document.getElementById('admin-theme-select') as HTMLSelectElement).value = currentTheme;
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

  const nodesEl = document.getElementById('analytics-nodes');
  const presenceCount = document.getElementById('presence-count')?.textContent || '0';
  if (nodesEl) nodesEl.textContent = presenceCount;

  const avgEl = document.getElementById('analytics-avg');
  const nodeCount = parseInt(presenceCount) || 1;
  if (avgEl) avgEl.textContent = Math.round(state.currentCount / nodeCount).toLocaleString();

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

  // Stop victory anthem and restore instrumental BGM state
  victoryMusic.pause();
  victoryMusic.currentTime = 0;
  victoryMusic.volume = 0;
  bgMusic.currentTime = 0;
  bgMusic.volume = 0.4;
  
  const musicStatus = document.getElementById('music-status')?.innerText || '';
  if (musicStatus.includes('ON')) {
    bgMusic.play().catch((e) => console.warn('BGM autoplay on reset failed:', e));
  }

  set(clicksRef, 0)
    .then(() => showAdminMsg('msg-action', '✓ Progres berhasil direset ke 0.', 'success'))
    .catch(() => showAdminMsg('msg-action', '✗ Gagal melakukan reset progres. Cek koneksi.', 'error'));
}

async function handleResetUsers(): Promise<void> {
  const ok = await customConfirm('⚠ Anda yakin ingin menghapus SEMUA user node terdaftar?');
  if (!ok) return;
  set(ref(db, 'users'), null)
    .then(() => showAdminMsg('msg-action', '✓ Semua user node berhasil dihapus.', 'success'))
    .catch(() => showAdminMsg('msg-action', '✗ Gagal menghapus user node. Cek koneksi.', 'error'));
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

function handleExportCsv(): void {
  get(ref(db, 'users')).then((snap) => {
    const rows: string[] = ['id,name,clicks'];
    snap.forEach((child: any) => {
      const u = child.val();
      rows.push(`${child.key},${u.name || 'ANON'},${u.clicks || 0}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nettas-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAdminMsg('msg-action', '✓ CSV berhasil diexport.', 'success');
  }).catch(() => showAdminMsg('msg-action', '✗ Gagal export CSV.', 'error'));
}

function renderUsersList(snap: any): void {
  const usersContainer = document.getElementById('admin-users-list-container');
  if (!usersContainer) return;
  usersContainer.innerHTML = '';

  const usersData: { id: string; name: string; clicks: number }[] = [];
  snap.forEach((child: any) => {
    usersData.push({ id: child.key, ...child.val() });
  });

  if (usersData.length === 0) {
    usersContainer.innerHTML =
      '<p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.8rem; padding: 0.5rem;">Tidak ada node terdaftar.</p>';
    return;
  }

  usersData.sort((a, b) => b.clicks - a.clicks);

  usersData.forEach((user) => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '0.4rem 0';
    item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

    item.innerHTML = `
      <div style="display:flex; flex-direction:column;">
        <span style="font-weight:bold; font-size:0.85rem; color:#fff;">${escapeHTML(user.name)}</span>
        <span style="font-size:0.7rem; color:rgba(255,255,255,0.5);">${user.clicks || 0} clicks</span>
      </div>
      <div style="display:flex; gap:0.3rem;">
        <button class="admin-btn-action-reset" data-id="${escapeHTML(user.id)}" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:4px; font-size:0.65rem; padding:0.2rem 0.5rem; cursor:pointer;">RESET</button>
        <button class="admin-btn-action-delete" data-id="${escapeHTML(user.id)}" style="background:rgba(255,51,102,0.2); border:1px solid rgba(255,51,102,0.4); color:#ff3366; border-radius:4px; font-size:0.65rem; padding:0.2rem 0.5rem; cursor:pointer;">HAPUS</button>
      </div>
    `;
    usersContainer.appendChild(item);
  });

  usersContainer.querySelectorAll('.admin-btn-action-reset').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id) {
        const name = (btn as HTMLElement).closest('div')?.parentElement?.querySelector('span')?.textContent || 'node';
        const ok = await customConfirm(`Reset klik untuk node <strong>${name}</strong>?`);
        if (ok) {
          set(ref(db, `users/${id}/clicks`), 0);
        }
      }
    });
  });
  usersContainer.querySelectorAll('.admin-btn-action-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id) {
        const name = (btn as HTMLElement).closest('div')?.parentElement?.querySelector('span')?.textContent || 'node';
        const ok = await customConfirm(`Hapus node <strong>${name}</strong> secara permanen?`);
        if (ok) {
          set(ref(db, `users/${id}`), null);
        }
      }
    });
  });
}
