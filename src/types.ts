export interface UserData {
  name: string;
  clicks: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  clicks: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
}
