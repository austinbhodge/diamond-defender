import * as createjs from '@thegraid/createjs-module';
import { GameEntity, Position, Velocity, EnemyAttackPattern } from '@types';
import { gameConfig } from '@config/gameConfig';
import { Player } from './Player';
import { EnemyProjectile } from './EnemyProjectile';

export class Enemy implements GameEntity {
  public shape: createjs.Shape;
  public position: Position;
  public velocity: Velocity;
  public hp: number;
  
  private maxHp: number;
  private speed: number;
  private acceleration: number;
  private angle: number = 0;
  private stage: createjs.Stage;
  private player: Player;
  private attackPattern: EnemyAttackPattern;
  private projectiles: EnemyProjectile[] = [];
  
  // Circle attack properties
  private circleAngle: number = 0;
  private lastShotTime: number = 0;
  private desiredRadius: number;
  
  // Health bar properties
  private healthBarContainer: createjs.Container | null = null;
  private healthBarBackground: createjs.Shape | null = null;
  private healthBarFill: createjs.Shape | null = null;
  private healthBarBorder: createjs.Shape | null = null;
  private healthBarVisible: boolean = false;
  private lastDamageTime: number = 0;

  constructor(stage: createjs.Stage, player: Player, x: number = 0, y: number = 0, hp?: number, speed?: number, attackPattern: EnemyAttackPattern = EnemyAttackPattern.CHASE) {
    this.stage = stage;
    this.player = player;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.attackPattern = attackPattern;
    
    // Set properties based on attack pattern
    if (attackPattern === EnemyAttackPattern.BIG_SHOOTER) {
      this.hp = hp || gameConfig.enemy.bigShooter.hp;
      this.speed = speed || gameConfig.enemy.bigShooter.speed;
    } else {
      this.hp = hp || gameConfig.enemy.hp;
      this.speed = speed || gameConfig.enemy.baseSpeed;
    }
    
    // Store max HP for health bar percentage calculation
    this.maxHp = this.hp;
    
    this.acceleration = gameConfig.enemy.acceleration;
    this.desiredRadius = gameConfig.enemy.circleAttack.radius;
    
    // Set random starting angle for circle pattern
    this.circleAngle = Math.random() * Math.PI * 2;
    
    // Create enemy shape based on attack pattern
    this.shape = new createjs.Shape();
    this.createVisual();
    
    this.shape.x = x;
    this.shape.y = y;
    
    stage.addChild(this.shape);
  }

  public update(): void {
    if (this.attackPattern === EnemyAttackPattern.CHASE) {
      this.updateChasePattern();
    } else if (this.attackPattern === EnemyAttackPattern.CIRCLE_SHOOT) {
      this.updateCirclePattern();
    } else if (this.attackPattern === EnemyAttackPattern.BIG_SHOOTER) {
      this.updateBigShooterPattern();
    }
    
    this.updatePosition();
    this.updateProjectiles();
    
    // Update shape position
    this.shape.x = this.position.x;
    this.shape.y = this.position.y;
    this.shape.rotation = this.angle;
    
    // Update health bar
    this.updateHealthBarPosition();
    this.checkHealthBarFade();
  }

  private updateChasePattern(): void {
    const playerPos = this.player.getPosition();
    
    // Calculate direction to player with more direct pursuit
    const dx = playerPos.x - this.position.x;
    const dy = playerPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      // Normalize direction and apply stronger acceleration
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      // More aggressive acceleration toward player
      this.velocity.x += normalizedDx * this.acceleration * 1.5;
      this.velocity.y += normalizedDy * this.acceleration * 1.5;
    }
    
    // Apply boundary forces to keep enemies on screen
    this.applyBoundaryForces();
    
    // Limit velocity to max speed
    const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (currentSpeed > this.speed) {
      const scale = this.speed / currentSpeed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }
    
    // Calculate rotation angle based on movement direction
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      this.angle = Math.atan2(this.velocity.y, this.velocity.x) * (180 / Math.PI) + 90;
    }
  }

  private updatePosition(): void {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
  }

  private applyBoundaryForces(): void {
    const margin = 50; // Distance from edge to start applying force
    const boundaryForce = 0.3; // Strength of boundary repulsion
    const canvasWidth = gameConfig.canvas.width;
    const canvasHeight = gameConfig.canvas.height;
    
    // Left boundary
    if (this.position.x < margin) {
      const force = (margin - this.position.x) / margin;
      this.velocity.x += boundaryForce * force;
    }
    
    // Right boundary
    if (this.position.x > canvasWidth - margin) {
      const force = (this.position.x - (canvasWidth - margin)) / margin;
      this.velocity.x -= boundaryForce * force;
    }
    
    // Top boundary
    if (this.position.y < margin) {
      const force = (margin - this.position.y) / margin;
      this.velocity.y += boundaryForce * force;
    }
    
    // Bottom boundary
    if (this.position.y > canvasHeight - margin) {
      const force = (this.position.y - (canvasHeight - margin)) / margin;
      this.velocity.y -= boundaryForce * force;
    }
  }

  public takeDamage(amount: number): void {
    this.hp -= amount;
    
    // Show and update health bar when damaged
    this.showHealthBar();
    this.updateHealthBarFill();
    
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  public destroy(): Position | null {
    // Clean up projectiles
    this.clearProjectiles();
    
    // Clean up health bar
    this.destroyHealthBar();
    
    // Return the position before destroying for orb spawning
    const deathPosition = { ...this.position };
    this.stage.removeChild(this.shape);
    return deathPosition;
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public isAlive(): boolean {
    return this.hp > 0;
  }

  private createVisual(): void {
    if (this.attackPattern === EnemyAttackPattern.CHASE) {
      // Red triangle for chase enemies
      this.shape.graphics
        .beginFill("rgb(126, 0, 0)")
        .drawPolyStar(0, 0, 7, 3, 2, 90);
    } else if (this.attackPattern === EnemyAttackPattern.CIRCLE_SHOOT) {
      // Orange/yellow triangle for circling enemies
      this.shape.graphics
        .beginFill("rgb(200, 100, 20)")
        .drawPolyStar(0, 0, 8, 3, 2, 90);
    } else if (this.attackPattern === EnemyAttackPattern.BIG_SHOOTER) {
      // Large red circle for big shooter enemies
      const size = gameConfig.enemy.bigShooter.size;
      
      // Outer glow
      this.shape.graphics
        .beginFill("rgba(200, 0, 0, 0.3)")
        .drawCircle(0, 0, size + 3);
      
      // Main body
      this.shape.graphics
        .beginFill("rgb(180, 0, 0)")
        .drawCircle(0, 0, size);
        
      // Inner highlight
      this.shape.graphics
        .beginFill("rgb(220, 50, 50)")
        .drawCircle(0, 0, size * 0.6);
    }
  }

  private updateCirclePattern(): void {
    const playerPos = this.player.getPosition();
    const currentTime = Date.now() / 1000;
    
    // Calculate desired position on circle around player with faster rotation
    this.circleAngle += gameConfig.enemy.circleAttack.angularSpeed * 1.5;
    const desiredX = playerPos.x + Math.cos(this.circleAngle) * this.desiredRadius;
    const desiredY = playerPos.y + Math.sin(this.circleAngle) * this.desiredRadius;
    
    // Clamp desired position to stay on screen
    const margin = 30;
    const clampedX = Math.max(margin, Math.min(gameConfig.canvas.width - margin, desiredX));
    const clampedY = Math.max(margin, Math.min(gameConfig.canvas.height - margin, desiredY));
    
    // Move toward desired circle position more aggressively
    const dx = clampedX - this.position.x;
    const dy = clampedY - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      // More aggressive movement
      this.velocity.x = normalizedDx * this.speed * 0.9;
      this.velocity.y = normalizedDy * this.speed * 0.9;
    }
    
    // Apply boundary forces
    this.applyBoundaryForces();
    
    // Face toward player
    const angleToPlayer = Math.atan2(
      playerPos.y - this.position.y,
      playerPos.x - this.position.x
    ) * (180 / Math.PI) + 90;
    this.angle = angleToPlayer;
    
    // Shoot at player periodically
    if (currentTime - this.lastShotTime >= gameConfig.enemy.circleAttack.shootCooldown) {
      this.shootAtPlayer();
      this.lastShotTime = currentTime;
    }
  }

  private updateBigShooterPattern(): void {
    const playerPos = this.player.getPosition();
    const currentTime = Date.now() / 1000;
    
    // Move toward player but maintain some distance
    const dx = playerPos.x - this.position.x;
    const dy = playerPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Try to maintain optimal shooting distance (not too close, not too far)
    const optimalDistance = 200;
    let accelerationMultiplier = 0.8;
    
    if (distance < optimalDistance * 0.7) {
      // Too close, back away slightly
      accelerationMultiplier = -0.3;
    } else if (distance > optimalDistance * 1.5) {
      // Too far, move closer more aggressively
      accelerationMultiplier = 1.2;
    }
    
    if (distance > 0) {
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      // Apply velocity towards/away from player
      this.velocity.x += normalizedDx * this.acceleration * accelerationMultiplier;
      this.velocity.y += normalizedDy * this.acceleration * accelerationMultiplier;
    }
    
    // Apply boundary forces to stay on screen
    this.applyBoundaryForces();
    
    // Limit velocity to max speed
    const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (currentSpeed > this.speed) {
      const scale = this.speed / currentSpeed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }
    
    // Face toward player
    if (distance > 0) {
      this.angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    }
    
    // Shoot at player periodically
    if (currentTime - this.lastShotTime >= gameConfig.enemy.bigShooter.shootCooldown) {
      this.shootAtPlayerBigShooter();
      this.lastShotTime = currentTime;
    }
  }

  private shootAtPlayer(): void {
    const playerPos = this.player.getPosition();
    
    // Add some leading to the shot based on player movement (predictive aiming)
    const playerVelocity = { x: 0, y: 0 }; // Could be enhanced later
    const leadTime = 0.5;
    const targetX = playerPos.x + playerVelocity.x * leadTime;
    const targetY = playerPos.y + playerVelocity.y * leadTime;
    
    const projectile = new EnemyProjectile(
      this.stage,
      this.position.x,
      this.position.y,
      targetX,
      targetY
    );
    
    this.projectiles.push(projectile);
  }

  private shootAtPlayerBigShooter(): void {
    const playerPos = this.player.getPosition();
    
    // Create projectile with big shooter configuration
    const projectile = new EnemyProjectile(
      this.stage,
      this.position.x,
      this.position.y,
      playerPos.x,
      playerPos.y,
      gameConfig.enemy.bigShooter.projectileSpeed,
      gameConfig.enemy.bigShooter.projectileDamage,
      gameConfig.enemy.bigShooter.projectileLifetime
    );
    
    this.projectiles.push(projectile);
  }

  private updateProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update();
      
      if (!projectile.isAlive()) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  public getProjectiles(): EnemyProjectile[] {
    return this.projectiles;
  }

  public clearProjectiles(): void {
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles = [];
  }

  public getCollisionRadius(): number {
    if (this.attackPattern === EnemyAttackPattern.BIG_SHOOTER) {
      return gameConfig.enemy.bigShooter.size;
    } else if (this.attackPattern === EnemyAttackPattern.CIRCLE_SHOOT) {
      return 8; // Slightly larger than chase enemies
    } else {
      return 7; // Default chase enemy size
    }
  }

  // Health bar methods
  private createHealthBar(): void {
    if (this.healthBarContainer) return; // Already created
    
    // Create container for health bar components
    this.healthBarContainer = new createjs.Container();
    
    // Get appropriate dimensions based on enemy type
    const config = gameConfig.enemyHealthBar;
    const width = this.attackPattern === EnemyAttackPattern.BIG_SHOOTER 
      ? config.bigShooterWidth 
      : config.width;
    const height = this.attackPattern === EnemyAttackPattern.BIG_SHOOTER 
      ? config.bigShooterHeight 
      : config.height;
    
    // Create background (dark gray)
    this.healthBarBackground = new createjs.Shape();
    this.healthBarBackground.graphics
      .beginFill('#333333')
      .drawRect(-width/2, -height/2, width, height);
    
    // Create fill (will be updated based on health)
    this.healthBarFill = new createjs.Shape();
    this.updateHealthBarFill();
    
    // Create border (white)
    this.healthBarBorder = new createjs.Shape();
    this.healthBarBorder.graphics
      .setStrokeStyle(1)
      .beginStroke('#ffffff')
      .drawRect(-width/2, -height/2, width, height);
    
    // Add components to container
    this.healthBarContainer.addChild(this.healthBarBackground);
    this.healthBarContainer.addChild(this.healthBarFill);
    this.healthBarContainer.addChild(this.healthBarBorder);
    
    // Add container to stage
    this.stage.addChild(this.healthBarContainer);
    
    // Initially hide it
    this.healthBarContainer.alpha = 0;
    this.healthBarVisible = false;
  }

  private updateHealthBarFill(): void {
    if (!this.healthBarFill) return;
    
    const config = gameConfig.enemyHealthBar;
    const width = this.attackPattern === EnemyAttackPattern.BIG_SHOOTER 
      ? config.bigShooterWidth 
      : config.width;
    const height = this.attackPattern === EnemyAttackPattern.BIG_SHOOTER 
      ? config.bigShooterHeight 
      : config.height;
    
    // Calculate health percentage
    const healthPercent = Math.max(0, this.hp / this.maxHp);
    const fillWidth = width * healthPercent;
    
    // Determine color based on health percentage
    let color = '#00ff00'; // Green
    if (healthPercent < 0.3) {
      color = '#ff0000'; // Red
    } else if (healthPercent < 0.6) {
      color = '#ffff00'; // Yellow
    }
    
    // Clear and redraw fill
    this.healthBarFill.graphics.clear();
    if (fillWidth > 0) {
      this.healthBarFill.graphics
        .beginFill(color)
        .drawRect(-width/2, -height/2, fillWidth, height);
    }
  }

  private updateHealthBarPosition(): void {
    if (!this.healthBarContainer) return;
    
    // Position health bar above enemy
    const offsetY = this.getCollisionRadius() + gameConfig.enemyHealthBar.offsetY;
    this.healthBarContainer.x = this.position.x;
    this.healthBarContainer.y = this.position.y - offsetY;
  }

  private showHealthBar(): void {
    if (!this.healthBarContainer) {
      this.createHealthBar();
    }
    
    if (!this.healthBarContainer) return;
    
    // Show health bar immediately
    this.healthBarVisible = true;
    this.lastDamageTime = Date.now();
    
    // Cancel any existing fade tween
    createjs.Tween.removeTweens(this.healthBarContainer);
    
    // Make fully visible
    this.healthBarContainer.alpha = 1;
  }

  private checkHealthBarFade(): void {
    if (!this.healthBarContainer || !this.healthBarVisible) return;
    
    const currentTime = Date.now();
    const timeSinceLastDamage = currentTime - this.lastDamageTime;
    
    // Start fade after delay
    if (timeSinceLastDamage >= gameConfig.enemyHealthBar.fadeDelay) {
      this.healthBarVisible = false;
      
      // Fade out over duration
      createjs.Tween.get(this.healthBarContainer)
        .to({ alpha: 0 }, gameConfig.enemyHealthBar.fadeDuration);
    }
  }

  private destroyHealthBar(): void {
    if (this.healthBarContainer) {
      this.stage.removeChild(this.healthBarContainer);
      this.healthBarContainer = null;
      this.healthBarBackground = null;
      this.healthBarFill = null;
      this.healthBarBorder = null;
    }
  }
}