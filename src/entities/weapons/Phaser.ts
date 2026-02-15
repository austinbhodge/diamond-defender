import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position, WeaponType, WeaponProjectile } from '@types';
import { gameConfig } from '@config/gameConfig';
import { degreesToRadians } from '@utils/math';
import { ShipRenderers } from '@rendering/ShipRenderers';
import { ParticleSystem } from '@rendering/ParticleSystem';

interface Projectile extends WeaponProjectile {
  velocityX: number;
  velocityY: number;
  amplitude?: number;
  isHoming?: boolean;
}

export class Phaser implements GameObject {
  private stage: createjs.Stage;
  private type: WeaponType;
  private projectiles: Projectile[] = [];
  private playerPosition: Position;
  private mousePosition: Position;
  private angle: number = 0;

  private limit: number;
  private speed: number;
  private firing: boolean = false;

  // Upgrade modifiers
  private bulletSpeedMultiplier: number = 1.0;
  private fireRateMultiplier: number = 1.0;
  private extraBulletsBonus: number = 0;

  // Ammo system - separate for each weapon type
  private weaponAmmo: Map<WeaponType, { current: number; max: number; regenTimer: number; }> = new Map();
  private lastShotTime: Map<WeaponType, number> = new Map();

  // Weapon configs
  private weaponConfigs: Map<WeaponType, {
    limit: number;
    speed: number;
    maxAmmo: number;
    ammoRegenRate: number;
    ammoConsumption: number;
    shotCooldown: number;
    projectileSize?: number;
    projectilesPerShot?: number;
    spreadAngle?: number;
    trackingStrength?: number;
    trackingRange?: number;
  }> = new Map();

  // Dub cannon specific
  private cycle: number = 0;
  private cycleDown: boolean = false;
  private cycleMax: number = 2;
  private baseAmplitude: number = 40;
  private flip: number = 1;

  // Blur filters
  private blurX: createjs.BlurFilter;
  private blurY: createjs.BlurFilter;
  private superBlur: createjs.BlurFilter;

  // Beam connector for circle weapon
  private beamConnector: createjs.Shape;

  // Particle system reference
  private particleSystem: ParticleSystem | null = null;

  // Enemy positions for homing
  private enemyPositions: Position[] = [];

  constructor(stage: createjs.Stage, type: WeaponType = WeaponType.LASER) {
    this.stage = stage;
    this.type = type;

    const { phaser, circle, scatter, homing } = gameConfig.weapons;

    // Initialize weapon configs
    this.weaponConfigs.set(WeaponType.LASER, {
      limit: phaser.limit,
      speed: phaser.speed,
      maxAmmo: phaser.maxAmmo,
      ammoRegenRate: phaser.ammoRegenRate,
      ammoConsumption: phaser.ammoConsumption,
      shotCooldown: phaser.shotCooldown
    });

    this.weaponConfigs.set(WeaponType.DUB, {
      limit: phaser.limit,
      speed: phaser.speed,
      maxAmmo: phaser.maxAmmo,
      ammoRegenRate: phaser.ammoRegenRate,
      ammoConsumption: phaser.ammoConsumption * 2, // Dub uses more ammo
      shotCooldown: phaser.shotCooldown
    });

    this.weaponConfigs.set(WeaponType.CIRCLE, {
      limit: circle.limit,
      speed: circle.speed,
      maxAmmo: circle.maxAmmo,
      ammoRegenRate: circle.ammoRegenRate,
      ammoConsumption: circle.ammoConsumption,
      shotCooldown: circle.shotCooldown,
      projectileSize: circle.projectileSize
    });

    this.weaponConfigs.set(WeaponType.SCATTER, {
      limit: scatter.limit,
      speed: scatter.speed,
      maxAmmo: scatter.maxAmmo,
      ammoRegenRate: scatter.ammoRegenRate,
      ammoConsumption: scatter.ammoConsumption,
      shotCooldown: scatter.shotCooldown,
      projectilesPerShot: scatter.projectilesPerShot,
      spreadAngle: scatter.spreadAngle
    });

    this.weaponConfigs.set(WeaponType.HOMING, {
      limit: homing.limit,
      speed: homing.speed,
      maxAmmo: homing.maxAmmo,
      ammoRegenRate: homing.ammoRegenRate,
      ammoConsumption: homing.ammoConsumption,
      shotCooldown: homing.shotCooldown,
      trackingStrength: homing.trackingStrength,
      trackingRange: homing.trackingRange
    });

    // Initialize ammo for each weapon type
    for (const [weaponType, config] of this.weaponConfigs.entries()) {
      this.weaponAmmo.set(weaponType, {
        current: config.maxAmmo + this.extraBulletsBonus,
        max: config.maxAmmo + this.extraBulletsBonus,
        regenTimer: 0
      });
      this.lastShotTime.set(weaponType, 0);
    }

    // Set compatibility variables for legacy code
    this.limit = phaser.limit;
    this.speed = phaser.speed;

    this.playerPosition = { x: 0, y: 0 };
    this.mousePosition = { x: 0, y: 0 };

    // Create blur filters with smaller values for better visibility
    this.blurX = new createjs.BlurFilter(5, 0, 1);
    this.blurY = new createjs.BlurFilter(0, 5, 1);
    this.superBlur = new createjs.BlurFilter(10, 10, 1);

    // Create beam connector shape for circle weapon
    this.beamConnector = new createjs.Shape();
    this.stage.addChild(this.beamConnector);
  }

  public setParticleSystem(ps: ParticleSystem): void {
    this.particleSystem = ps;
  }

  public setEnemyPositions(positions: Position[]): void {
    this.enemyPositions = positions;
  }

  public update(): void {
    this.updateAngle();
    this.updateAmmo();

    if (this.firing && this.canFire()) {
      this.createProjectile();
    }

    this.updateProjectiles();
  }

  private updateAngle(): void {
    const xOff = (this.playerPosition.x - this.mousePosition.x) * -1;
    const yOff = this.playerPosition.y - this.mousePosition.y;

    this.angle = (Math.atan(xOff / yOff) / Math.PI) * 180;
    if (yOff > 0) {
      this.angle += -180;
    }
  }

  private createProjectile(): void {
    if (this.type === WeaponType.LASER) {
      this.createLaserProjectile();
    } else if (this.type === WeaponType.DUB) {
      this.createDubProjectile();
    } else if (this.type === WeaponType.CIRCLE) {
      this.createCircleProjectile();
    } else if (this.type === WeaponType.SCATTER) {
      this.createScatterProjectile();
    } else if (this.type === WeaponType.HOMING) {
      this.createHomingProjectile();
    }

    // Consume ammo for current weapon
    const config = this.weaponConfigs.get(this.type)!;
    const ammo = this.weaponAmmo.get(this.type)!;
    ammo.current = Math.max(0, ammo.current - config.ammoConsumption);
    this.lastShotTime.set(this.type, Date.now() / 1000);
  }

  private createLaserProjectile(): void {
    const shape = new createjs.Shape();
    ShipRenderers.drawLaserProjectile(shape.graphics);

    // Use fixed values instead of getBounds()
    shape.regY = 11; // height / 2
    shape.regX = -1;
    shape.rotation = this.angle;
    shape.x = this.playerPosition.x;
    shape.y = this.playerPosition.y;
    shape.alpha = 1;

    this.stage.addChild(shape);

    const angleRad = degreesToRadians(this.angle + 270);
    const projectile: Projectile = {
      shape,
      rotation: this.angle,
      alpha: 1,
      velocityX: Math.cos(angleRad) * this.speed * this.bulletSpeedMultiplier,
      velocityY: Math.sin(angleRad) * this.speed * this.bulletSpeedMultiplier
    };

    this.projectiles.push(projectile);
  }

  private createDubProjectile(): void {
    const amplitude = this.baseAmplitude - Math.random() * 10;
    const shape = new createjs.Shape();
    ShipRenderers.drawDubProjectile(shape.graphics, amplitude);

    // Use fixed values based on the drawn rectangle
    shape.regY = 3; // center Y
    shape.regX = amplitude / 2; // center X
    shape.rotation = this.angle;

    const angleRad = degreesToRadians(shape.rotation + 270);
    const offsetX = this.playerPosition.x +
      Math.cos(angleRad) * 3.5 -
      Math.cos(angleRad) * amplitude / 2;
    const offsetY = this.playerPosition.y +
      Math.sin(angleRad) * 3.5 -
      Math.sin(angleRad) * amplitude / 2;

    shape.x = offsetX + 2.5 * this.flip;
    shape.y = offsetY + 2.5 * this.flip;
    shape.alpha = 0.7;

    this.stage.addChild(shape);

    const projectile: Projectile = {
      shape,
      rotation: this.angle,
      alpha: 0.7,
      velocityX: Math.cos(angleRad) * (this.speed / 2) * this.bulletSpeedMultiplier,
      velocityY: Math.sin(angleRad) * (this.speed / 2) * this.bulletSpeedMultiplier,
      amplitude
    };

    this.projectiles.push(projectile);
    this.flip *= -1;
  }

  private createCircleProjectile(): void {
    const config = this.weaponConfigs.get(WeaponType.CIRCLE)!;
    const shape = new createjs.Shape();
    ShipRenderers.drawCircleProjectile(shape.graphics, config.projectileSize!);

    shape.x = this.playerPosition.x;
    shape.y = this.playerPosition.y;
    shape.alpha = 0.9;

    this.stage.addChild(shape);

    const angleRad = degreesToRadians(this.angle + 270);
    const projectile: Projectile = {
      shape,
      rotation: this.angle,
      alpha: 0.9,
      velocityX: Math.cos(angleRad) * config.speed * this.bulletSpeedMultiplier,
      velocityY: Math.sin(angleRad) * config.speed * this.bulletSpeedMultiplier
    };

    this.projectiles.push(projectile);
  }

  private createScatterProjectile(): void {
    const config = this.weaponConfigs.get(WeaponType.SCATTER)!;
    const count = config.projectilesPerShot || 5;
    const spreadDeg = config.spreadAngle || 30;
    const halfSpread = spreadDeg / 2;

    for (let i = 0; i < count; i++) {
      const shape = new createjs.Shape();
      ShipRenderers.drawScatterProjectile(shape.graphics);

      shape.regY = 7; // center of 14px height
      shape.regX = 0;

      // Spread evenly across the spread angle
      const offsetAngle = count > 1
        ? -halfSpread + (spreadDeg / (count - 1)) * i
        : 0;
      const shotAngle = this.angle + offsetAngle;
      shape.rotation = shotAngle;
      shape.x = this.playerPosition.x;
      shape.y = this.playerPosition.y;
      shape.alpha = 0.9;

      this.stage.addChild(shape);

      const angleRad = degreesToRadians(shotAngle + 270);
      // Randomize speed slightly (90-110%)
      const speedVariation = 0.9 + Math.random() * 0.2;
      const projectile: Projectile = {
        shape,
        rotation: shotAngle,
        alpha: 0.9,
        velocityX: Math.cos(angleRad) * config.speed * this.bulletSpeedMultiplier * speedVariation,
        velocityY: Math.sin(angleRad) * config.speed * this.bulletSpeedMultiplier * speedVariation
      };

      this.projectiles.push(projectile);
    }
  }

  private createHomingProjectile(): void {
    const config = this.weaponConfigs.get(WeaponType.HOMING)!;
    const shape = new createjs.Shape();
    ShipRenderers.drawHomingProjectile(shape.graphics);

    shape.regY = 0;
    shape.regX = 0;
    shape.rotation = this.angle;
    shape.x = this.playerPosition.x;
    shape.y = this.playerPosition.y;
    shape.alpha = 0.95;

    this.stage.addChild(shape);

    const angleRad = degreesToRadians(this.angle + 270);
    const projectile: Projectile = {
      shape,
      rotation: this.angle,
      alpha: 0.95,
      velocityX: Math.cos(angleRad) * config.speed * this.bulletSpeedMultiplier,
      velocityY: Math.sin(angleRad) * config.speed * this.bulletSpeedMultiplier,
      isHoming: true
    };

    this.projectiles.push(projectile);
  }

  private updateProjectiles(): void {
    if (this.type === WeaponType.DUB) {
      this.updateDubCycle();
    }

    // Clear beam connector at the start of each frame
    this.beamConnector.graphics.clear();

    // Collect circle projectiles for beam drawing
    const circleProjectiles: Projectile[] = [];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      // Homing steering
      if (projectile.isHoming && this.enemyPositions.length > 0) {
        this.steerHomingProjectile(projectile);
      }

      // Update position
      if (this.type === WeaponType.LASER && !projectile.isHoming && !projectile.amplitude) {
        projectile.shape.x += projectile.velocityX * (1 - Math.random() * 0.25);
        projectile.shape.y += projectile.velocityY * (1 - Math.random() * 0.25);
      } else {
        projectile.shape.x += projectile.velocityX;
        projectile.shape.y += projectile.velocityY;

        if (this.type === WeaponType.DUB && projectile.amplitude) {
          projectile.shape.scaleX = this.cycle * this.flip;
        }
      }

      // Fade out (slower for circles and homing)
      let fadeRate = 0.02;
      if (projectile.isHoming) {
        fadeRate = 0.004;
      } else if (this.type === WeaponType.CIRCLE) {
        fadeRate = 0.005;
      } else if (this.type === WeaponType.LASER) {
        fadeRate = 0.015;
      } else if (this.type === WeaponType.SCATTER) {
        fadeRate = 0.012;
      }
      projectile.shape.alpha -= fadeRate;

      // Remove if out of bounds or faded
      if (this.isProjectileOutOfBounds(projectile.shape) || projectile.shape.alpha <= 0) {
        this.stage.removeChild(projectile.shape);
        this.projectiles.splice(i, 1);
      } else if (this.type === WeaponType.CIRCLE) {
        // Collect circle projectiles that are still active
        circleProjectiles.push(projectile);
      }

      // Emit projectile trail particles
      if (this.particleSystem && projectile.shape.alpha > 0.3) {
        let trailColor = 'rgba(107, 233, 255, 0.4)';
        if (this.type === WeaponType.CIRCLE) {
          trailColor = 'rgba(138, 43, 226, 0.4)';
        } else if (projectile.isHoming) {
          trailColor = 'rgba(255, 0, 255, 0.4)';
        } else if (this.type === WeaponType.SCATTER) {
          trailColor = 'rgba(255, 102, 0, 0.4)';
        }
        this.particleSystem.emitProjectileTrail(
          projectile.shape.x, projectile.shape.y, trailColor
        );
      }
    }

    // Draw beam connections for circle weapon
    if (this.type === WeaponType.CIRCLE && circleProjectiles.length > 1) {
      this.drawBeamConnections(circleProjectiles);
    }
  }

  private steerHomingProjectile(projectile: Projectile): void {
    const config = this.weaponConfigs.get(WeaponType.HOMING)!;
    const trackingRange = config.trackingRange || 200;
    const trackingStrength = config.trackingStrength || 0.08;

    // Find nearest enemy within tracking range
    let nearestDist = Infinity;
    let nearestEnemy: Position | null = null;

    for (const enemy of this.enemyPositions) {
      const dx = enemy.x - projectile.shape.x;
      const dy = enemy.y - projectile.shape.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < trackingRange && dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (!nearestEnemy) return;

    // Calculate desired direction
    const dx = nearestEnemy.x - projectile.shape.x;
    const dy = nearestEnemy.y - projectile.shape.y;
    const desiredAngle = Math.atan2(dy, dx);

    // Current velocity angle
    const currentAngle = Math.atan2(projectile.velocityY, projectile.velocityX);

    // Calculate angle difference and steer
    let angleDiff = desiredAngle - currentAngle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Apply tracking strength
    const steerAngle = currentAngle + angleDiff * trackingStrength;
    const speed = Math.sqrt(projectile.velocityX ** 2 + projectile.velocityY ** 2);

    projectile.velocityX = Math.cos(steerAngle) * speed;
    projectile.velocityY = Math.sin(steerAngle) * speed;

    // Update visual rotation to match direction
    projectile.shape.rotation = (steerAngle * 180 / Math.PI) - 90;
  }

  private updateDubCycle(): void {
    if (this.cycle < this.cycleMax && !this.cycleDown) {
      this.cycle += 0.001;
    } else {
      this.cycleDown = true;
    }

    if (this.cycleDown && this.cycle > 0) {
      this.cycle -= 0.001;
    }

    if (this.cycle <= 0) {
      this.cycleDown = false;
    }

    if (!this.firing && this.cycle > 0.4) {
      this.cycleDown = true;
      this.cycle -= 0.001;
    }
  }

  private isProjectileOutOfBounds(shape: createjs.Shape): boolean {
    return shape.x < 0 ||
           shape.x > window.innerWidth ||
           shape.y < 0 ||
           shape.y > window.innerHeight;
  }

  public startFiring(): void {
    this.firing = true;
  }

  public stopFiring(): void {
    this.firing = false;
  }

  public updatePositions(playerPos: Position, mousePos: Position): void {
    this.playerPosition = playerPos;
    this.mousePosition = mousePos;
  }

  public setType(type: WeaponType): void {
    this.type = type;
  }

  public getProjectiles(): WeaponProjectile[] {
    return this.projectiles;
  }

  private updateAmmo(): void {
    const deltaTime = 1 / gameConfig.fps; // Frame time in seconds

    // Regenerate ammo for all weapon types
    for (const [weaponType, config] of this.weaponConfigs.entries()) {
      const ammo = this.weaponAmmo.get(weaponType)!;

      if (ammo.current < ammo.max) {
        ammo.regenTimer += deltaTime;
        const ammoToRegen = ammo.regenTimer * config.ammoRegenRate;

        if (ammoToRegen >= 1) {
          const ammoGained = Math.floor(ammoToRegen);
          ammo.current = Math.min(ammo.max, ammo.current + ammoGained);
          ammo.regenTimer = ammoToRegen - ammoGained; // Keep fractional part
        }
      } else {
        ammo.regenTimer = 0; // Reset timer when full
      }
    }
  }

  private canFire(): boolean {
    const currentTime = Date.now() / 1000;
    const config = this.weaponConfigs.get(this.type)!;
    const ammo = this.weaponAmmo.get(this.type)!;
    const lastShot = this.lastShotTime.get(this.type) || 0;

    const hasAmmo = ammo.current >= config.ammoConsumption;
    const adjustedCooldown = config.shotCooldown * this.fireRateMultiplier;
    const cooldownReady = (currentTime - lastShot) >= adjustedCooldown;
    const hasProjectileSpace = this.projectiles.length < config.limit;

    return hasAmmo && cooldownReady && hasProjectileSpace;
  }

  public getCurrentAmmo(): number {
    const ammo = this.weaponAmmo.get(this.type)!;
    return ammo.current;
  }

  public getMaxAmmo(): number {
    const ammo = this.weaponAmmo.get(this.type)!;
    return ammo.max;
  }

  public getAmmoPercentage(): number {
    const ammo = this.weaponAmmo.get(this.type)!;
    return ammo.current / ammo.max;
  }

  public getType(): WeaponType {
    return this.type;
  }

  public refillAllAmmo(): void {
    // Refill ammo for all weapon types
    for (const [weaponType, config] of this.weaponConfigs.entries()) {
      const ammo = this.weaponAmmo.get(weaponType)!;
      ammo.current = ammo.max;
      ammo.regenTimer = 0;
    }
  }

  public applyUpgrades(bulletSpeedMultiplier: number, fireRateMultiplier: number, extraBulletsBonus: number): void {
    this.bulletSpeedMultiplier = bulletSpeedMultiplier;
    this.fireRateMultiplier = fireRateMultiplier;

    // Only update if extra bullets changed
    if (this.extraBulletsBonus !== extraBulletsBonus) {
      const oldBonus = this.extraBulletsBonus;
      this.extraBulletsBonus = extraBulletsBonus;

      // Update max ammo for all weapon types
      for (const [weaponType, config] of this.weaponConfigs.entries()) {
        const ammo = this.weaponAmmo.get(weaponType)!;
        const baseMax = config.maxAmmo;
        const newMax = baseMax + extraBulletsBonus;
        const difference = newMax - ammo.max;

        ammo.max = newMax;
        // Add the difference to current ammo too (so they get the bullets immediately)
        ammo.current = Math.min(newMax, ammo.current + Math.max(0, difference));
      }
    }
  }

  private drawBeamConnections(circleProjectiles: Projectile[]): void {
    // Sort projectiles by distance from player (closest first)
    const sortedProjectiles = circleProjectiles.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.shape.x - this.playerPosition.x, 2) +
        Math.pow(a.shape.y - this.playerPosition.y, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.shape.x - this.playerPosition.x, 2) +
        Math.pow(b.shape.y - this.playerPosition.y, 2)
      );
      return distA - distB;
    });

    // Draw connections between consecutive projectiles
    this.beamConnector.graphics.setStrokeStyle(12, 'round', 'round');

    for (let i = 0; i < sortedProjectiles.length - 1; i++) {
      const current = sortedProjectiles[i];
      const next = sortedProjectiles[i + 1];

      // Calculate distance between projectiles
      const dx = next.shape.x - current.shape.x;
      const dy = next.shape.y - current.shape.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only connect if within 60 pixels
      if (distance <= 60) {
        // Calculate alpha based on the average of the two projectiles
        const avgAlpha = (current.shape.alpha + next.shape.alpha) / 2 * 0.7;

        // Draw the beam segment
        this.beamConnector.graphics
          .beginStroke(`rgba(138, 43, 226, ${avgAlpha})`)
          .moveTo(current.shape.x, current.shape.y)
          .lineTo(next.shape.x, next.shape.y);
      }
    }

    // Optional: Connect first projectile to player
    if (sortedProjectiles.length > 0) {
      const first = sortedProjectiles[0];
      const dx = first.shape.x - this.playerPosition.x;
      const dy = first.shape.y - this.playerPosition.y;
      const distToPlayer = Math.sqrt(dx * dx + dy * dy);

      // Only connect if within 25 pixels of player
      if (distToPlayer <= 25) {
        this.beamConnector.graphics
          .beginStroke(`rgba(138, 43, 226, ${first.shape.alpha * 0.5})`)
          .moveTo(this.playerPosition.x, this.playerPosition.y)
          .lineTo(first.shape.x, first.shape.y);
      }
    }
  }
}
