import * as createjs from '@thegraid/createjs-module';
import { ParticleEmitConfig } from '@types';

interface Particle {
  shape: createjs.Shape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  active: boolean;
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private container: createjs.Container;
  private maxParticles: number;
  private frameCounter: number = 0;

  constructor(stage: createjs.Stage, maxParticles: number = 200) {
    this.maxParticles = maxParticles;
    this.container = new createjs.Container();
    stage.addChild(this.container);

    // Pre-allocate particle pool
    for (let i = 0; i < maxParticles; i++) {
      const shape = new createjs.Shape();
      shape.visible = false;
      this.container.addChild(shape);
      this.pool.push({
        shape,
        x: 0, y: 0,
        vx: 0, vy: 0,
        life: 0, maxLife: 0,
        size: 1,
        color: '#fff',
        alpha: 1,
        active: false
      });
    }
  }

  public emit(config: ParticleEmitConfig): void {
    const angleMin = config.angleMin ?? 0;
    const angleMax = config.angleMax ?? Math.PI * 2;
    const fadeOut = config.fadeOut !== false;

    for (let i = 0; i < config.count; i++) {
      const particle = this.getAvailableParticle();
      if (!particle) return; // Pool exhausted

      const angle = angleMin + Math.random() * (angleMax - angleMin);
      const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
      const lifetime = config.lifetimeMin + Math.random() * (config.lifetimeMax - config.lifetimeMin);
      const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);

      particle.x = config.x;
      particle.y = config.y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = lifetime;
      particle.maxLife = lifetime;
      particle.size = size;
      particle.color = config.color;
      particle.alpha = 1;
      particle.active = true;

      // Draw particle
      particle.shape.graphics.clear();
      particle.shape.graphics
        .beginFill(config.color)
        .drawCircle(0, 0, size);
      particle.shape.x = config.x;
      particle.shape.y = config.y;
      particle.shape.alpha = 1;
      particle.shape.visible = true;
    }
  }

  public update(): void {
    this.frameCounter++;

    for (const particle of this.pool) {
      if (!particle.active) continue;

      // Move
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Decay
      particle.life--;

      // Fade alpha based on remaining life
      particle.alpha = Math.max(0, particle.life / particle.maxLife);

      // Update shape
      particle.shape.x = particle.x;
      particle.shape.y = particle.y;
      particle.shape.alpha = particle.alpha;

      // Recycle dead particles
      if (particle.life <= 0) {
        particle.active = false;
        particle.shape.visible = false;
      }
    }
  }

  private getAvailableParticle(): Particle | null {
    // Find inactive particle
    for (const particle of this.pool) {
      if (!particle.active) return particle;
    }

    // Pool full — recycle oldest (lowest life)
    let oldest: Particle | null = null;
    let lowestLife = Infinity;
    for (const particle of this.pool) {
      if (particle.life < lowestLife) {
        lowestLife = particle.life;
        oldest = particle;
      }
    }
    return oldest;
  }

  /** Emit engine trail behind the player. */
  public emitEngineTrail(x: number, y: number, angle: number): void {
    // angle is the player's rotation in degrees; exhaust goes opposite of heading
    const rad = (angle - 90) * (Math.PI / 180); // Convert to radians, offset for "up"
    const exhaustX = x + Math.cos(rad) * 14; // Behind the ship
    const exhaustY = y + Math.sin(rad) * 14;

    this.emit({
      x: exhaustX,
      y: exhaustY,
      count: 2,
      speedMin: 0.5,
      speedMax: 1.5,
      lifetimeMin: 12,
      lifetimeMax: 20,
      sizeMin: 1,
      sizeMax: 2.5,
      color: 'rgba(100, 255, 240, 0.7)',
      angleMin: rad - 0.4,
      angleMax: rad + 0.4
    });
  }

  /** Emit explosion at enemy death position. */
  public emitExplosion(x: number, y: number, color: string = 'rgba(255, 120, 50, 0.8)', count: number = 15): void {
    this.emit({
      x, y,
      count,
      speedMin: 1.5,
      speedMax: 4.5,
      lifetimeMin: 15,
      lifetimeMax: 35,
      sizeMin: 1.5,
      sizeMax: 4,
      color
    });
  }

  /** Emit hit sparks when enemy takes damage. */
  public emitHitSpark(x: number, y: number): void {
    this.emit({
      x, y,
      count: 5,
      speedMin: 1,
      speedMax: 3,
      lifetimeMin: 6,
      lifetimeMax: 12,
      sizeMin: 1,
      sizeMax: 2,
      color: 'rgba(255, 220, 150, 0.9)'
    });
  }

  /** Emit sparkle burst on XP orb collection. */
  public emitXPCollect(x: number, y: number): void {
    this.emit({
      x, y,
      count: 8,
      speedMin: 1,
      speedMax: 3,
      lifetimeMin: 10,
      lifetimeMax: 18,
      sizeMin: 1,
      sizeMax: 2.5,
      color: 'rgba(0, 255, 136, 0.8)'
    });
  }

  /** Emit faint trail behind a projectile (call every 2-3 frames). */
  public emitProjectileTrail(x: number, y: number, color: string): void {
    if (this.frameCounter % 3 !== 0) return; // Every 3rd frame
    this.emit({
      x, y,
      count: 1,
      speedMin: 0,
      speedMax: 0.3,
      lifetimeMin: 6,
      lifetimeMax: 10,
      sizeMin: 0.8,
      sizeMax: 1.5,
      color
    });
  }

  /** Emit kick burst. */
  public emitKickBurst(x: number, y: number): void {
    this.emit({
      x, y,
      count: 18,
      speedMin: 2,
      speedMax: 5,
      lifetimeMin: 12,
      lifetimeMax: 22,
      sizeMin: 1.5,
      sizeMax: 3.5,
      color: 'rgba(120, 200, 220, 0.7)'
    });
  }

  public getContainer(): createjs.Container {
    return this.container;
  }

  public reset(): void {
    for (const particle of this.pool) {
      particle.active = false;
      particle.shape.visible = false;
    }
  }

  public destroy(): void {
    this.container.parent?.removeChild(this.container);
  }
}
