import * as createjs from '@thegraid/createjs-module';
import { GameEntity, Position, Velocity } from '@types';
import { gameConfig } from '@config/gameConfig';

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
  
  // Health system
  private maxHealth: number;
  private currentHealth: number;
  private isInvulnerable: boolean = false;
  private invulnerabilityTimer: number = 0;
  private damageFlashTimer: number = 0;

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
    
    // Create player shape (diamond)
    this.shape = new createjs.Shape();
    this.shape.graphics
      .beginFill("rgb(0, 180, 174)")
      .drawPolyStar(0, 0, 14, 2, 0.7, 90);
    
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
    
    if (this.velocity.y < maxVelocity) {
      this.velocity.y += this.acceleration.y;
      if (this.acceleration.y < maxAcceleration) {
        this.acceleration.y += this.acceleration.y / 4;
      }
    } else if (this.velocity.y >= maxVelocity) {
      this.acceleration.y = 0.05;
    }
  }

  private accelerateX(): void {
    const { maxVelocity, maxAcceleration } = gameConfig.player;
    
    if (this.velocity.x < maxVelocity) {
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

  private updateVisualEffects(): void {
    // Damage flash effect
    if (this.damageFlashTimer > 0) {
      // Flash red when damaged
      this.shape.graphics.clear();
      this.shape.graphics
        .beginFill("rgb(255, 100, 100)")
        .drawPolyStar(0, 0, 14, 2, 0.7, 90);
    } else {
      // Normal color with invulnerability transparency
      this.shape.graphics.clear();
      this.shape.graphics
        .beginFill("rgb(0, 180, 174)")
        .drawPolyStar(0, 0, 14, 2, 0.7, 90);
      
      // Semi-transparent when invulnerable
      if (this.isInvulnerable) {
        this.shape.alpha = 0.6;
      } else {
        this.shape.alpha = 1.0;
      }
    }
  }
}