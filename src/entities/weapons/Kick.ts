import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position } from '@types';
import { gameConfig } from '@config/gameConfig';

export class Kick implements GameObject {
  private shape: createjs.Shape;
  private stage: createjs.Stage;
  private playerPosition: Position;
  
  private thickness: number = 6;
  private expandRate: number;
  private decayRate: number;
  private maxRadius: number;
  private currentDecayRate: number;
  
  private active: boolean = false;
  private elapsed: boolean = false;
  private loop: boolean = false;

  constructor(stage: createjs.Stage) {
    this.stage = stage;
    this.playerPosition = { x: 0, y: 0 };
    
    const { kick } = gameConfig.weapons;
    this.expandRate = kick.expandRate;
    this.decayRate = kick.decayRate;
    this.maxRadius = kick.maxRadius;
    this.currentDecayRate = this.decayRate;
    
    // Create kick effect shape
    this.shape = new createjs.Shape();
    this.shape.graphics
      .beginFill("rgb(120, 162, 171)")
      .drawCircle(0, 0, 1);
    this.shape.alpha = 0;
    
    stage.addChild(this.shape);
  }

  public update(): void {
    if (this.elapsed) {
      this.currentDecayRate -= 1;
      if (this.currentDecayRate < 0) {
        this.loop = false;
        this.elapsed = false;
        this.currentDecayRate = this.decayRate;
      }
    }
    
    if (this.active) {
      this.loop = true;
      this.shape.alpha = 0.85;
      this.active = false;
    }
    
    if (this.loop) {
      // Expand the circle
      this.shape.scaleX += 0.5 + 0.44 * this.shape.scaleX;
      this.shape.scaleY += 0.5 + 0.44 * this.shape.scaleY;
      
      // Position at player location
      this.shape.x = this.playerPosition.x;
      this.shape.y = this.playerPosition.y;
      
      // Fade out
      this.shape.alpha -= 0.06;
      
      // Reset when too large or too faded
      if (this.shape.scaleX > this.maxRadius || this.shape.alpha <= 0) {
        this.reset();
      }
    } else {
      this.reset();
    }
  }

  public trigger(playerPosition: Position): void {
    if (!this.loop) {
      this.playerPosition = playerPosition;
      this.active = true;
      this.elapsed = true;
    }
  }

  private reset(): void {
    this.shape.scaleX = 1;
    this.shape.scaleY = 1;
    this.shape.alpha = 0;
    this.loop = false;
  }

  public isActive(): boolean {
    return this.loop;
  }

  public checkCollision(position: Position, radius: number): boolean {
    if (!this.loop) return false;
    
    const dx = position.x - this.shape.x;
    const dy = position.y - this.shape.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const kickRadius = this.shape.scaleX;
    
    return distance < kickRadius + radius;
  }
}