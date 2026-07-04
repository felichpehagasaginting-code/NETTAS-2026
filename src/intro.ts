import { state, db, ref, get, set, onDisconnect } from './firebase';
import { resumeAudio, initVisualizer, bgMusic } from './audio';
import { customAlert } from './modal';

function sanitizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-\s]/g, '').slice(0, 12).trim() || 'ANON';
}

export function initIntro(): void {
  document.getElementById('btn-enter-system')!.addEventListener('click', handleEnter);
  document.getElementById('btn-intro-logout')!.addEventListener('click', logoutNode);
  document.getElementById('btn-switch-node-ui')!.addEventListener('click', logoutNode);

  const btnConfirmPin = document.getElementById('btn-confirm-pin');
  if (btnConfirmPin) {
    btnConfirmPin.addEventListener('click', handlePinConfirm);
  }

  const btnPinBack = document.getElementById('btn-pin-back');
  if (btnPinBack) {
    btnPinBack.addEventListener('click', () => {
      document.getElementById('intro-step-2')!.style.display = 'none';
      document.getElementById('intro-step-1')!.style.display = 'flex';
    });
  }

  const pinInput = document.getElementById('node-pin-input') as HTMLInputElement;
  if (pinInput) {
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-confirm-pin')!.click();
    });
  }

  initIntroUI();
}

function initIntroUI(): void {
  if (state.myNodeId && state.myNodeName) {
    document.getElementById('welcome-back-container')!.style.display = 'block';
    document.getElementById('welcome-back-name')!.innerText = state.myNodeName;
    (document.getElementById('node-name-input') as HTMLInputElement).style.display = 'none';
    document.getElementById('btn-intro-logout')!.style.display = 'block';
    (document.getElementById('btn-enter-system') as HTMLElement).innerText =
      '⚡ INITIALIZE CONNECTION';

    document.getElementById('current-node-name')!.innerText = state.myNodeName;
    document.getElementById('node-info-badge')!.style.display = 'flex';
  }
}

function logoutNode(): void {
  localStorage.removeItem('nettas-node-id');
  localStorage.removeItem('nettas-node-name');
  localStorage.removeItem('nettas-node-pin-hash');
  state.myNodeId = '';
  state.myNodeName = '';
  state.myLocalClicks = 0;
  state.lastSyncClicks = 0;
  location.reload();
}

async function handleEnter(): Promise<void> {
  if (state.myNodeId && state.myNodeName) {
    const userClickRef = ref(db, `users/${state.myNodeId}`);
    try {
      const snap = await get(userClickRef);
      const userData = snap.val();
      if (userData) {
        state.myLocalClicks = userData.clicks || 0;
        state.lastSyncClicks = state.myLocalClicks;
      }
      completeLogin(state.myNodeId, state.myNodeName, state.myLocalClicks);
    } catch {
      completeLogin(state.myNodeId, state.myNodeName, 0);
    }
  } else {
    const rawName = (
      document.getElementById('node-name-input') as HTMLInputElement
    ).value.trim();
    const inputName = sanitizeName(rawName).toUpperCase();
    if (!inputName || inputName.length < 2) {
      await customAlert('NAMA NODE HARUS MINIMAL 2 KARAKTER!');
      return;
    }

    const normalizedId = inputName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (normalizedId.length < 2) {
      await customAlert('NAMA NODE HARUS MINIMAL 2 KARAKTER ALFANUMERIK!');
      return;
    }

    const btnEnter = document.getElementById('btn-enter-system') as HTMLElement;
    btnEnter.innerText = '⚡ CONNECTING...';
    (btnEnter as HTMLButtonElement).disabled = true;

    try {
      const userRef = ref(db, `users/${normalizedId}`);
      const snap = await get(userRef);
      const userData = snap.val();

      if (userData) {
        completeLogin(normalizedId, userData.name || inputName, userData.clicks || 0);
      } else {
        const userPath = ref(db, `users/${normalizedId}`);
        await set(userPath, { name: inputName, clicks: 0 });
        completeLogin(normalizedId, inputName, 0);
      }
    } catch (err) {
      console.error('Error checking user node:', err);
      await customAlert('Koneksi gagal: ' + (err as Error).message);
    } finally {
      btnEnter.innerText = '⚡ INITIALIZE CONNECTION';
      (btnEnter as HTMLButtonElement).disabled = false;
    }
  }
}

function completeLogin(nodeId: string, nodeName: string, clicks: number): void {
  state.myNodeId = nodeId;
  state.myNodeName = nodeName;
  state.myLocalClicks = clicks;
  state.lastSyncClicks = clicks;

  localStorage.setItem('nettas-node-id', state.myNodeId);
  localStorage.setItem('nettas-node-name', state.myNodeName);

  document.getElementById('current-node-name')!.innerText = state.myNodeName;
  document.getElementById('node-info-badge')!.style.display = 'flex';

  const myPresenceRef = ref(db, 'presence/' + state.myNodeId);
  set(myPresenceRef, state.myNodeName);
  onDisconnect(myPresenceRef).remove();

  resumeAudio();
  if (!document.querySelector('canvas#visualizer')) initVisualizer();
  bgMusic.play().catch((e) => console.warn('Music autoplay was blocked:', e));
  document.getElementById('music-status')!.innerText = 'MUSIC: ON';

  const introOverlay = document.getElementById('intro-overlay')!;
  introOverlay.classList.add('fade-out');
  setTimeout(() => {
    introOverlay.style.display = 'none';
  }, 1100);
}

async function handlePinConfirm(): Promise<void> {
  await customAlert('PIN verification not implemented in intro flow');
}
