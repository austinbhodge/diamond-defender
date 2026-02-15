import * as createjs from '@thegraid/createjs-module';
import { GameEntity, Position, Velocity, EnemyAttackPattern } from '@types';
import { gameConfig } from '@config/gameConfig';
import { Player } from './Player';
import { EnemyProjectile } from './EnemyProjectile';
import { SwipeAttack } from './weapons/SwipeAttack';
import { ShipRenderers } from '@rendering/ShipRenderers';
import { ParticleSystem } from '@rendering/ParticleSystem';

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

  // Swipe attack properties
  private swipeAttack: SwipeAttack | null = null;
  private lastSwipeTime: number = 0;
  private swipeRange: number = 42; // Distance at which to trigger swipe
  private swipeCooldown: number = 3; // 3 seconds between swipes
  private hasSwipeHitPlayer: boolean = false; // Track if current swipe has hit player

  // Hit flash
  private hitFlashTimer: number = 0;
  private particleSystem: ParticleSystem | null = null;

  // Visual seed for procedural variation
  private visualSeed: number;

  // Dash worm properties
  private segments: createjs.Shape[] = [];
  private connectors: createjs.Shape[] = [];
  private segmentPositions: Position[] = [];
  private dashCooldown: number = 2.5;
  private dashDuration: number = 0.3;
  private dashSpeed: number = 15;
  private detectionRadius: number = 80;
  private lastDashTime: number = 0;
  private isDashing: boolean = false;
  private dashDirection: Position = { x: 0, y: 0 };
  private dashTimer: number = 0;

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
    } else if (attackPattern === EnemyAttackPattern.DASH_WORM) {
      this.hp = hp || gameConfig.enemy.dashWorm.hp;
      this.speed = speed || gameConfig.enemy.dashWorm.speed;
      this.dashCooldown = gameConfig.enemy.dashWorm.dashCooldown;
      this.dashDuration = gameConfig.enemy.dashWorm.dashDuration;
      this.dashSpeed = gameConfig.enemy.dashWorm.dashSpeed;
      this.detectionRadius = gameConfig.enemy.dashWorm.detectionRadius;
    } else {
      this.hp = hp || gameConfig.enemy.hp;
      this.speed = speed || gameConfig.enemy.baseSpeed;
    }
    
    // Store max HP for health bar percentage calculation
    this.maxHp = this.hp;
    
    this.acceleration = gameConfig.enemy.acceleration;
    this.desiredRadius = gameConfig.enemy.circleAttack.radius;

    // Generate unique visual seed for procedural variation
    this.visualSeed = Math.floor(Math.random() * 100000);

    // Set random starting angle for circle pattern
    this.circleAngle = Math.random() * Math.PI * 2;
    
    // Create enemy shape based on attack pattern
    this.shape = new createjs.Shape();
    this.createVisual();
    
    this.shape.x = x;
    this.shape.y = y;
    
    stage.addChild(this.shape);
    
    // Initialize swipe attack for CHASE pattern enemies
    if (attackPattern === EnemyAttackPattern.CHASE) {
      this.swipeAttack = new SwipeAttack(stage);
    }
    
    // Initialize worm segments for DASH_WORM pattern
    if (attackPattern === EnemyAttackPattern.DASH_WORM) {
      this.createWormSegments();
    }
  }

  public update(): void {
    if (this.attackPattern === EnemyAttackPattern.CHASE) {
      this.updateChasePattern();
    } else if (this.attackPattern === EnemyAttackPattern.CIRCLE_SHOOT) {
      this.updateCirclePattern();
    } else if (this.attackPattern === EnemyAttackPattern.BIG_SHOOTER) {
      this.updateBigShooterPattern();
    } else if (this.attackPattern === EnemyAttackPattern.DASH_WORM) {
      this.updateDashWormPattern();
    }
    
    this.updatePosition();
    this.updateProjectiles();
    
    // Update swipe attack if present
    if (this.swipeAttack) {
      this.swipeAttack.updatePosition(this.position);
      this.swipeAttack.update();
      
      // Collision detection is now handled by GameManager
      
      // Reset hit flag when swipe is no longer active
      if (!this.swipeAttack.isActive()) {
        this.hasSwipeHitPlayer = false;
      }
    }
    
    // Update hit flash
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer--;
      if (this.hitFlashTimer <= 0) {
        // Redraw in normal colors
        this.createVisual(false);
      }
    }

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
    
    // Check for swipe attack opportunity
    if (this.swipeAttack && distance <= this.swipeRange && distance > 0) {
      const currentTime = Date.now() / 1000;
      if (currentTime - this.lastSwipeTime >= this.swipeCooldown) {
        this.swipeAttack.trigger(this.position, playerPos);
        this.lastSwipeTime = currentTime;
        this.hasSwipeHitPlayer = false; // Reset hit flag for new swipe
      }
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

    // Hit flash — redraw white for 3 frames
    this.hitFlashTimer = 3;
    this.createVisual(true);

    // Emit hit spark particles
    if (this.particleSystem) {
      this.particleSystem.emitHitSpark(this.position.x, this.position.y);
    }

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
    
    // Clean up swipe attack
    if (this.swipeAttack) {
      this.swipeAttack.destroy();
      this.swipeAttack = null;
    }
    
    // Clean up worm segments and connectors
    for (const segment of this.segments) {
      this.stage.removeChild(segment);
    }
    for (const connector of this.connectors) {
      this.stage.removeChild(connector);
    }
    this.segments = [];
    this.connectors = [];
    this.segmentPositions = [];
    
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

  public setParticleSystem(ps: ParticleSystem): void {
    this.particleSystem = ps;
  }

  private createVisual(flash: boolean = false): void {
    this.shape.graphics.clear();
    if (this.attackPattern === EnemyAttackPattern.CHASE) {
      ShipRenderers.drawChaseEnemy(this.shape.graphics, flash, this.visualSeed);
    } else if (this.attackPattern === EnemyAttackPattern.CIRCLE_SHOOT) {
      ShipRenderers.drawCircleShootEnemy(this.shape.graphics, flash, this.visualSeed);
    } else if (this.attackPattern === EnemyAttackPattern.BIG_SHOOTER) {
      const size = gameConfig.enemy.bigShooter.size;
      ShipRenderers.drawBigShooter(this.shape.graphics, size, flash, this.visualSeed);
    } else if (this.attackPattern === EnemyAttackPattern.DASH_WORM) {
      // Invisible main shape — segments are the visual
      this.shape.graphics
        .beginFill("rgba(200, 0, 0, 0)")
        .drawCircle(0, 0, gameConfig.enemy.dashWorm.headSize);
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

  private createWormSegments(): void {
    const config = gameConfig.enemy.dashWorm;
    
    // Clear any existing segments and connectors
    for (const segment of this.segments) {
      this.stage.removeChild(segment);
    }
    for (const connector of this.connectors) {
      this.stage.removeChild(connector);
    }
    this.segments = [];
    this.connectors = [];
    this.segmentPositions = [];
    
    // Create segments starting from current position
    for (let i = 0; i < config.segmentCount; i++) {
      const segment = new createjs.Shape();

      if (i === 0) {
        // Head — pentagon with mandibles and eyes
        ShipRenderers.drawWormHead(segment.graphics, config.headSize, false, this.visualSeed);
      } else {
        // Body segments — hexagonal
        const alpha = 1 - (i * 0.15);
        ShipRenderers.drawWormSegment(segment.graphics, config.segmentSize, alpha);
      }
      
      // Position segments behind the head
      const segmentPosition = {
        x: this.position.x - (i * config.segmentSize * 1.5),
        y: this.position.y
      };
      
      segment.x = segmentPosition.x;
      segment.y = segmentPosition.y;
      
      this.segments.push(segment);
      this.segmentPositions.push(segmentPosition);
      this.stage.addChild(segment);
      
      // Create connector oval between this segment and the previous one
      if (i > 0) {
        const connector = new createjs.Shape();
        this.connectors.push(connector);
        this.stage.addChild(connector);
      }
    }
    
    // Initial update of connectors
    this.updateWormConnectors();
  }

  private updateDashWormPattern(): void {
    const playerPos = this.player.getPosition();
    const currentTime = Date.now() / 1000;
    
    // Check if we should dash to dodge bullets
    const shouldDash = this.shouldDashToDodgeBullets(playerPos);
    
    if (this.isDashing) {
      // Continue dashing
      this.dashTimer += 1 / gameConfig.fps;
      
      // Move in dash direction
      this.velocity.x = this.dashDirection.x * this.dashSpeed;
      this.velocity.y = this.dashDirection.y * this.dashSpeed;
      
      // Check if dash is complete
      if (this.dashTimer >= this.dashDuration) {
        this.isDashing = false;
        this.dashTimer = 0;
        this.lastDashTime = currentTime;
      }
    } else if (shouldDash && currentTime - this.lastDashTime >= this.dashCooldown) {
      // Start a new dash
      this.startDash(playerPos);
    } else {
      // Normal movement toward player (slower than chase enemies)
      const dx = playerPos.x - this.position.x;
      const dy = playerPos.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // More cautious approach
        this.velocity.x += normalizedDx * this.acceleration * 0.8;
        this.velocity.y += normalizedDy * this.acceleration * 0.8;
      }
    }
    
    // Apply boundary forces
    this.applyBoundaryForces();
    
    // Limit velocity to max speed (unless dashing)
    if (!this.isDashing) {
      const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (currentSpeed > this.speed) {
        const scale = this.speed / currentSpeed;
        this.velocity.x *= scale;
        this.velocity.y *= scale;
      }
    }
    
    // Calculate rotation angle based on movement direction
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      this.angle = Math.atan2(this.velocity.y, this.velocity.x) * (180 / Math.PI) + 90;
    }
    
    // Update worm segments to follow the head
    this.updateWormSegments();
  }

  private shouldDashToDodgeBullets(playerPos: Position): boolean {
    // Get player's projectiles from the game manager (we'll need to add this)
    // For now, use simple distance-based dodging when player is aiming at us
    
    const dx = playerPos.x - this.position.x;
    const dy = playerPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If player is close and we're in their line of sight, consider dashing
    if (distance < this.detectionRadius) {
      // Add some randomness to make it feel more organic
      const dashChance = 0.3; // 30% chance per frame when in danger
      return Math.random() < dashChance;
    }
    
    return false;
  }

  private startDash(playerPos: Position): void {
    this.isDashing = true;
    this.dashTimer = 0;
    
    // Calculate dash direction (perpendicular to player direction with some randomness)
    const dx = playerPos.x - this.position.x;
    const dy = playerPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      // Perpendicular direction (90 degrees rotated)
      const perpX = -dy / distance;
      const perpY = dx / distance;
      
      // Add some randomness to the dash direction
      const randomAngle = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees
      const cos = Math.cos(randomAngle);
      const sin = Math.sin(randomAngle);
      
      this.dashDirection.x = perpX * cos - perpY * sin;
      this.dashDirection.y = perpX * sin + perpY * cos;
    } else {
      // Random direction if player is at same position
      const randomAngle = Math.random() * Math.PI * 2;
      this.dashDirection.x = Math.cos(randomAngle);
      this.dashDirection.y = Math.sin(randomAngle);
    }
  }

  private updateWormSegments(): void {
    if (this.segments.length === 0) return;
    
    // Update head position (segment 0)
    this.segments[0].x = this.position.x;
    this.segments[0].y = this.position.y;
    this.segmentPositions[0] = { x: this.position.x, y: this.position.y };
    
    // Update body segments to follow
    for (let i = 1; i < this.segments.length; i++) {
      const currentSeg = this.segmentPositions[i];
      const targetSeg = this.segmentPositions[i - 1];
      
      // Calculate direction to previous segment
      const dx = targetSeg.x - currentSeg.x;
      const dy = targetSeg.y - currentSeg.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const segmentDistance = gameConfig.enemy.dashWorm.segmentSize * 1.2;
      
      if (distance > segmentDistance) {
        // Move toward previous segment
        const moveRatio = (distance - segmentDistance) / distance;
        currentSeg.x += dx * moveRatio * 0.1; // Smooth following
        currentSeg.y += dy * moveRatio * 0.1;
      }
      
      // Update visual position
      this.segments[i].x = currentSeg.x;
      this.segments[i].y = currentSeg.y;
    }
    
    // Update connectors between segments
    this.updateWormConnectors();
  }

  private updateWormConnectors(): void {
    if (this.connectors.length === 0) return;
    
    const config = gameConfig.enemy.dashWorm;
    
    for (let i = 0; i < this.connectors.length; i++) {
      const connector = this.connectors[i];
      const segmentIndex = i + 1; // Connector i connects segment i+1 to segment i
      
      if (segmentIndex < this.segmentPositions.length) {
        const fromPos = this.segmentPositions[i];
        const toPos = this.segmentPositions[segmentIndex];
        
        // Calculate connector properties
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Calculate connector dimensions
        const connectorWidth = Math.max(distance, config.segmentSize * 0.5);
        const connectorHeight = config.segmentSize * 1.12; // 40% thicker (0.8 * 1.4)
        
        // Calculate alpha for fading effect
        const alpha = Math.max(0.3, 1 - (segmentIndex * 0.12)); // Fade but not completely transparent
        
        // Clear and redraw connector
        connector.graphics.clear();
        connector.graphics
          .beginFill(`rgba(160, 20, 20, ${alpha})`)
          .drawEllipse(-connectorWidth/2, -connectorHeight/2, connectorWidth, connectorHeight);
        
        // Position and rotate connector
        connector.x = fromPos.x + dx * 0.5; // Center between segments
        connector.y = fromPos.y + dy * 0.5;
        connector.rotation = angle * (180 / Math.PI);
      }
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
    } else if (this.attackPattern === EnemyAttackPattern.DASH_WORM) {
      return gameConfig.enemy.dashWorm.headSize;
    } else {
      return 7; // Default chase enemy size
    }
  }

  public checkWormCollision(position: Position, radius: number): boolean {
    if (this.attackPattern !== EnemyAttackPattern.DASH_WORM) {
      // Fallback to normal collision for non-worm enemies
      const dx = position.x - this.position.x;
      const dy = position.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (radius + this.getCollisionRadius());
    }

    const config = gameConfig.enemy.dashWorm;
    
    // Check collision with each segment
    for (let i = 0; i < this.segmentPositions.length; i++) {
      const segmentPos = this.segmentPositions[i];
      const segmentRadius = i === 0 ? config.headSize : config.segmentSize;
      
      const dx = position.x - segmentPos.x;
      const dy = position.y - segmentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < (radius + segmentRadius)) {
        return true;
      }
    }
    
    // Check collision with connectors (oval-shaped areas between segments)
    for (let i = 0; i < this.segmentPositions.length - 1; i++) {
      const fromPos = this.segmentPositions[i];
      const toPos = this.segmentPositions[i + 1];
      
      if (this.checkOvalCollision(position, radius, fromPos, toPos, config.segmentSize * 1.12)) {
        return true;
      }
    }
    
    return false;
  }

  private checkOvalCollision(point: Position, pointRadius: number, ovalStart: Position, ovalEnd: Position, ovalHeight: number): boolean {
    // Simplified oval collision - treat as capsule (line segment with rounded ends)
    const dx = ovalEnd.x - ovalStart.x;
    const dy = ovalEnd.y - ovalStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return false;
    
    // Normalize the line direction
    const unitX = dx / length;
    const unitY = dy / length;
    
    // Project point onto the line
    const pointDx = point.x - ovalStart.x;
    const pointDy = point.y - ovalStart.y;
    const projection = pointDx * unitX + pointDy * unitY;
    
    // Clamp projection to line segment
    const clampedProjection = Math.max(0, Math.min(length, projection));
    
    // Find closest point on line segment
    const closestX = ovalStart.x + clampedProjection * unitX;
    const closestY = ovalStart.y + clampedProjection * unitY;
    
    // Check distance from point to closest point on oval
    const distanceX = point.x - closestX;
    const distanceY = point.y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    return distance < (pointRadius + ovalHeight / 2);
  }

  public getSwipeAttack(): SwipeAttack | null {
    return this.swipeAttack;
  }

  public hasSwipeHitPlayerAlready(): boolean {
    return this.hasSwipeHitPlayer;
  }

  public markSwipeAsHit(): void {
    this.hasSwipeHitPlayer = true;
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