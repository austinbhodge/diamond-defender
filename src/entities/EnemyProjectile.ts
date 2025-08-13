import * as createjs from '@thegraid/createjs-module';
import { GameEntity, Position, Velocity } from '../types/index';
import { gameConfig } from '@config/gameConfig';

export class EnemyProjectile implements GameEntity {
  public shape: createjs.Shape;
  public position: Position;
  public velocity: Velocity;
  
  private stage: createjs.Stage;
  private lifetime: number;
  private maxLifetime: number;
  private damage: number;
  private isActive: boolean = true;

  constructor(
    stage: createjs.Stage, 
    startX: number, 
    startY: number, 
    targetX: number, 
    targetY: number,
    projectileSpeed?: number,
    projectileDamage?: number,
    projectileLifetime?: number
  ) {
    this.stage = stage;
    this.position = { x: startX, y: startY };
    
    // Calculate direction toward target
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    const speed = projectileSpeed || gameConfig.enemy.circleAttack.projectileSpeed;
    this.velocity = {
      x: normalizedDx * speed,
      y: normalizedDy * speed
    };
    
    this.damage = projectileDamage || gameConfig.enemy.circleAttack.projectileDamage;
    this.maxLifetime = projectileLifetime || gameConfig.enemy.circleAttack.projectileLifetime;
    this.lifetime = 0;
    
    // Create projectile visual
    this.shape = new createjs.Shape();
    this.updateVisual();
    
    this.shape.x = startX;
    this.shape.y = startY;
    
    stage.addChild(this.shape);
  }

  public update(): void {
    if (!this.isActive) return;
    
    const deltaTime = 1 / gameConfig.fps;
    this.lifetime += deltaTime;
    
    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    
    // Update shape position
    this.shape.x = this.position.x;
    this.shape.y = this.position.y;
    
    // Update visual with fading effect as lifetime progresses
    this.updateVisual();
    
    // Check if projectile should be destroyed
    if (this.lifetime >= this.maxLifetime || this.isOutOfBounds()) {
      this.isActive = false;
    }
  }

  private updateVisual(): void {
    const lifetimePercentage = this.lifetime / this.maxLifetime;
    const alpha = 1 - (lifetimePercentage * 0.3); // Slight fade over time
    const size = 4 + Math.sin(this.lifetime * 8) * 0.5; // Subtle pulsing effect
    
    this.shape.graphics.clear();
    
    // Outer glow
    this.shape.graphics
      .beginFill(`rgba(255, 100, 50, ${alpha * 0.3})`)
      .drawCircle(0, 0, size + 2);
    
    // Main projectile body
    this.shape.graphics
      .beginFill(`rgba(255, 120, 60, ${alpha})`)
      .drawCircle(0, 0, size);
    
    // Bright center
    this.shape.graphics
      .beginFill(`rgba(255, 200, 150, ${alpha})`)
      .drawCircle(0, 0, size * 0.4);
  }

  private isOutOfBounds(): boolean {
    const dims = gameConfig.canvas;
    const buffer = 50; // Allow projectiles to travel a bit off-screen
    
    return (
      this.position.x < -buffer ||
      this.position.x > dims.width + buffer ||
      this.position.y < -buffer ||
      this.position.y > dims.height + buffer
    );
  }

  public isAlive(): boolean {
    return this.isActive;
  }

  public getDamage(): number {
    return this.damage;
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public destroy(): void {
    this.isActive = false;
    this.stage.removeChild(this.shape);
  }

  public getRadius(): number {
    return 4; // Collision radius
  }
}