export type DiscType = 'normal' | 'gold' | 'bomb' | 'slowmo' | 'shielded' | 'splitting' | 'ghost';

export interface Point {
  x: number;
  y: number;
}

export interface Disc {
  id: string;
  type: DiscType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  points: number;
  isDead: boolean;
  spawnTime: number;
  scale: number;
  health?: number;
  maxHealth?: number;
  opacity?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  type?: 'spark' | 'smoke' | 'flare';
}

export interface GameState {
  score: number;
  isGameOver: boolean;
  isStarted: boolean;
  highScore: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
  combo: number;
  maxCombo: number;
  level: number;
  isSlowMo: boolean;
  slowMoTimer: number;
}

export interface HandData {
  point: Point;
  isShooting: boolean;
  isVisible: boolean;
}
