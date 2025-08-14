import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position } from '@types';
import { ViewportManager } from '@utils/viewport';

export class HealthTradingZone implements GameObject {
  private stage: createjs.Stage;
  private shape: createjs.Shape;
  private glowShape: createjs.Shape;
  private container: createjs.Container;
  private position: Position;
  private size: number = 50;
  private viewportManager: ViewportManager;
  
  // Visual state management
  private visible: boolean = false;
  private isPlayerInZone: boolean = false;
  private dimAlpha: number = 0.3;
  private activeAlpha: number = 1.0;
  private glowIntensity: number = 0;
  private glowDirection: number = 1;
  
  // Trading mechanics
  private tradingTimer: number = 0;
  private tradingCooldown: number = 2; // 2 seconds between trades
  private experienceCost: number = 5;
  private healthGain: number = 10;

  constructor(stage: createjs.Stage, viewportManager: ViewportManager) {
    this.stage = stage;
    this.viewportManager = viewportManager;
    
    // Position above health bar using viewport dimensions
    this.updatePosition();

    // Create container for the trading zone
    this.container = new createjs.Container();
    this.container.x = this.position.x;
    this.container.y = this.position.y;

    // Create glow effect (larger, semi-transparent)
    this.glowShape = new createjs.Shape();
    this.drawGlowShape();

    // Create main trading zone square
    this.shape = new createjs.Shape();
    this.drawMainShape();

    // Add shapes to container
    this.container.addChild(this.glowShape);
    this.container.addChild(this.shape);
    
    // Initially hidden
    this.container.alpha = 0;
    this.stage.addChild(this.container);
  }

  public update(): void {
    if (!this.visible) return;

    // Update trading timer
    if (this.isPlayerInZone) {
      this.tradingTimer += 1 / 55; // Game runs at 55 FPS
    } else {
      this.tradingTimer = 0; // Reset timer when player leaves
    }

    // Update visual effects
    this.updateVisualEffects();
  }

  private updateVisualEffects(): void {
    if (this.isPlayerInZone) {
      // Active state - bright with pulsing glow
      this.glowIntensity += this.glowDirection * 0.04;
      
      if (this.glowIntensity >= 1) {
        this.glowIntensity = 1;
        this.glowDirection = -1;
      } else if (this.glowIntensity <= 0.5) {
        this.glowIntensity = 0.5;
        this.glowDirection = 1;
      }

      // Update shapes for active state
      this.drawGlowShape();
      this.drawMainShape();
    } else {
      // Dim state - subtle static glow
      this.glowIntensity = 0.2;
      this.drawGlowShape();
      this.drawMainShape();
    }
  }

  private drawGlowShape(): void {
    const glowAlpha = this.isPlayerInZone ? this.glowIntensity * 0.4 : 0.1;
    const glowSize = this.isPlayerInZone ? 20 : 10;
    
    this.glowShape.graphics.clear();
    this.glowShape.graphics
      .beginFill(`rgba(0, 180, 174, ${glowAlpha})`)
      .drawRect(-this.size / 2 - glowSize, -this.size / 2 - glowSize, 
                this.size + glowSize * 2, this.size + glowSize * 2);
  }

  private drawMainShape(): void {
    const shapeAlpha = this.isPlayerInZone ? this.activeAlpha : this.dimAlpha;
    const brightness = this.isPlayerInZone ? (0.8 + this.glowIntensity * 0.2) : 0.6;
    
    this.shape.graphics.clear();
    this.shape.graphics
      .beginFill(`rgba(0, ${Math.floor(180 * brightness)}, ${Math.floor(174 * brightness)}, ${shapeAlpha})`)
      .drawRect(-this.size / 2, -this.size / 2, this.size, this.size);
  }

  public show(): void {
    this.visible = true;
    this.container.alpha = 1;
  }

  public hide(): void {
    this.visible = false;
    this.isPlayerInZone = false;
    this.tradingTimer = 0;
    this.container.alpha = 0;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public setPlayerInZone(inZone: boolean): void {
    this.isPlayerInZone = inZone;
    if (!inZone) {
      this.tradingTimer = 0;
    }
  }

  public isPlayerInZone(): boolean {
    return this.isPlayerInZone;
  }

  public canTrade(): boolean {
    return this.isPlayerInZone && this.tradingTimer >= this.tradingCooldown;
  }

  public resetTradingTimer(): void {
    this.tradingTimer = 0;
  }

  public getExperienceCost(): number {
    return this.experienceCost;
  }

  public getHealthGain(): number {
    return this.healthGain;
  }

  public checkCollision(playerPosition: Position, playerRadius: number = 14): boolean {
    if (!this.visible) return false;

    const dx = playerPosition.x - this.position.x;
    const dy = playerPosition.y - this.position.y;
    
    // Check if player is within the square bounds
    const halfSize = this.size / 2;
    return Math.abs(dx) < halfSize + playerRadius && 
           Math.abs(dy) < halfSize + playerRadius;
  }

  public updatePosition(): void {
    // Position above health bar
    const dims = this.viewportManager.getDimensions();
    
    // Health bar is at bottom-left, 20px from left, 30px from bottom
    // Position trading zone above it
    this.position = {
      x: 20 + 100, // Center over health bar (health bar is 200px wide)
      y: dims.height - 100 // 70px above health bar
    };
    
    if (this.container) {
      this.container.x = this.position.x;
      this.container.y = this.position.y;
    }
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public destroy(): void {
    this.stage.removeChild(this.container);
  }
}