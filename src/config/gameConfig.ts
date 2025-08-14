import { GameConfig } from '@types';

export const gameConfig: GameConfig = {
  canvas: {
    width: 1400,
    height: 800
  },
  viewport: {
    targetWidth: 1400,
    targetHeight: 800,
    minWidth: 800,
    maxWidth: 1920,
    aspectRatio: 1400 / 800
  },
  ui: {
    waveDisplay: { x: 2, y: 2.5, anchor: { x: 'left', y: 'top' } },
    enemyCounter: { x: 2, y: 6.25, anchor: { x: 'left', y: 'top' } },
    experienceCounter: { x: 98, y: 2.5, anchor: { x: 'right', y: 'top' } },
    timerDisplay: { x: 50, y: 2.5, anchor: { x: 'center', y: 'top' } },
    healthBar: { x: 2, y: 95, width: 200, height: 10 },
    ammoBar: { x: 98, y: 95, width: 200, height: 10 }
  },
  fps: 55,
  player: {
    maxVelocity: 9,
    maxAcceleration: 2,
    acceleration: 0.08,
    maxHealth: 100,
    invulnerabilityDuration: 1.0,
    damagePerCollision: 10
  },
  enemy: {
    baseSpeed: 7.5,
    acceleration: 0.12,
    hp: 50,
    circleAttack: {
      radius: 40,
      angularSpeed: 0.01,
      shootCooldown: 2.0,
      projectileSpeed: 3,
      projectileDamage: 15,
      projectileLifetime: 5
    },
    bigShooter: {
      speed: 2,
      hp: 150,
      size: 30,
      shootCooldown: 1.2,
      projectileSpeed: 10,
      projectileDamage: 20,
      projectileLifetime: 6
    },
    dashWorm: {
      speed: 4,
      hp: 25,
      dashSpeed: 15,
      dashCooldown: 2.5,
      dashDuration: 0.3,
      detectionRadius: 80,
      segmentCount: 5,
      segmentSize: 8  ,
      headSize: 6
    }
  },
  weapons: {
    phaser: {
      limit: 200,
      speed: -16,
      maxAmmo: 100,
      ammoRegenRate: 2,
      ammoConsumption: 1,
      shotCooldown: 0.05
    },
    circle: {
      limit: 50,
      speed: -4,
      maxAmmo: 100,
      ammoRegenRate: 2,
      ammoConsumption: 3,
      shotCooldown: 0.15,
      projectileSize: 8
    },
    kick: {
      maxRadius: 200,
      expandRate: 1,
      decayRate: 100
    }
  },
  experienceOrb: {
    baseSpeed: 0.5, // Slow drift speed towards player
    magnetRange: 100, // Distance at which orbs start accelerating
    magnetSpeed: 4, // Additional speed when in magnetic range
    collectionRadius: 20, // Distance at which orbs are collected
    baseValue: 5 // Base experience points per orb
  },
  enemyHealthBar: {
    width: 30, // Width of regular enemy health bar
    height: 4, // Height of regular enemy health bar
    bigShooterWidth: 40, // Width for big shooter health bar
    bigShooterHeight: 6, // Height for big shooter health bar
    offsetY: 15, // Distance above enemy
    fadeDelay: 2000, // Time before fade starts (ms)
    fadeDuration: 500 // Fade animation duration (ms)
  },
  waves: {
    restDuration: 15, // 15 seconds rest between waves
    baseEnemyCount: 3, // Wave 1 starts with 3 enemies
    enemyScaling: 2, // Each wave adds 2 more enemies
    spawnDelay: 1.5, // 1.5 seconds between enemy spawns
    difficultyScaling: {
      hpMultiplier: 1.2, // 20% HP increase per wave
      speedMultiplier: 1.1 // 10% speed increase per wave
    },
    pointsPerKill: 10 // 10 points per enemy killed
  }
};