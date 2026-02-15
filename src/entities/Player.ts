import * as createjs from '@thegraid/createjs-module';
import { GameEntity, Position, Velocity } from '@types';
import { gameConfig } from '@config/gameConfig';
import { ShipRenderers } from '@rendering/ShipRenderers';
import { ParticleSystem } from '@rendering/ParticleSystem';

export class Player implements GameEntity {
  public shape: createjs.Shape;
  public position: Position;
  public velocity: Velocity;
  public angle: number = 0;

  private acceleration: { x: number; y: number };
  private negDirection: { x: number; y: number };
  private blurFilterX: createjs.BlurFilter;
  private blurFilterY: createjs.BlurFilter;
  private stage: createjs.Stage;
  private particleSystem: ParticleSystem | null = null;

  // Health system
  private maxHealth: number;
  private currentHealth: number;
  private isInvulnerable: boolean = false;
  private invulnerabilityTimer: number = 0;
  private damageFlashTimer: number = 0;

  // Speed multiplier from upgrades
  private speedMultiplier: number = 1.0;

  constructor(stage: createjs.Stage, x: number, y: number) {
    this.stage = stage;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.acceleration = {
      x: gameConfig.player.acceleration,
      y: gameConfig.player.acceleration
    };
    this.negDirection = { x: 1, y: 1 };

    // Initialize health
    this.maxHealth = gameConfig.player.maxHealth;
    this.currentHealth = this.maxHealth;

    // Create player shape with polygon ship
    this.shape = new createjs.Shape();
    ShipRenderers.drawPlayer(this.shape.graphics);

    this.shape.regX = 0;
    this.shape.regY = 0;
    this.shape.x = window.innerWidth / 2;
    this.shape.y = window.innerHeight / 2;

    // Create blur filters
    this.blurFilterX = new createjs.BlurFilter(120, 0, 1);
    this.blurFilterY = new createjs.BlurFilter(0, 120, 1);

    stage.addChild(this.shape);

    this.position.x = this.shape.x;
    this.position.y = this.shape.y;
  }

  public setParticleSystem(ps: ParticleSystem): void {
    this.particleSystem = ps;
  }

  public update(): void {
    const deltaTime = 1 / gameConfig.fps;

    // Update invulnerability timer
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= deltaTime;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Update damage flash timer
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= deltaTime;
    }

    this.shape.rotation = this.angle;
    this.shape.filters = [];

    // Update position
    this.shape.x = this.position.x;
    this.shape.y = this.position.y;

    // Apply visual effects
    this.updateVisualEffects();

    // Emit engine trail when moving
    if (this.particleSystem) {
      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (speed > 2) {
        this.particleSystem.emitEngineTrail(
          this.position.x,
          this.position.y,
          this.shape.rotation
        );
      }
    }

    // Cache the shape if filters are applied
    if (this.shape.filters && this.shape.filters.length > 0) {
      this.shape.cache(-20, -20, 40, 40);
    } else {
      this.shape.uncache();
    }
  }

  public handleMovement(keys: Set<string>): void {
    // Get actual canvas bounds from the stage
    const canvas = this.stage.canvas as HTMLCanvasElement;
    const playerRadius = 14; // Player shape radius
    const minX = playerRadius;
    const maxX = canvas.width - playerRadius;
    const minY = playerRadius;
    const maxY = canvas.height - playerRadius;

    // Vertical movement
    if (keys.has('ArrowUp') || keys.has('KeyW') || keys.has('ArrowDown') || keys.has('KeyS')) {
      this.shape.filters = [this.blurFilterY];

      if (keys.has('ArrowUp') || keys.has('KeyW')) {
        this.position.y -= this.velocity.y;
        this.accelerateY();
        this.negDirection.y = -1;
      }

      if (keys.has('ArrowDown') || keys.has('KeyS')) {
        this.position.y += this.velocity.y;
        this.accelerateY();
        this.negDirection.y = 1;
      }
    } else if (this.velocity.y > 0.005) {
      this.velocity.y -= this.velocity.y / 15;
      this.position.y += this.velocity.y * this.negDirection.y;
      if (this.acceleration.y > 0.05) {
        this.acceleration.y -= this.acceleration.y / 30;
      }
    } else {
      this.velocity.y = 0;
    }

    // Horizontal movement
    if (keys.has('ArrowLeft') || keys.has('KeyA') || keys.has('ArrowRight') || keys.has('KeyD')) {
      this.shape.filters = [this.blurFilterX];

      if (keys.has('ArrowLeft') || keys.has('KeyA')) {
        this.position.x -= this.velocity.x;
        this.accelerateX();
        this.negDirection.x = -1;
      }

      if (keys.has('ArrowRight') || keys.has('KeyD')) {
        this.position.x += this.velocity.x;
        this.accelerateX();
        this.negDirection.x = 1;
      }
    } else if (this.velocity.x > 0.005) {
      this.velocity.x -= this.velocity.x / 15;
      this.position.x += this.velocity.x * this.negDirection.x;
      if (this.acceleration.x > 0.05) {
        this.acceleration.x -= this.acceleration.x / 30;
      }
    } else {
      this.velocity.x = 0;
    }

    // Clamp position to canvas bounds
    this.position.x = Math.max(minX, Math.min(maxX, this.position.x));
    this.position.y = Math.max(minY, Math.min(maxY, this.position.y));

    // Stop velocity only in the direction of the boundary hit
    if ((this.position.x <= minX && this.negDirection.x < 0) ||
        (this.position.x >= maxX && this.negDirection.x > 0)) {
      this.velocity.x = 0;
      this.acceleration.x = gameConfig.player.acceleration;
    }
    if ((this.position.y <= minY && this.negDirection.y < 0) ||
        (this.position.y >= maxY && this.negDirection.y > 0)) {
      this.velocity.y = 0;
      this.acceleration.y = gameConfig.player.acceleration;
    }
  }

  private accelerateY(): void {
    const { maxVelocity, maxAcceleration } = gameConfig.player;
    const effectiveMaxVelocity = maxVelocity * this.speedMultiplier;

    if (this.velocity.y < effectiveMaxVelocity) {
      this.velocity.y += this.acceleration.y;
      if (this.acceleration.y < maxAcceleration) {
        this.acceleration.y += this.acceleration.y / 4;
      }
    } else if (this.velocity.y >= effectiveMaxVelocity) {
      this.acceleration.y = 0.05;
    }
  }

  private accelerateX(): void {
    const { maxVelocity, maxAcceleration } = gameConfig.player;
    const effectiveMaxVelocity = maxVelocity * this.speedMultiplier;

    if (this.velocity.x < effectiveMaxVelocity) {
      this.velocity.x += this.acceleration.x;
      if (this.acceleration.x < maxAcceleration) {
        this.acceleration.x += this.acceleration.x / 4;
      }
    }
  }

  public setAngle(angle: number): void {
    this.angle = angle;
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  // Health system methods
  public takeDamage(amount: number): boolean {
    if (this.isInvulnerable) return false;

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.isInvulnerable = true;
    this.invulnerabilityTimer = gameConfig.player.invulnerabilityDuration;
    this.damageFlashTimer = 0.2; // Flash for 0.2 seconds

    return true; // Damage was applied
  }

  public addHealth(amount: number): number {
    const oldHealth = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    return this.currentHealth - oldHealth; // Return actual health gained
  }

  public isAlive(): boolean {
    return this.currentHealth > 0;
  }

  public getHealthPercentage(): number {
    return this.currentHealth / this.maxHealth;
  }

  public getCurrentHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public getIsInvulnerable(): boolean {
    return this.isInvulnerable;
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  public setMaxHealth(newMax: number): void {
    const ratio = this.currentHealth / this.maxHealth;
    this.maxHealth = newMax;
    this.currentHealth = Math.round(newMax * ratio);
  }

  private updateVisualEffects(): void {
    const isFlashing = this.damageFlashTimer > 0;

    // Redraw ship with appropriate flash state
    this.shape.graphics.clear();
    ShipRenderers.drawPlayer(this.shape.graphics, isFlashing);

    // Semi-transparent when invulnerable (and not flashing)
    if (!isFlashing && this.isInvulnerable) {
      this.shape.alpha = 0.6;
    } else {
      this.shape.alpha = 1.0;
    }
  }
}
