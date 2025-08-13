import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position, WeaponType, WeaponProjectile } from '@types';
import { gameConfig } from '@config/gameConfig';
import { degreesToRadians } from '@utils/math';

interface Projectile extends WeaponProjectile {
  velocityX: number;
  velocityY: number;
  amplitude?: number;
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

  constructor(stage: createjs.Stage, type: WeaponType = WeaponType.LASER) {
    this.stage = stage;
    this.type = type;
    
    const { phaser, circle } = gameConfig.weapons;
    
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
    
    // Initialize ammo for each weapon type
    for (const [weaponType, config] of this.weaponConfigs.entries()) {
      this.weaponAmmo.set(weaponType, {
        current: config.maxAmmo,
        max: config.maxAmmo,
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
    }
    
    // Consume ammo for current weapon
    const config = this.weaponConfigs.get(this.type)!;
    const ammo = this.weaponAmmo.get(this.type)!;
    ammo.current = Math.max(0, ammo.current - config.ammoConsumption);
    this.lastShotTime.set(this.type, Date.now() / 1000);
  }

  private createLaserProjectile(): void {
    const shape = new createjs.Shape();
    shape.graphics
      .beginFill("rgb(107, 233, 255)")
      .drawRect(0, 0, 2, 22);
    
    // Use fixed values instead of getBounds()
    shape.regY = 11; // height / 2
    shape.regX = -1;
    shape.rotation = this.angle;
    shape.x = this.playerPosition.x;
    shape.y = this.playerPosition.y;
    shape.alpha = 1;
    
    // Temporarily disable filters for visibility
    // shape.filters = [this.blurX, this.blurY, this.superBlur];
    // shape.cache(-15, -15, 40, 40);
    
    this.stage.addChild(shape);
    
    const angleRad = degreesToRadians(this.angle + 270);
    const projectile: Projectile = {
      shape,
      rotation: this.angle,
      alpha: 1,
      velocityX: Math.cos(angleRad) * this.speed,
      velocityY: Math.sin(angleRad) * this.speed
    };
    
    this.projectiles.push(projectile);
  }

  private createDubProjectile(): void {
    const amplitude = this.baseAmplitude - Math.random() * 10;
    const shape = new createjs.Shape();
    shape.graphics
      .beginFill("rgb(107, 233, 255)")
      .drawRect(0, 0, amplitude, 6);
    
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
    
    // Temporarily disable filters for visibility
    // shape.filters = [this.blurX, this.blurY, this.superBlur];
    // shape.cache(-amplitude, -10, amplitude * 2 + 20, 20);
    
    this.stage.addChild(shape);
    
    const projectile: Projectile = {
      shape,
      rotation: this.angle,
      alpha: 0.7,
      velocityX: Math.cos(angleRad) * (this.speed / 2),
      velocityY: Math.sin(angleRad) * (this.speed / 2),
      amplitude
    };
    
    this.projectiles.push(projectile);
    this.flip *= -1;
  }

  private createCircleProjectile(): void {
    const config = this.weaponConfigs.get(WeaponType.CIRCLE)!;
    const shape = new createjs.Shape();
    shape.graphics
      .beginFill("rgb(138, 43, 226)") // Purple color
      .drawCircle(0, 0, config.projectileSize!);
    
    shape.x = this.playerPosition.x;
    shape.y = this.playerPosition.y;
    shape.alpha = 0.9;
    
    this.stage.addChild(shape);
    
    const angleRad = degreesToRadians(this.angle + 270);
    const projectile: Projectile = {
      shape,
      rotation: this.angle,
      alpha: 0.9,
      velocityX: Math.cos(angleRad) * config.speed,
      velocityY: Math.sin(angleRad) * config.speed
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
      
      // Update position
      if (this.type === WeaponType.LASER) {
        projectile.shape.x += projectile.velocityX * (1 - Math.random() * 0.25);
        projectile.shape.y += projectile.velocityY * (1 - Math.random() * 0.25);
      } else {
        projectile.shape.x += projectile.velocityX;
        projectile.shape.y += projectile.velocityY;
        
        if (this.type === WeaponType.DUB) {
          projectile.shape.scaleX = this.cycle * this.flip;
        }
      }
      
      // Fade out (slower for circles)
      const fadeRate = this.type === WeaponType.CIRCLE ? 0.005 : (this.type === WeaponType.LASER ? 0.015 : 0.02);
      projectile.shape.alpha -= fadeRate;
      
      // Remove if out of bounds or faded
      if (this.isProjectileOutOfBounds(projectile.shape) || projectile.shape.alpha <= 0) {
        this.stage.removeChild(projectile.shape);
        this.projectiles.splice(i, 1);
      } else if (this.type === WeaponType.CIRCLE) {
        // Collect circle projectiles that are still active
        circleProjectiles.push(projectile);
      }
    }
    
    // Draw beam connections for circle weapon
    if (this.type === WeaponType.CIRCLE && circleProjectiles.length > 1) {
      this.drawBeamConnections(circleProjectiles);
    }
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

  public getProjectiles(): Projectile[] {
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
    const cooldownReady = (currentTime - lastShot) >= config.shotCooldown;
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