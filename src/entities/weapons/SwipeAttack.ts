import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position } from '@types';

export class SwipeAttack implements GameObject {
  private stage: createjs.Stage;
  private shape: createjs.Shape;
  private enemyPosition: Position;
  private playerPosition: Position;
  
  private active: boolean = false;
  private revealProgress: number = 0; // 0 to 1 for horizontal reveal
  private maxRadius: number = 42; // Final half circle radius (30% bigger than 30px)
  private animationDuration: number = 0.3; // 0.3 seconds for reveal and fade
  private elapsed: number = 0;
  private angle: number = 0; // Direction toward player
  private revealDirection: number = 1; // 1 for left-to-right, -1 for right-to-left
  
  constructor(stage: createjs.Stage) {
    this.stage = stage;
    this.enemyPosition = { x: 0, y: 0 };
    this.playerPosition = { x: 0, y: 0 };
    
    // Create the swipe shape
    this.shape = new createjs.Shape();
    this.shape.alpha = 0;
    stage.addChild(this.shape);
  }

  public update(): void {
    if (!this.active) return;
    
    const deltaTime = 1 / 55; // Game runs at 55 FPS
    this.elapsed += deltaTime;
    
    if (this.elapsed <= this.animationDuration) {
      // Reveal phase - horizontal reveal and then fade
      this.revealProgress = this.elapsed / this.animationDuration;
      this.drawSwipe();
      
      // Fade out during the same 0.3 seconds
      this.shape.alpha = 1 - this.revealProgress;
    } else {
      // Animation complete
      this.reset();
    }
    
    // Position is updated by the enemy via updatePosition method
  }

  public trigger(enemyPosition: Position, playerPosition: Position): void {
    if (this.active) return; // Already active
    
    this.active = true;
    this.elapsed = 0;
    this.revealProgress = 0;
    this.enemyPosition = { ...enemyPosition };
    this.playerPosition = { ...playerPosition };
    
    // Calculate angle toward player
    const dx = playerPosition.x - enemyPosition.x;
    const dy = playerPosition.y - enemyPosition.y;
    this.angle = Math.atan2(dy, dx);
    
    // Determine reveal direction based on player position relative to enemy
    // If player is to the right of enemy, reveal left-to-right (1)
    // If player is to the left of enemy, reveal right-to-left (-1)
    this.revealDirection = dx >= 0 ? 1 : -1;
    
    // Position at enemy location
    this.shape.x = enemyPosition.x;
    this.shape.y = enemyPosition.y;
    this.shape.alpha = 1;
    
    // Start the reveal animation
    this.drawSwipe();
  }

  private drawSwipe(): void {
    this.shape.graphics.clear();
    
    if (this.revealProgress === 0) {
      // Draw initial 2px dot
      this.shape.graphics
        .setStrokeStyle(2)
        .beginStroke('#ff0000')
        .drawCircle(0, 0, 1);
    } else {
      // Draw half circle with horizontal reveal effect
      const startAngle = this.angle - Math.PI / 2; // 90 degrees left of direction
      const endAngle = this.angle + Math.PI / 2;   // 90 degrees right of direction
      
      // Calculate how much of the arc to reveal based on progress and direction
      let currentStartAngle = startAngle;
      let currentEndAngle = endAngle;
      
      if (this.revealDirection === 1) {
        // Left-to-right reveal
        currentEndAngle = startAngle + (endAngle - startAngle) * this.revealProgress;
      } else {
        // Right-to-left reveal
        currentStartAngle = endAngle - (endAngle - startAngle) * this.revealProgress;
      }
      
      this.shape.graphics
        .setStrokeStyle(2)
        .beginStroke('#ff0000')
        .arc(0, 0, this.maxRadius, currentStartAngle, currentEndAngle, false);
    }
  }

  private reset(): void {
    this.active = false;
    this.elapsed = 0;
    this.revealProgress = 0;
    this.shape.alpha = 0;
    this.shape.graphics.clear();
  }

  public isActive(): boolean {
    return this.active && this.revealProgress > 0;
  }

  public checkCollision(position: Position, radius: number): boolean {
    if (!this.isActive()) return false;
    
    // Calculate distance from swipe center (enemy position) to target
    const dx = position.x - this.enemyPosition.x;
    const dy = position.y - this.enemyPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if within swipe radius
    if (distance > this.maxRadius + radius) return false;
    
    // Check if position is within the revealed portion of the half-circle arc
    const angleToTarget = Math.atan2(dy, dx);
    const startAngle = this.angle - Math.PI / 2;
    const endAngle = this.angle + Math.PI / 2;
    
    // Calculate revealed arc bounds
    let revealedStartAngle = startAngle;
    let revealedEndAngle = endAngle;
    
    if (this.revealDirection === 1) {
      // Left-to-right reveal
      revealedEndAngle = startAngle + (endAngle - startAngle) * this.revealProgress;
    } else {
      // Right-to-left reveal
      revealedStartAngle = endAngle - (endAngle - startAngle) * this.revealProgress;
    }
    
    // Normalize angles to [0, 2π] range for comparison
    const normalizeAngle = (angle: number) => {
      while (angle < 0) angle += 2 * Math.PI;
      while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
      return angle;
    };
    
    const normTarget = normalizeAngle(angleToTarget);
    const normStart = normalizeAngle(revealedStartAngle);
    const normEnd = normalizeAngle(revealedEndAngle);
    
    // Check if angle is within the revealed arc
    if (normStart <= normEnd) {
      return normTarget >= normStart && normTarget <= normEnd;
    } else {
      // Handle wrap-around case
      return normTarget >= normStart || normTarget <= normEnd;
    }
  }

  public getDamage(): number {
    return 15; // Swipe attack damage
  }

  public updatePosition(enemyPosition: Position): void {
    this.enemyPosition = { ...enemyPosition };
    this.shape.x = enemyPosition.x;
    this.shape.y = enemyPosition.y;
  }

  public checkPlayerCollision(playerPosition: Position, playerRadius: number = 14): boolean {
    return this.checkCollision(playerPosition, playerRadius);
  }

  public destroy(): void {
    this.stage.removeChild(this.shape);
  }
}