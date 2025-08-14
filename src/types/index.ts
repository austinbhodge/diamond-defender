import * as createjs from '@thegraid/createjs-module';

export interface GameObject {
  update(): void;
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface GameEntity extends GameObject {
  position: Position;
  velocity: Velocity;
  shape: createjs.Shape;
}

export enum WeaponType {
  LASER = 'laser',
  DUB = 'dub',
  CIRCLE = 'circle'
}

export enum EnemyAttackPattern {
  CHASE = 'chase',
  CIRCLE_SHOOT = 'circle_shoot',
  BIG_SHOOTER = 'big_shooter',
  SWIPE = 'swipe',
  DASH_WORM = 'dash_worm'
}

export interface WeaponProjectile {
  shape: createjs.Shape;
  rotation: number;
  alpha: number;
}

export interface ViewportConfig {
  targetWidth: number;
  targetHeight: number;
  minWidth: number;
  maxWidth: number;
  aspectRatio: number;
}

export interface ResponsiveUILayout {
  waveDisplay: { x: number; y: number; anchor: { x: string; y: string } };
  enemyCounter: { x: number; y: number; anchor: { x: string; y: string } };
  experienceCounter: { x: number; y: number; anchor: { x: string; y: string } };
  timerDisplay: { x: number; y: number; anchor: { x: string; y: string } };
  healthBar: { x: number; y: number; width: number; height: number };
  ammoBar: { x: number; y: number; width: number; height: number };
}

export interface GameConfig {
  canvas: {
    width: number;
    height: number;
  };
  viewport: ViewportConfig;
  ui: ResponsiveUILayout;
  fps: number;
  player: {
    maxVelocity: number;
    maxAcceleration: number;
    acceleration: number;
    maxHealth: number;
    invulnerabilityDuration: number;
    damagePerCollision: number;
  };
  enemy: {
    baseSpeed: number;
    acceleration: number;
    hp: number;
    circleAttack: {
      radius: number;
      angularSpeed: number;
      shootCooldown: number;
      projectileSpeed: number;
      projectileDamage: number;
      projectileLifetime: number;
    };
    bigShooter: {
      speed: number;
      hp: number;
      size: number;
      shootCooldown: number;
      projectileSpeed: number;
      projectileDamage: number;
      projectileLifetime: number;
    };
    dashWorm: {
      speed: number;
      hp: number;
      dashSpeed: number;
      dashCooldown: number;
      dashDuration: number;
      detectionRadius: number;
      segmentCount: number;
      segmentSize: number;
      headSize: number;
    };
  };
  weapons: {
    phaser: {
      limit: number;
      speed: number;
      maxAmmo: number;
      ammoRegenRate: number;
      ammoConsumption: number;
      shotCooldown: number;
    };
    circle: {
      limit: number;
      speed: number;
      maxAmmo: number;
      ammoRegenRate: number;
      ammoConsumption: number;
      shotCooldown: number;
      projectileSize: number;
    };
    kick: {
      maxRadius: number;
      expandRate: number;
      decayRate: number;
    };
  };
  experienceOrb: {
    baseSpeed: number;
    magnetRange: number;
    magnetSpeed: number;
    collectionRadius: number;
    baseValue: number;
  };
  enemyHealthBar: {
    width: number;
    height: number;
    bigShooterWidth: number;
    bigShooterHeight: number;
    offsetY: number;
    fadeDelay: number;
    fadeDuration: number;
  };
  waves: WaveConfig;
  shop: ShopConfig;
}

export interface WaveConfig {
  restDuration: number; // seconds between waves
  baseEnemyCount: number; // starting number of enemies in wave 1
  enemyScaling: number; // additional enemies per wave
  spawnDelay: number; // seconds between enemy spawns
  difficultyScaling: {
    hpMultiplier: number; // HP increase per wave
    speedMultiplier: number; // Speed increase per wave
  };
  pointsPerKill: number; // Points awarded per enemy kill
}

export enum WaveState {
  PREPARATION = 'preparation',
  ACTIVE = 'active',
  REST = 'rest',
  COMPLETE = 'complete'
}

export interface WaveData {
  number: number;
  totalEnemies: number;
  enemiesRemaining: number;
  enemiesSpawned: number;
  state: WaveState;
}

export interface UIElements {
  waveDisplay: createjs.Text;
  enemyCounter: createjs.Text;
  timerDisplay: createjs.Text;
  wavePopup: createjs.Container;
  healthBar: HealthBarElements;
}

export interface PlayerStats {
  maxHealth: number;
  currentHealth: number;
  invulnerabilityDuration: number;
  damagePerCollision: number;
}

export interface HealthBarElements {
  container: createjs.Container;
  background: createjs.Shape;
  fill: createjs.Shape;
  border: createjs.Shape;
  label: createjs.Text;
}

export interface HealthBarConfig {
  width: number;
  height: number;
  x: number;
  y: number;
  backgroundColor: string;
  fillColor: string;
  borderColor: string;
  lowHealthThreshold: number;
}

export interface FontConfig {
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  color: string;
}

export interface ShopConfig {
  items: ShopItem[];
  zoneSize: { width: number; height: number };
  slotSize: number;
  position: { x: number; y: number };
}