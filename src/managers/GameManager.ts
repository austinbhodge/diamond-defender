import * as createjs from '@thegraid/createjs-module';
import { Player } from '@entities/Player';
import { Enemy } from '@entities/Enemy';
import { ExperienceOrb } from '@entities/ExperienceOrb';
import { EnemyProjectile } from '@entities/EnemyProjectile';
import { Mouse } from '@entities/Mouse';
import { Phaser } from '@entities/weapons/Phaser';
import { Kick } from '@entities/weapons/Kick';
import { WaveTriggerZone } from '@entities/WaveTriggerZone';
import { HealthTradingZone } from '@entities/HealthTradingZone';
import { SpacePortManager } from '@managers/SpacePortManager';
import { UpgradeManager } from '@managers/UpgradeManager';
import { InputManager } from './InputManager';
import { WaveManager, EnemySpawnInfo } from './WaveManager';
import { UIManager } from './UIManager';
import { gameConfig } from '@config/gameConfig';
import { WeaponType, ShopEffectType, ShopItem, EnemyAttackPattern, UpgradeSnapshot } from '@types';
import { ViewportManager } from '@utils/viewport';
import { StarfieldBackground, ParticleSystem, ScreenShake, ShipRenderers } from '@rendering/index';

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
  private waveManager: WaveManager;
  private uiManager: UIManager;
  private viewportManager: ViewportManager;
  private waveTriggerZone: WaveTriggerZone;
  private healthTradingZone: HealthTradingZone;
  private spacePortManager: SpacePortManager;
  private upgradeManager: UpgradeManager;

  // Rendering systems
  private starfield: StarfieldBackground;
  private particleSystem: ParticleSystem;
  private screenShake: ScreenShake;

  private isPaused: boolean = false;
  private currentWeaponIndex: number = 0;
  private weaponTypes: WeaponType[] = [WeaponType.LASER, WeaponType.DUB, WeaponType.CIRCLE];
  private lastWeaponSwitch: number = 0;
  private killCount: number = 0;
  private isGameOver: boolean = false;

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

    // Initialize rendering systems
    this.starfield = new StarfieldBackground(this.stage, canvas.width, canvas.height);
    this.screenShake = new ScreenShake(this.stage);

    // Rebuild starfield when viewport resizes
    this.viewportManager.onResize((dims) => {
      this.starfield.resize(dims.width, dims.height);
    });

    // Initialize input manager
    this.inputManager = new InputManager(this.stage);

    // Initialize game entities
    const center = this.viewportManager.getCanvasCenter();
    this.player = new Player(this.stage, center.x, center.y);
    this.mouse = new Mouse(this.stage);
    this.phaser = new Phaser(this.stage, WeaponType.LASER);
    this.kick = new Kick(this.stage);

    // Initialize particle system (after entities so it renders on top)
    this.particleSystem = new ParticleSystem(this.stage);

    // Wire particle system to entities
    this.player.setParticleSystem(this.particleSystem);
    this.phaser.setParticleSystem(this.particleSystem);
    this.kick.setParticleSystem(this.particleSystem);

    // Initialize managers
    this.uiManager = new UIManager(this.stage, this.viewportManager);

    // Initialize upgrade manager
    this.upgradeManager = new UpgradeManager();

    // Initialize wave manager with callbacks
    this.waveManager = new WaveManager(
      () => this.onWaveStart(),
      () => this.onWaveComplete(),
      (spawnInfo: EnemySpawnInfo) => this.onEnemySpawn(spawnInfo)
    );

    // Initialize wave trigger zone
    this.waveTriggerZone = new WaveTriggerZone(this.stage, this.viewportManager);

    // Initialize health trading zone
    this.healthTradingZone = new HealthTradingZone(this.stage, this.viewportManager);

    // Initialize space port manager
    this.spacePortManager = new SpacePortManager(this.stage, this.upgradeManager);

    // Show trigger zone initially for testing - will be hidden when first wave starts
    this.waveTriggerZone.show();

    // Set up ticker
    createjs.Ticker.framerate = gameConfig.fps;
    createjs.Ticker.addEventListener('tick', this.update.bind(this));
  }

  private update(event: createjs.Event): void {
    // Handle input even when game over (for restart)
    this.handleInput();

    // Screen shake resets stage position each frame
    this.screenShake.update();

    if (this.isPaused || this.isGameOver) return;

    // Check for game over
    if (!this.player.isAlive()) {
      this.triggerGameOver();
      return;
    }

    // Update wave manager
    this.waveManager.update();

    // Update wave trigger zone
    this.waveTriggerZone.updatePosition();
    this.waveTriggerZone.update();

    // Update health trading zone
    this.healthTradingZone.updatePosition();
    this.healthTradingZone.update();

    // Update space port manager
    this.spacePortManager.update();

    // Check wave trigger zone collision
    if (this.waveManager.isInRestPeriod() && this.waveTriggerZone.isVisible()) {
      if (this.waveTriggerZone.checkCollision(this.player.getPosition())) {
        // Trigger wave start countdown
        this.waveManager.triggerWaveStart();
        this.phaser.refillAllAmmo(); // Refill ammo when triggering wave
        this.waveTriggerZone.hide();
      }
    }

    // Check health trading zone collision
    if (this.waveManager.isInRestPeriod() && this.healthTradingZone.isVisible()) {
      const playerPos = this.player.getPosition();
      const isInZone = this.healthTradingZone.checkCollision(playerPos);

      // Update zone state
      this.healthTradingZone.setPlayerInZone(isInZone);

      // Handle trading
      if (isInZone && this.healthTradingZone.canTrade()) {
        const experienceCost = this.healthTradingZone.getExperienceCost();
        const healthGain = this.healthTradingZone.getHealthGain();

        // Check if player has enough experience and isn't at max health
        if (this.totalExperience >= experienceCost && this.player.getCurrentHealth() < this.player.getMaxHealth()) {
          // Perform the trade
          this.totalExperience -= experienceCost;
          this.player.addHealth(healthGain);
          this.healthTradingZone.resetTradingTimer();
        }
      }
    }

    // Check space port purchases
    if (this.waveManager.isInRestPeriod() && this.spacePortManager.isVisible()) {
      const playerPos = this.player.getPosition();
      const purchase = this.spacePortManager.checkPurchases(playerPos, this.totalExperience);

      if (purchase) {
        // Deduct cost
        this.totalExperience -= purchase.cost;
        console.log(`Purchased ${purchase.item.name} for ${purchase.cost} XP. Remaining: ${this.totalExperience}`);

        // Add to purchased items display
        this.uiManager.addPurchasedItem(purchase.item);

        // Apply upgrade through upgrade manager
        this.upgradeManager.applyUpgrade(purchase.item);

        // Apply upgrade effects
        this.applyUpgradeEffects(purchase.item);
      }
    }

    // Update UI
    this.uiManager.updateWaveInfo(this.waveManager.getWaveData());
    this.uiManager.updateExperienceDisplay(this.totalExperience);
    this.uiManager.updateHealthBar(
      this.player.getHealthPercentage(),
      this.player.getCurrentHealth(),
      this.player.getMaxHealth()
    );
    this.uiManager.updateAmmoBar(
      this.phaser.getAmmoPercentage(),
      this.phaser.getCurrentAmmo(),
      this.phaser.getMaxAmmo(),
      this.phaser.getType()
    );

    // Update timer display based on wave state
    if (this.waveManager.isInRestPeriod()) {
      if (this.waveManager.isCountingDown()) {
        this.uiManager.showTimer(this.waveManager.getCountdownTimeRemaining());
      } else {
        this.uiManager.hideTimer();
      }
    } else {
      this.uiManager.hideTimer();
    }

    // Update mouse position
    const mousePos = this.inputManager.getMousePosition();
    this.mouse.updateMousePosition(mousePos.x, mousePos.y);
    this.mouse.updatePlayerPosition(this.player.getPosition());

    // Update player angle based on mouse
    this.player.setAngle(this.mouse.getAngle());

    // Update weapons with positions
    this.phaser.updatePositions(this.player.getPosition(), this.mouse.getPosition());

    // Pass enemy positions for homing missiles
    this.phaser.setEnemyPositions(this.enemies.map(e => e.getPosition()));

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


    // Check collisions
    this.checkCollisions();

    // Update starfield parallax based on player velocity
    this.starfield.update(this.player.velocity);

    // Update particles
    this.particleSystem.update();

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

    // Kick ability - moved to Q key
    if (this.inputManager.isKeyPressed('KeyQ')) {
      this.kick.trigger(this.player.getPosition());
    }

    // Weapon cycling with E key
    const currentTime = Date.now() / 1000;
    if (this.inputManager.isKeyPressed('KeyE') && (currentTime - this.lastWeaponSwitch) > 0.3) {
      this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weaponTypes.length;
      const nextWeapon = this.weaponTypes[this.currentWeaponIndex];
      this.phaser.setType(nextWeapon);
      this.player.setWeaponType(nextWeapon);
      this.lastWeaponSwitch = currentTime;
    }

    // Number key weapon switching (1-5)
    if (this.inputManager.isKeyPressed('Digit1') && (currentTime - this.lastWeaponSwitch) > 0.3) {
      this.switchToWeapon(WeaponType.LASER);
    }
    if (this.inputManager.isKeyPressed('Digit2') && (currentTime - this.lastWeaponSwitch) > 0.3) {
      this.switchToWeapon(WeaponType.DUB);
    }
    if (this.inputManager.isKeyPressed('Digit3') && (currentTime - this.lastWeaponSwitch) > 0.3) {
      this.switchToWeapon(WeaponType.CIRCLE);
    }
    if (this.inputManager.isKeyPressed('Digit4') && (currentTime - this.lastWeaponSwitch) > 0.3) {
      if (this.upgradeManager.isWeaponUnlocked(WeaponType.SCATTER)) {
        this.switchToWeapon(WeaponType.SCATTER);
      }
    }
    if (this.inputManager.isKeyPressed('Digit5') && (currentTime - this.lastWeaponSwitch) > 0.3) {
      if (this.upgradeManager.isWeaponUnlocked(WeaponType.HOMING)) {
        this.switchToWeapon(WeaponType.HOMING);
      }
    }

    // Pause game
    if (this.inputManager.isKeyPressed('Escape')) {
      this.togglePause();
    }

    // Restart game (only when game over)
    if (this.isGameOver && this.inputManager.isKeyPressed('Space')) {
      this.restartGame();
    }
  }

  private switchToWeapon(type: WeaponType): void {
    const index = this.weaponTypes.indexOf(type);
    if (index !== -1) {
      this.currentWeaponIndex = index;
      this.phaser.setType(type);
      this.player.setWeaponType(type);
      this.lastWeaponSwitch = Date.now() / 1000;
    }
  }

  private buildUpgradeSnapshot(): UpgradeSnapshot {
    const bs = this.upgradeManager.getPurchaseCount(ShopEffectType.BULLET_SPEED);
    const fr = this.upgradeManager.getPurchaseCount(ShopEffectType.FIRE_RATE);
    const eb = this.upgradeManager.getPurchaseCount(ShopEffectType.EXTRA_BULLETS);
    const ms = this.upgradeManager.getPurchaseCount(ShopEffectType.MOVE_SPEED);
    const mh = this.upgradeManager.getPurchaseCount(ShopEffectType.MAX_HEALTH);
    const mr = this.upgradeManager.getPurchaseCount(ShopEffectType.MAGNET_RANGE);
    return {
      bulletSpeed: bs,
      fireRate: fr,
      extraBullets: eb,
      moveSpeed: ms,
      maxHealth: mh,
      magnetRange: mr,
      totalUpgrades: bs + fr + eb + ms + mh + mr,
    };
  }

  private applyUpgradeEffects(item: ShopItem): void {
    switch (item.effect) {
      case ShopEffectType.BULLET_SPEED:
      case ShopEffectType.FIRE_RATE:
      case ShopEffectType.EXTRA_BULLETS:
        // Apply weapon stat upgrades
        this.phaser.applyUpgrades(
          this.upgradeManager.getBulletSpeedMultiplier(),
          this.upgradeManager.getFireRateMultiplier(),
          this.upgradeManager.getExtraBulletsBonus()
        );
        break;

      case ShopEffectType.MOVE_SPEED:
        this.player.setSpeedMultiplier(this.upgradeManager.getMoveSpeedMultiplier());
        break;

      case ShopEffectType.MAX_HEALTH:
        this.player.setMaxHealth(gameConfig.player.maxHealth + this.upgradeManager.getMaxHealthBonus());
        break;

      case ShopEffectType.MAGNET_RANGE:
        // Magnet range is read directly from upgradeManager when orbs update
        break;

      case ShopEffectType.WEAPON_SCATTER:
        // Add scatter to weapon cycle if not already present
        if (!this.weaponTypes.includes(WeaponType.SCATTER)) {
          this.weaponTypes.push(WeaponType.SCATTER);
        }
        break;

      case ShopEffectType.WEAPON_HOMING:
        // Add homing to weapon cycle if not already present
        if (!this.weaponTypes.includes(WeaponType.HOMING)) {
          this.weaponTypes.push(WeaponType.HOMING);
        }
        break;
    }

    // Update player's visual upgrade snapshot
    this.player.setUpgradeSnapshot(this.buildUpgradeSnapshot());
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
        this.killCount++; // Increment kill counter

        // Emit explosion particles and screen shake at death position
        if (deathPos) {
          this.particleSystem.emitExplosion(deathPos.x, deathPos.y);
          // Medium shake for big shooters, nothing for small enemies
          if (enemy.getCollisionRadius() > 20) {
            this.screenShake.triggerMedium();
          }

          const orb = new ExperienceOrb(this.stage, this.player, deathPos.x, deathPos.y);
          orb.setParticleSystem(this.particleSystem);
          this.experienceOrbs.push(orb);
        }

        // Award points and notify wave manager
        const points = this.waveManager.getPointsPerKill();
        this.uiManager.addScore(points);
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

        // Check collision using appropriate method based on enemy type
        const playerRadius = 14;
        let collision = false;

        if (enemy.checkWormCollision) {
          // Use worm-specific collision detection
          collision = enemy.checkWormCollision(playerPos, playerRadius + 5);
        } else {
          // Use standard circular collision
          const dx = playerPos.x - enemyPos.x;
          const dy = playerPos.y - enemyPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const collisionDistance = playerRadius + enemy.getCollisionRadius() + 5;
          collision = distance < collisionDistance;
        }

        if (collision) {
          // Apply damage to player
          const damageApplied = this.player.takeDamage(gameConfig.player.damagePerCollision);
          if (damageApplied) {
            this.screenShake.triggerSmall();
            this.particleSystem.emitHitSpark(this.player.position.x, this.player.position.y);
          }

          // Check if player died
          if (!this.player.isAlive()) {
            this.triggerGameOver();
            return;
          }
        }

        // Check swipe attack collisions
        const swipeAttack = enemy.getSwipeAttack();
        if (swipeAttack && swipeAttack.isActive() && !enemy.hasSwipeHitPlayerAlready()) {
          if (swipeAttack.checkPlayerCollision(playerPos)) {
            // Apply swipe damage to player
            const swipeDamage = swipeAttack.getDamage();
            const damageApplied = this.player.takeDamage(swipeDamage);
            enemy.markSwipeAsHit(); // Prevent multiple hits from same swipe
            if (damageApplied) {
              this.screenShake.triggerSmall();
            }

            // Check if player died
            if (!this.player.isAlive()) {
              this.triggerGameOver();
              return;
            }
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
          if (damageApplied) {
            this.screenShake.triggerSmall();
            this.particleSystem.emitHitSpark(this.player.position.x, this.player.position.y);
          }

          // Remove the projectile
          projectile.destroy();
          this.enemyProjectiles.splice(i, 1);

          // Check if player died
          if (!this.player.isAlive()) {
            this.triggerGameOver();
            return;
          }
        }
      }
    }

    // Check kick collisions with enemies
    if (this.kick.isActive()) {
      for (const enemy of this.enemies) {
        let kickHit = false;

        if (enemy.checkWormCollision) {
          // Use worm-specific collision detection for kick
          kickHit = enemy.checkWormCollision(this.kick.getPosition(), this.kick.getCurrentRadius());
        } else {
          // Use standard collision
          kickHit = this.kick.checkCollision(enemy.getPosition(), enemy.getCollisionRadius());
        }

        if (kickHit) {
          enemy.takeDamage(25);
        }
      }
    }

    // Check projectile collisions with enemies
    const projectiles = this.phaser.getProjectiles();
    for (const projectile of projectiles) {
      for (const enemy of this.enemies) {
        let projectileHit = false;
        const projectilePos = { x: projectile.shape.x, y: projectile.shape.y };
        const projectileRadius = 3;

        if (enemy.checkWormCollision) {
          // Use worm-specific collision detection for projectiles
          projectileHit = enemy.checkWormCollision(projectilePos, projectileRadius + 2);
        } else {
          // Use standard collision
          const dx = projectilePos.x - enemy.shape.x;
          const dy = projectilePos.y - enemy.shape.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const collisionDistance = projectileRadius + enemy.getCollisionRadius() + 2;
          projectileHit = distance < collisionDistance;
        }

        if (projectileHit) {
          enemy.takeDamage(10);
          projectile.shape.alpha = 0; // Mark for removal
        }
      }
    }
  }

  // Wave manager callbacks
  private onWaveStart(): void {
    this.uiManager.showWaveStartPopup(this.waveManager.getCurrentWave());
    this.waveTriggerZone.hide();
    this.healthTradingZone.hide();
    this.spacePortManager.hide();
  }

  private onWaveComplete(): void {
    this.uiManager.showWaveCompletePopup();
    this.waveTriggerZone.show();
    this.healthTradingZone.show();
    this.spacePortManager.generatePorts();
    this.spacePortManager.show();
  }

  private onEnemySpawn(spawnInfo: EnemySpawnInfo): void {
    // Determine enemy type based on wave number
    const currentWave = this.waveManager.getCurrentWave();
    let attackPattern = EnemyAttackPattern.CHASE;

    // Start introducing dash worms from wave 4, with moderate probability
    if (currentWave >= 4) {
      const dashWormChance = Math.min(0.15 + (currentWave - 4) * 0.05, 0.3); // Max 30% dash worms
      if (Math.random() < dashWormChance) {
        attackPattern = EnemyAttackPattern.DASH_WORM;
      }
    }

    // Start introducing big shooters from wave 5, with low probability (but not if dash worm was selected)
    if (attackPattern === EnemyAttackPattern.CHASE && currentWave >= 5) {
      const bigShooterChance = Math.min(0.2 + (currentWave - 5) * 0.05, 0.4); // Max 40% big shooters
      if (Math.random() < bigShooterChance) {
        attackPattern = EnemyAttackPattern.BIG_SHOOTER;
      }
    }

    // Start introducing circle-shooters from wave 3 (but not if other special types were selected)
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
    enemy.setParticleSystem(this.particleSystem);
    this.enemies.push(enemy);
  }


  private restartGame(): void {
    // Reset game state
    this.isGameOver = false;
    this.killCount = 0;
    this.currentWeaponIndex = 0;
    this.weaponTypes = [WeaponType.LASER, WeaponType.DUB, WeaponType.CIRCLE];

    // Remove old player from stage
    if (this.player && this.player.shape) {
      this.stage.removeChild(this.player.shape);
    }

    // Remove old weapon projectiles and beam connectors
    if (this.phaser) {
      // Remove all projectiles
      for (const projectile of this.phaser.getProjectiles()) {
        if (projectile.shape) {
          this.stage.removeChild(projectile.shape);
        }
      }
    }

    // Reset rendering systems
    this.starfield.reset();
    this.particleSystem.reset();
    this.screenShake.reset();

    // Reset player
    const center = this.viewportManager.getCanvasCenter();
    this.player = new Player(this.stage, center.x, center.y);

    // Reset weapons
    this.phaser = new Phaser(this.stage, WeaponType.LASER);
    this.kick = new Kick(this.stage);

    // Rewire particle system to entities
    this.player.setParticleSystem(this.particleSystem);
    this.phaser.setParticleSystem(this.particleSystem);
    this.kick.setParticleSystem(this.particleSystem);

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

    // Hide game over screen and cleanup old UI
    this.uiManager.hideGameOverScreen();
    this.uiManager.destroy();

    // Reset UI (this will create fresh counters)
    this.uiManager = new UIManager(this.stage, this.viewportManager);

    // Reset wave trigger zone
    this.waveTriggerZone.destroy();
    this.waveTriggerZone = new WaveTriggerZone(this.stage, this.viewportManager);

    // Reset health trading zone
    this.healthTradingZone.destroy();
    this.healthTradingZone = new HealthTradingZone(this.stage, this.viewportManager);

    // Reset space port manager
    this.spacePortManager.destroy();
    this.spacePortManager = new SpacePortManager(this.stage, this.upgradeManager);

    // Reset upgrade manager
    this.upgradeManager.reset();

    // Clear blueprint cache for fresh visuals
    ShipRenderers.clearCache();

    // Unpause
    this.isPaused = false;
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.uiManager.showGameOverScreen(this.killCount, this.waveManager.getWaveData().number);
  }


  public destroy(): void {
    createjs.Ticker.removeEventListener('tick', this.update);
    this.inputManager.destroy();
    this.viewportManager.destroy();
  }
}
