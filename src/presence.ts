import { db, ref, set, onValue, onDisconnect } from './firebase';

let _sessionId: string | null = null;
let _presenceRef: ReturnType<typeof ref> | null = null;
let _activeRef: ReturnType<typeof ref> | null = null;

function getSessionId(): string {
  const KEY = 'nettas_session';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function initPresence(): void {
  _sessionId = getSessionId();
  _presenceRef = ref(db, 'presence/' + _sessionId);
  _activeRef = ref(db, 'active_clicks/' + _sessionId);

  const connectedRef = ref(db, '.info/connected');
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      set(_presenceRef!, { online: true, connectedAt: Date.now() });
      onDisconnect(_presenceRef!).remove();
      onDisconnect(_activeRef!).remove();
    }
  });
}

export function markTap(): void {
  if (_activeRef) {
    set(_activeRef, { lastTap: Date.now() });
  }
}

export function subscribePresenceCount(cb: (n: number) => void): () => void {
  const r = ref(db, 'presence');
  const off = onValue(r, (snap) => cb(snap.size || 0));
  return off;
}

export function subscribeActiveCount(cb: (n: number) => void): () => void {
  const r = ref(db, 'active_clicks');
  const off = onValue(r, (snap) => cb(snap.size || 0));
  return off;
}
