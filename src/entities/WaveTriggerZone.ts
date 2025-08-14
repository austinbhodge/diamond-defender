import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position } from '@types';
import { ViewportManager } from '@utils/viewport';

export class WaveTriggerZone implements GameObject {
  private stage: createjs.Stage;
  private shape: createjs.Shape;
  private glowShape: createjs.Shape;
  private container: createjs.Container;
  private position: Position;
  private size: number = 60;
  private glowIntensity: number = 0;
  private glowDirection: number = 1;
  private visible: boolean = false;
  private viewportManager: ViewportManager;

  constructor(stage: createjs.Stage, viewportManager: ViewportManager) {
    this.stage = stage;
    this.viewportManager = viewportManager;
    
    // Position at bottom center of screen using viewport dimensions
    const dims = this.viewportManager.getDimensions();
    this.position = {
      x: dims.width / 2,
      y: dims.height - 100 // 100px from bottom
    };

    // Create container for the trigger zone
    this.container = new createjs.Container();
    this.container.x = this.position.x;
    this.container.y = this.position.y;

    // Create glow effect (larger, semi-transparent)
    this.glowShape = new createjs.Shape();
    this.glowShape.graphics
      .beginFill('rgba(255, 255, 255, 0.3)')
      .drawRect(-this.size / 2 - 10, -this.size / 2 - 10, this.size + 20, this.size + 20);

    // Create main trigger zone square
    this.shape = new createjs.Shape();
    this.shape.graphics
      .beginFill('#ffffff')
      .drawRect(-this.size / 2, -this.size / 2, this.size, this.size);

    // Add shapes to container
    this.container.addChild(this.glowShape);
    this.container.addChild(this.shape);
    
    // Initially hidden
    this.container.alpha = 0;
    this.stage.addChild(this.container);
  }

  public update(): void {
    if (!this.visible) return;

    // Animate pulsing glow effect
    this.glowIntensity += this.glowDirection * 0.03;
    
    if (this.glowIntensity >= 1) {
      this.glowIntensity = 1;
      this.glowDirection = -1;
    } else if (this.glowIntensity <= 0.3) {
      this.glowIntensity = 0.3;
      this.glowDirection = 1;
    }

    // Update glow appearance
    this.glowShape.graphics.clear();
    this.glowShape.graphics
      .beginFill(`rgba(255, 255, 255, ${this.glowIntensity * 0.4})`)
      .drawRect(-this.size / 2 - 15, -this.size / 2 - 15, this.size + 30, this.size + 30);

    // Update main square brightness
    this.shape.graphics.clear();
    this.shape.graphics
      .beginFill(`rgba(255, 255, 255, ${0.8 + this.glowIntensity * 0.2})`)
      .drawRect(-this.size / 2, -this.size / 2, this.size, this.size);
  }

  public show(): void {
    this.visible = true;
    this.container.alpha = 1;
  }

  public hide(): void {
    this.visible = false;
    this.container.alpha = 0;
  }

  public isVisible(): boolean {
    return this.visible;
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
    // Update position based on current viewport dimensions
    const dims = this.viewportManager.getDimensions();
    this.position = {
      x: dims.width / 2,
      y: dims.height - 100 // 100px from bottom
    };
    
    this.container.x = this.position.x;
    this.container.y = this.position.y;
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public destroy(): void {
    this.stage.removeChild(this.container);
  }
}