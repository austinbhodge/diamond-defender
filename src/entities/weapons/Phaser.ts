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
  
  // Ammo system
  private currentAmmo: number;
  private maxAmmo: number;
  private ammoRegenRate: number;
  private ammoConsumption: number;
  private shotCooldown: number;
  private lastShotTime: number = 0;
  private ammoRegenTimer: number = 0;
  
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

  constructor(stage: createjs.Stage, type: WeaponType = WeaponType.LASER) {
    this.stage = stage;
    this.type = type;
    
    const { phaser } = gameConfig.weapons;
    this.limit = phaser.limit;
    this.speed = phaser.speed;
    this.maxAmmo = phaser.maxAmmo;
    this.currentAmmo = this.maxAmmo; // Start with full ammo
    this.ammoRegenRate = phaser.ammoRegenRate;
    this.ammoConsumption = phaser.ammoConsumption;
    this.shotCooldown = phaser.shotCooldown;
    
    this.playerPosition = { x: 0, y: 0 };
    this.mousePosition = { x: 0, y: 0 };
    
    // Create blur filters with smaller values for better visibility
    this.blurX = new createjs.BlurFilter(5, 0, 1);
    this.blurY = new createjs.BlurFilter(0, 5, 1);
    this.superBlur = new createjs.BlurFilter(10, 10, 1);
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
    }
    
    // Consume ammo and update shot timing
    this.currentAmmo = Math.max(0, this.currentAmmo - this.ammoConsumption);
    this.lastShotTime = Date.now() / 1000; // Convert to seconds
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

  private updateProjectiles(): void {
    if (this.type === WeaponType.DUB) {
      this.updateDubCycle();
    }
    
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
      
      // Fade out
      projectile.shape.alpha -= this.type === WeaponType.LASER ? 0.015 : 0.02;
      
      // Remove if out of bounds or faded
      if (this.isProjectileOutOfBounds(projectile.shape) || projectile.shape.alpha <= 0) {
        this.stage.removeChild(projectile.shape);
        this.projectiles.splice(i, 1);
      }
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
    
    // Regenerate ammo over time
    if (this.currentAmmo < this.maxAmmo) {
      this.ammoRegenTimer += deltaTime;
      const ammoToRegen = this.ammoRegenTimer * this.ammoRegenRate;
      
      if (ammoToRegen >= 1) {
        const ammoGained = Math.floor(ammoToRegen);
        this.currentAmmo = Math.min(this.maxAmmo, this.currentAmmo + ammoGained);
        this.ammoRegenTimer = ammoToRegen - ammoGained; // Keep fractional part
      }
    }
  }

  private canFire(): boolean {
    const currentTime = Date.now() / 1000;
    const hasAmmo = this.currentAmmo >= this.ammoConsumption;
    const cooldownReady = (currentTime - this.lastShotTime) >= this.shotCooldown;
    const hasProjectileSpace = this.projectiles.length < this.limit;
    
    return hasAmmo && cooldownReady && hasProjectileSpace;
  }

  public getCurrentAmmo(): number {
    return this.currentAmmo;
  }

  public getMaxAmmo(): number {
    return this.maxAmmo;
  }

  public getAmmoPercentage(): number {
    return this.currentAmmo / this.maxAmmo;
  }
}