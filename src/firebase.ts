import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  get,
  runTransaction,
} from 'firebase/database';
import {
  getAuth,
  signInAnonymously,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const functions = getFunctions(app, 'asia-southeast1');
const tapDistributed = httpsCallable(functions, 'tapDistributed');

export const clicksRef = ref(db, 'global_clicks');
export const configRef = ref(db, 'config/target_clicks');
export const configThemeRef = ref(db, 'config/theme');
export const configBgmRef = ref(db, 'config/bgm_url');
export const configVictoryBgmRef = ref(db, 'config/victory_bgm_url');
export const configYoutubeIdRef = ref(db, 'config/youtube_video_id');

export { ref, db, onValue, set, update, get, runTransaction, auth, functions, tapDistributed };

export class FirebaseState {
  target = 2026;
  currentCount = 0;
  isFinished = false;
  currentProgressPercentage = 0;

  displayedMilestones = new Set<number>();
  lastClicksCount = 0;
  lastVelocityTime = Date.now();
  hypeSpeed = 0;
  isHypeActive = false;

  isAdmin = false;
}

export const state = new FirebaseState();

// Anonymous auth initialization (for database security rules)
const _authPromise = signInAnonymously(auth);
_authPromise.catch((err) => {
  console.error('Anonymous auth failed:', err);
});

export function waitForAuth(): Promise<void> {
  return _authPromise.then(() => {});
}
