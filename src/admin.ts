import { ADMIN_HASH } from './config';
import { state, clicksRef, configRef, configThemeRef, configBgmRef, db, ref, set, onValue, usersRef } from './firebase';

let adminPinOverlay: HTMLElement;
let adminOverlay: HTMLElement;
let adminPinInput: HTMLInputElement;
let adminPinError: HTMLElement;

export function initAdmin(): void {
  adminPinOverlay = document.getElementById('admin-pin-overlay')!;
  adminOverlay = document.getElementById('admin-overlay')!;
  adminPinInput = document.getElementById('admin-pin-input') as HTMLInputElement;
  adminPinError = document.getElementById('admin-pin-error')!;

  document.getElementById('admin-trigger')!.addEventListener('click', handleAdminTrigger);

  adminPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-admin-pin-confirm')!.click();
  });

  document.getElementById('btn-admin-pin-confirm')!.addEventListener('click', handlePinConfirm);
  document.getElementById('btn-admin-pin-cancel')!.addEventListener('click', closePin);

  document.getElementById('btn-admin-close')!.addEventListener('click', closeAdmin);

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

  onValue(usersRef, (snap) => {
    renderUsersList(snap);
  });
}

let adminClickCount = 0;
let adminClickTimer: ReturnType<typeof setTimeout> | null = null;

function handleAdminTrigger(): void {
  adminClickCount++;
  if (adminClickCount === 1) {
    adminClickTimer = setTimeout(() => {
      adminClickCount = 0;
    }, 500);
  } else if (adminClickCount >= 2) {
    if (adminClickTimer) clearTimeout(adminClickTimer);
    adminClickCount = 0;
    openAdminPin();
  }
}

function openAdminPin(): void {
  adminPinOverlay.classList.add('show');
  adminPinInput.value = '';
  adminPinError.textContent = '';
  setTimeout(() => adminPinInput.focus(), 100);
}

function closePin(): void {
  adminPinOverlay.classList.remove('show');
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function handlePinConfirm(): Promise<void> {
  const pinInput = adminPinInput.value.trim();
  if (!pinInput) return;
  const hash = await sha256(pinInput);
  if (hash === ADMIN_HASH) {
    adminPinOverlay.classList.remove('show');
    openAdminPanel();
  } else {
    adminPinError.textContent = '⚠ Sandi salah. Akses ditolak.';
    adminPinInput.value = '';
    adminPinInput.focus();
    setTimeout(() => {
      adminPinError.textContent = '';
    }, 3000);
  }
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
}

function closeAdmin(): void {
  adminOverlay.classList.remove('show');
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
    .then(() =>
      showAdminMsg('msg-target', `✓ Target diperbarui ke ${newTarget.toLocaleString()} klik.`, 'success'),
    )
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
    .then(() =>
      showAdminMsg('msg-clicks', `✓ Total klik diperbarui ke ${newClicks.toLocaleString()}.`, 'success'),
    )
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

function handleReset(): void {
  if (
    !confirm(
      '⚠ Anda yakin ingin me-reset TOTAL progres aktivasi ke 0? (Data user/node tidak akan terhapus). Tindakan ini tidak dapat dibatalkan!',
    )
  )
    return;
  state.isFinished = false;
  state.displayedMilestones.clear();
  document.getElementById('victory-modal')!.classList.remove('show');
  document.getElementById('strobe-layer')!.classList.remove('strobe-bg');
  document.body.classList.remove('bg-festive');

  set(clicksRef, 0)
    .then(() => showAdminMsg('msg-action', '✓ Progres berhasil direset ke 0.', 'success'))
    .catch(() => showAdminMsg('msg-action', '✗ Gagal melakukan reset progres. Cek koneksi.', 'error'));
}

function handleResetUsers(): void {
  if (!confirm('⚠ Anda yakin ingin menghapus SEMUA user node terdaftar?')) return;

  set(ref(db, 'users'), null)
    .then(() => showAdminMsg('msg-action', '✓ Semua user node berhasil dihapus.', 'success'))
    .catch(() => showAdminMsg('msg-action', '✗ Gagal menghapus user node. Cek koneksi.', 'error'));
}

function handleForceWin(): void {
  if (!confirm('🏆 Aktifkan mode kemenangan sekarang? Counter akan di-set ke nilai TARGET.')) return;
  set(clicksRef, state.target)
    .then(() => {
      showAdminMsg('msg-action', '✓ Mode kemenangan diaktifkan!', 'success');
      adminOverlay.classList.remove('show');
    })
    .catch(() => showAdminMsg('msg-action', '✗ Gagal. Cek koneksi.', 'error'));
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
        <span style="font-weight:bold; font-size:0.85rem; color:#fff;">${user.name}</span>
        <span style="font-size:0.7rem; color:rgba(255,255,255,0.5);">${user.clicks || 0} clicks</span>
      </div>
      <div style="display:flex; gap:0.3rem;">
        <button class="admin-btn-action-reset" data-id="${user.id}" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:4px; font-size:0.65rem; padding:0.2rem 0.5rem; cursor:pointer;">RESET</button>
        <button class="admin-btn-action-delete" data-id="${user.id}" style="background:rgba(255,51,102,0.2); border:1px solid rgba(255,51,102,0.4); color:#ff3366; border-radius:4px; font-size:0.65rem; padding:0.2rem 0.5rem; cursor:pointer;">HAPUS</button>
      </div>
    `;
    usersContainer.appendChild(item);
  });

  usersContainer.querySelectorAll('.admin-btn-action-reset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id && confirm(`Reset klik untuk node ini?`)) {
        set(ref(db, `users/${id}/clicks`), 0);
      }
    });
  });
  usersContainer.querySelectorAll('.admin-btn-action-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id && confirm(`Hapus node ini secara permanen?`)) {
        set(ref(db, `users/${id}`), null);
      }
    });
  });
}
