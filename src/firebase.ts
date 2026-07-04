import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  get,
  onDisconnect,
  runTransaction,
  query,
  orderByChild,
  limitToLast,
  DatabaseReference,
} from 'firebase/database';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  signOut,
  getIdTokenResult,
} from 'firebase/auth';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { firebaseConfig, AUTH_CONFIG } from './config';
import type { UserData, LeaderboardEntry } from './types';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const functions = getFunctions(app, 'asia-southeast1');
const tapDistributed = httpsCallable(functions, 'tapDistributed');

export const clicksRef = ref(db, 'global_clicks');
export const presenceRef = ref(db, 'presence');
export const connectedRef = ref(db, '.info/connected');
export const configRef = ref(db, 'config/target_clicks');
export const configThemeRef = ref(db, 'config/theme');
export const configBgmRef = ref(db, 'config/bgm_url');
export const usersRef = ref(db, 'users');
export const topUsersQuery = query(ref(db, 'users'), orderByChild('clicks'), limitToLast(5));
export const adminsRef = ref(db, 'admins');

export { ref, db, onValue, set, update, get, onDisconnect, runTransaction, query, orderByChild, limitToLast, auth, functions, tapDistributed };
export type { DatabaseReference, User };

export class FirebaseState {
  target = 2026;
  currentCount = 0;
  isFinished = false;
  currentProgressPercentage = 0;

  myNodeId = localStorage.getItem('nettas-node-id') || '';
  myNodeName = localStorage.getItem('nettas-node-name') || '';

  myLocalClicks = 0;
  lastSyncClicks = 0;
  lastSyncTime = 0;
  syncTimeout: ReturnType<typeof setTimeout> | null = null;

  displayedMilestones = new Set<number>();
  currentLeaderboardData: LeaderboardEntry[] = [];
  lastClicksCount = 0;
  lastVelocityTime = Date.now();
  hypeSpeed = 0;
  myBadges: string[] = [];

  // Auth state
  currentUser: User | null = null;
  isAdmin = false;
  authReady = false;
}

export const state = new FirebaseState();

// Auth initialization
export async function initAuth(): Promise<void> {
  if (AUTH_CONFIG.enableAnonymousAuth) {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error('Anonymous auth failed:', err);
    }
  }

  onAuthStateChanged(auth, async (user) => {
    state.currentUser = user;
    state.authReady = true;

    if (user) {
      // Check admin status via custom claims
      try {
        const tokenResult = await getIdTokenResult(user);
        state.isAdmin = tokenResult.claims.admin === true;
      } catch (err) {
        console.error('Failed to get admin claims:', err);
        state.isAdmin = false;
      }

      // Set user's display name in token for presence validation
      if (!user.displayName && state.myNodeName) {
        // We'll update the profile with the node name
      }
    } else {
      state.isAdmin = false;
    }

    // Notify UI that auth state changed
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { user, isAdmin: state.isAdmin }
    }));
  });
}

export async function signInAdmin(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function isAdminUser(): boolean {
  return state.isAdmin;
}