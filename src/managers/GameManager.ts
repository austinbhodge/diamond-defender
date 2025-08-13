import * as createjs from '@thegraid/createjs-module';
import { Player } from '@entities/Player';
import { Enemy } from '@entities/Enemy';
import { ExperienceOrb } from '@entities/ExperienceOrb';
import { EnemyProjectile } from '@entities/EnemyProjectile';
import { Mouse } from '@entities/Mouse';
import { Phaser } from '@entities/weapons/Phaser';
import { Kick } from '@entities/weapons/Kick';
import { InputManager } from './InputManager';
import { UpgradeManager } from './UpgradeManager';
import { WaveManager, EnemySpawnInfo } from './WaveManager';
import { UIManager } from './UIManager';
import { gameConfig } from '@config/gameConfig';
import { WeaponType, EnemyAttackPattern } from '@types';
import { ViewportManager } from '@utils/viewport';

export class GameManager {
  private stage: createjs.Stage;
  private player: Player;
  private enemies: Enemy[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];
  private experienceOrbs: ExperienceOrb[] = [];
  private totalExperience: number = 0;
  private mouse: Mouse;
  private phaser: Phaser;
  private kick: Kick;
  private inputManager: InputManager;
  private upgradeManager: UpgradeManager;
  private waveManager: WaveManager;
  private uiManager: UIManager;
  private viewportManager: ViewportManager;
  
  private isPaused: boolean = false;

  constructor(canvasId: string) {
    // Get canvas element
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }
    
    // Initialize stage
    this.stage = new createjs.Stage(canvas);
    this.stage.enableMouseOver(20);
    
    // Initialize viewport manager
    this.viewportManager = new ViewportManager(
      canvas,
      this.stage,
      gameConfig.viewport.targetWidth,
      gameConfig.viewport.targetHeight,
      gameConfig.viewport.minWidth,
      gameConfig.viewport.maxWidth
    );
    
    // Initialize input manager
    this.inputManager = new InputManager(this.stage);
    
    // Initialize game entities
    const center = this.viewportManager.getCanvasCenter();
    this.player = new Player(this.stage, center.x, center.y);
    this.mouse = new Mouse(this.stage);
    this.phaser = new Phaser(this.stage, WeaponType.LASER);
    this.kick = new Kick(this.stage);
    
    // Initialize managers
    this.upgradeManager = new UpgradeManager(this.stage);
    this.uiManager = new UIManager(this.stage, this.viewportManager);
    
    // Initialize wave manager with callbacks
    this.waveManager = new WaveManager(
      () => this.onWaveStart(),
      () => this.onWaveComplete(),
      (spawnInfo: EnemySpawnInfo) => this.onEnemySpawn(spawnInfo)
    );
    
    // Set up ticker
    createjs.Ticker.framerate = gameConfig.fps;
    createjs.Ticker.addEventListener('tick', this.update.bind(this));
  }

  private update(event: createjs.Event): void {
    if (this.isPaused) return;
    
    // Update wave manager
    this.waveManager.update();
    
    // Update UI
    this.uiManager.updateWaveInfo(this.waveManager.getWaveData());
    this.uiManager.updateHealthBar(
      this.player.getHealthPercentage(),
      this.player.getCurrentHealth(),
      this.player.getMaxHealth()
    );
    this.uiManager.updateAmmoBar(
      this.phaser.getAmmoPercentage(),
      this.phaser.getCurrentAmmo(),
      this.phaser.getMaxAmmo()
    );
    if (this.waveManager.isInRestPeriod()) {
      this.uiManager.showTimer(this.waveManager.getRestTimeRemaining());
    } else {
      this.uiManager.hideTimer();
    }
    
    // Update input-based states
    this.handleInput();
    
    // Update mouse position
    const mousePos = this.inputManager.getMousePosition();
    this.mouse.updateMousePosition(mousePos.x, mousePos.y);
    this.mouse.updatePlayerPosition(this.player.getPosition());
    
    // Update player angle based on mouse
    this.player.setAngle(this.mouse.getAngle());
    
    // Update weapons with positions
    this.phaser.updatePositions(this.player.getPosition(), this.mouse.getPosition());
    
    // Update all game objects
    this.player.update();
    this.mouse.update();
    this.phaser.update();
    this.kick.update();
    this.uiManager.update();
    
    // Update enemies
    this.updateEnemies();
    
    // Update enemy projectiles
    this.updateEnemyProjectiles();
    
    // Update experience orbs
    this.updateExperienceOrbs();
    
    // Update upgrade manager
    this.upgradeManager.update();
    
    // Check collisions
    this.checkCollisions();
    
    // Update stage
    this.stage.update();
  }

  private handleInput(): void {
    const keys = this.inputManager.getPressedKeys();
    
    // Player movement
    this.player.handleMovement(keys);
    
    // Weapon firing
    if (this.inputManager.isMouseDown()) {
      this.phaser.startFiring();
    } else {
      this.phaser.stopFiring();
    }
    
    // Kick ability
    if (this.inputManager.isKeyPressed('KeyE')) {
      this.kick.trigger(this.player.getPosition());
    }
    
    // Pause game
    if (this.inputManager.isKeyPressed('Escape')) {
      this.togglePause();
    }
    
    // Switch weapon types (for testing)
    if (this.inputManager.isKeyPressed('Digit1')) {
      this.phaser.setType(WeaponType.LASER);
    } else if (this.inputManager.isKeyPressed('Digit2')) {
      this.phaser.setType(WeaponType.DUB);
    }
  }

  private updateEnemies(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update();
      
      // Collect enemy projectiles
      const newProjectiles = enemy.getProjectiles();
      for (const projectile of newProjectiles) {
        if (!this.enemyProjectiles.includes(projectile)) {
          this.enemyProjectiles.push(projectile);
        }
      }
      
      if (!enemy.isAlive()) {
        // Get death position before removing enemy
        const deathPos = enemy.destroy();
        this.enemies.splice(i, 1);
        
        // Spawn experience orb at death position
        if (deathPos) {
          const orb = new ExperienceOrb(this.stage, this.player, deathPos.x, deathPos.y);
          this.experienceOrbs.push(orb);
        }
        
        // Award points and notify wave manager
        const points = this.waveManager.getPointsPerKill();
        this.uiManager.addScore(points);
        this.upgradeManager.addPoints(points);
        this.waveManager.onEnemyKilled();
      }
    }
  }

  private updateEnemyProjectiles(): void {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.enemyProjectiles[i];
      
      if (!projectile.isAlive()) {
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  private updateExperienceOrbs(): void {
    for (let i = this.experienceOrbs.length - 1; i >= 0; i--) {
      const orb = this.experienceOrbs[i];
      orb.update();
      
      // Check for collection
      const playerPos = this.player.getPosition();
      const orbPos = orb.getPosition();
      const dx = playerPos.x - orbPos.x;
      const dy = playerPos.y - orbPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Collect if within collection radius
      if (distance < gameConfig.experienceOrb.collectionRadius) {
        orb.collect();
        this.totalExperience += orb.getExperienceValue();
        
        // Also add to upgrade manager points for now
        this.upgradeManager.addPoints(orb.getExperienceValue());
        
        // Log for debugging
        console.log(`Experience collected: ${orb.getExperienceValue()}, Total: ${this.totalExperience}`);
      }
      
      // Remove collected orbs
      if (orb.isCollected()) {
        this.experienceOrbs.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    // Check player-enemy collisions
    if (this.player.isAlive()) {
      for (const enemy of this.enemies) {
        const playerPos = this.player.getPosition();
        const enemyPos = enemy.getPosition();
        
        // Calculate distance between player and enemy
        const dx = playerPos.x - enemyPos.x;
        const dy = playerPos.y - enemyPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Player radius (14) + Enemy radius (dynamic based on type) + buffer
        const collisionDistance = 14 + enemy.getCollisionRadius() + 5;
        if (distance < collisionDistance) {
          // Apply damage to player
          const damageApplied = this.player.takeDamage(gameConfig.player.damagePerCollision);
          
          // Check if player died
          if (!this.player.isAlive()) {
            this.handleGameOver();
            return;
          }
        }
      }
      
      // Check enemy projectile-player collisions
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const projectile = this.enemyProjectiles[i];
        const playerPos = this.player.getPosition();
        const projectilePos = projectile.getPosition();
        
        // Calculate distance between player and projectile
        const dx = playerPos.x - projectilePos.x;
        const dy = playerPos.y - projectilePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Player radius (14) + Projectile radius (4) = ~18px
        if (distance < 18) {
          // Apply damage to player
          const damageApplied = this.player.takeDamage(projectile.getDamage());
          
          // Remove the projectile
          projectile.destroy();
          this.enemyProjectiles.splice(i, 1);
          
          // Check if player died
          if (!this.player.isAlive()) {
            this.handleGameOver();
            return;
          }
        }
      }
    }
    
    // Check kick collisions with enemies
    if (this.kick.isActive()) {
      for (const enemy of this.enemies) {
        if (this.kick.checkCollision(enemy.getPosition(), enemy.getCollisionRadius())) {
          enemy.takeDamage(25);
        }
      }
    }
    
    // Check projectile collisions with enemies
    const projectiles = this.phaser.getProjectiles();
    for (const projectile of projectiles) {
      for (const enemy of this.enemies) {
        // Simple distance-based collision
        const dx = projectile.shape.x - enemy.shape.x;
        const dy = projectile.shape.y - enemy.shape.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Projectile radius (small) + Enemy radius (dynamic) + small buffer
        const collisionDistance = 3 + enemy.getCollisionRadius() + 2;
        if (distance < collisionDistance) {
          enemy.takeDamage(10);
          projectile.shape.alpha = 0; // Mark for removal
        }
      }
    }
  }

  // Wave manager callbacks
  private onWaveStart(): void {
    this.uiManager.showWaveStartPopup(this.waveManager.getCurrentWave());
  }

  private onWaveComplete(): void {
    this.uiManager.showWaveCompletePopup();
  }

  private onEnemySpawn(spawnInfo: EnemySpawnInfo): void {
    // Determine enemy type based on wave number
    const currentWave = this.waveManager.getCurrentWave();
    let attackPattern = EnemyAttackPattern.CHASE;
    
    // Start introducing big shooters from wave 5, with low probability
    if (currentWave >= 5) {
      const bigShooterChance = Math.min(0.2 + (currentWave - 5) * 0.05, 0.4); // Max 40% big shooters
      if (Math.random() < bigShooterChance) {
        attackPattern = EnemyAttackPattern.BIG_SHOOTER;
      }
    }
    
    // Start introducing circle-shooters from wave 3 (but not if big shooter was selected)
    if (attackPattern === EnemyAttackPattern.CHASE && currentWave >= 3) {
      const circleChance = Math.min(0.3 + (currentWave - 3) * 0.1, 0.6); // Max 60% circle enemies
      if (Math.random() < circleChance) {
        attackPattern = EnemyAttackPattern.CIRCLE_SHOOT;
      }
    }
    
    const enemy = new Enemy(
      this.stage, 
      this.player, 
      spawnInfo.x, 
      spawnInfo.y, 
      spawnInfo.hp, 
      spawnInfo.speed,
      attackPattern
    );
    this.enemies.push(enemy);
  }

  private handleGameOver(): void {
    // Pause the game
    this.isPaused = true;
    
    // Could add game over UI here
    console.log('Game Over!');
    
    // For now, just restart after a delay
    setTimeout(() => {
      this.restartGame();
    }, 2000);
  }

  private restartGame(): void {
    // Reset player health
    const center = this.viewportManager.getCanvasCenter();
    this.player = new Player(this.stage, center.x, center.y);
    
    // Clear enemies
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];
    
    // Clear enemy projectiles
    for (const projectile of this.enemyProjectiles) {
      projectile.destroy();
    }
    this.enemyProjectiles = [];
    
    // Clear experience orbs
    for (const orb of this.experienceOrbs) {
      orb.destroy();
    }
    this.experienceOrbs = [];
    this.totalExperience = 0;
    
    // Reset wave manager
    this.waveManager = new WaveManager(
      () => this.onWaveStart(),
      () => this.onWaveComplete(),
      (spawnInfo: EnemySpawnInfo) => this.onEnemySpawn(spawnInfo)
    );
    
    // Reset UI
    this.uiManager = new UIManager(this.stage, this.viewportManager);
    
    // Unpause
    this.isPaused = false;
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  public destroy(): void {
    createjs.Ticker.removeEventListener('tick', this.update);
    this.inputManager.destroy();
    this.viewportManager.destroy();
  }
}