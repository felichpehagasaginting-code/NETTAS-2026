export interface UserData {
  name: string;
  clicks: number;
  badges?: string[];
  longestStreak?: number;
  totalSessions?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  clicks: number;
  badges?: string[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
}

export const BADGE_DEFS: Record<string, { label: string; icon: string; desc: string }> = {
  first_tap: { label: 'FIRST TOUCH', icon: '🌱', desc: 'Tap pertama' },
  tap_10: { label: 'TAP STARTER', icon: '⭐', desc: '10 taps' },
  tap_50: { label: 'TAP ENTHUSIAST', icon: '🔥', desc: '50 taps' },
  tap_100: { label: 'TAP MASTER', icon: '💎', desc: '100 taps' },
  tap_500: { label: 'TAP LEGEND', icon: '🏆', desc: '500 taps' },
  early_bird: { label: 'EARLY BIRD', icon: '🐦', desc: 'Masuk dalam 10 pertama' },
  speed_demon: { label: 'SPEED DEMON', icon: '⚡', desc: '20+ tap dalam 1 detik' },
  team_player: { label: 'TEAM PLAYER', icon: '🤝', desc: 'Online saat 50+ node aktif' },
};
