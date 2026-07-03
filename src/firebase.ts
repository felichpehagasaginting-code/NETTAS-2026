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
import { firebaseConfig } from './config';
import type { UserData, LeaderboardEntry } from './types';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const clicksRef = ref(db, 'global_clicks');
export const presenceRef = ref(db, 'presence');
export const connectedRef = ref(db, '.info/connected');
export const configRef = ref(db, 'config/target_clicks');
export const configThemeRef = ref(db, 'config/theme');
export const configBgmRef = ref(db, 'config/bgm_url');
export const usersRef = ref(db, 'users');
export const topUsersQuery = query(ref(db, 'users'), orderByChild('clicks'), limitToLast(5));

export { ref, db, onValue, set, update, get, onDisconnect, runTransaction, query, orderByChild, limitToLast };

export type { DatabaseReference };

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
}

export const state = new FirebaseState();
