import { GameConfig, ShopEffectType, SpacePortIconType, RenderingConfig } from '@types';

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
      segmentSize: 8,
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
    },
    scatter: {
      limit: 150,
      speed: -14,
      maxAmmo: 100,
      ammoRegenRate: 1.5,
      ammoConsumption: 5,
      shotCooldown: 0.2,
      projectilesPerShot: 5,
      spreadAngle: 30
    },
    homing: {
      limit: 30,
      speed: -8,
      maxAmmo: 80,
      ammoRegenRate: 1,
      ammoConsumption: 4,
      shotCooldown: 0.35,
      trackingStrength: 0.08,
      trackingRange: 200
    }
  },
  experienceOrb: {
    baseSpeed: 0.5,
    magnetRange: 100,
    magnetSpeed: 4,
    collectionRadius: 20,
    baseValue: 5
  },
  enemyHealthBar: {
    width: 30,
    height: 4,
    bigShooterWidth: 40,
    bigShooterHeight: 6,
    offsetY: 15,
    fadeDelay: 2000,
    fadeDuration: 500
  },
  waves: {
    restDuration: 15,
    baseEnemyCount: 3,
    enemyScaling: 2,
    spawnDelay: 1.5,
    difficultyScaling: {
      hpMultiplier: 1.2,
      speedMultiplier: 1.1
    },
    pointsPerKill: 10
  },
  shop: {
    upgradePool: [
      {
        id: 'bullet_speed',
        name: 'Bullet Speed',
        cost: 10,
        color: '#4444ff',
        effect: ShopEffectType.BULLET_SPEED,
        description: '+20% projectile velocity',
        category: 'stat',
        iconType: SpacePortIconType.BULLET_SPEED,
        scalingCost: 5
      },
      {
        id: 'fire_rate',
        name: 'Fire Rate',
        cost: 15,
        color: '#ff4444',
        effect: ShopEffectType.FIRE_RATE,
        description: '-15% shot cooldown',
        category: 'stat',
        iconType: SpacePortIconType.FIRE_RATE,
        scalingCost: 5
      },
      {
        id: 'extra_bullets',
        name: 'Extra Ammo',
        cost: 20,
        color: '#44ff44',
        effect: ShopEffectType.EXTRA_BULLETS,
        description: '+25 max ammo',
        category: 'stat',
        iconType: SpacePortIconType.EXTRA_BULLETS,
        scalingCost: 10
      },
      {
        id: 'move_speed',
        name: 'Thrusters',
        cost: 15,
        color: '#ffaa00',
        effect: ShopEffectType.MOVE_SPEED,
        description: '+15% movement speed',
        category: 'stat',
        iconType: SpacePortIconType.MOVE_SPEED,
        scalingCost: 10
      },
      {
        id: 'max_health',
        name: 'Hull Plating',
        cost: 20,
        color: '#00cccc',
        effect: ShopEffectType.MAX_HEALTH,
        description: '+25 max health',
        category: 'stat',
        iconType: SpacePortIconType.MAX_HEALTH,
        scalingCost: 10
      },
      {
        id: 'magnet_range',
        name: 'Tractor Beam',
        cost: 10,
        color: '#aa44ff',
        effect: ShopEffectType.MAGNET_RANGE,
        description: '+50% magnet range',
        category: 'stat',
        iconType: SpacePortIconType.MAGNET_RANGE,
        scalingCost: 5
      },
      {
        id: 'weapon_scatter',
        name: 'Scatter Cannon',
        cost: 30,
        color: '#ff6600',
        effect: ShopEffectType.WEAPON_SCATTER,
        description: 'Unlocks scatter shot weapon',
        category: 'weapon',
        iconType: SpacePortIconType.SCATTER_GUN,
        maxPurchases: 1
      },
      {
        id: 'weapon_homing',
        name: 'Homing Missiles',
        cost: 35,
        color: '#ff00ff',
        effect: ShopEffectType.WEAPON_HOMING,
        description: 'Unlocks homing missile weapon',
        category: 'weapon',
        iconType: SpacePortIconType.HOMING_MISSILE,
        maxPurchases: 1
      }
    ],
    spacePort: {
      maxPortsPerRest: 3,
      portSize: { width: 80, height: 60 },
      positions: [
        { x: 250, y: 200 },
        { x: 700, y: 150 },
        { x: 1150, y: 200 },
        { x: 450, y: 350 },
        { x: 950, y: 350 }
      ]
    }
  }
};

export const renderingConfig: RenderingConfig = {
  particles: {
    poolSize: 200,
    engineTrail: { count: 3, lifetime: 20, speed: 1.0 },
    explosion: { count: 15, lifetime: 30, speed: 3.5 },
    hitSpark: { count: 6, lifetime: 12, speed: 2.0 },
    xpCollect: { count: 10, lifetime: 18, speed: 2.0 },
    projectileTrail: { count: 1, lifetime: 10 }
  }
};
