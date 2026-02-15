import * as createjs from '@thegraid/createjs-module';
import { GameEntity, Position, Velocity } from '../types/index';
import { gameConfig } from '@config/gameConfig';
import { Player } from './Player';
import { ParticleSystem } from '@rendering/ParticleSystem';

export class ExperienceOrb implements GameEntity {
  public shape: createjs.Shape;
  public position: Position;
  public velocity: Velocity;
  
  private stage: createjs.Stage;
  private player: Player;
  private experienceValue: number;
  private baseSpeed: number;
  private glowAnimation: number = 0;
  private collected: boolean = false;
  private particleSystem: ParticleSystem | null = null;
  
  constructor(stage: createjs.Stage, player: Player, x: number, y: number, experienceValue?: number) {
    this.stage = stage;
    this.player = player;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.experienceValue = experienceValue || gameConfig.experienceOrb.baseValue;
    this.baseSpeed = gameConfig.experienceOrb.baseSpeed;
    
    // Create orb shape with glow effect
    this.shape = new createjs.Shape();
    this.updateVisual();
    
    this.shape.x = x;
    this.shape.y = y;
    
    // Add a subtle shadow filter for glow effect
    const shadow = new createjs.Shadow("#00ff88", 0, 0, 8);
    this.shape.shadow = shadow;
    
    stage.addChild(this.shape);
  }
  
  public update(): void {
    if (this.collected) return;
    
    // Update glow animation
    this.glowAnimation += 0.1;
    
    // Get player position
    const playerPos = this.player.getPosition();
    
    // Calculate distance to player
    const dx = playerPos.x - this.position.x;
    const dy = playerPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Determine movement speed based on distance (magnetic effect)
    let speed = this.baseSpeed;
    if (distance < gameConfig.experienceOrb.magnetRange) {
      // Increase speed as player gets closer (magnetic attraction)
      const magnetStrength = 1 - (distance / gameConfig.experienceOrb.magnetRange);
      speed = this.baseSpeed + (gameConfig.experienceOrb.magnetSpeed * magnetStrength);
    }
    
    // Update velocity
    this.velocity.x = dirX * speed;
    this.velocity.y = dirY * speed;
    
    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    
    // Update shape position
    this.shape.x = this.position.x;
    this.shape.y = this.position.y;
    
    // Update visual with pulsing effect
    this.updateVisual();
  }
  
  private updateVisual(): void {
    const pulseSize = Math.sin(this.glowAnimation) * 1 + 5; // Radius oscillates between 4 and 6
    const pulseAlpha = 0.8 + Math.sin(this.glowAnimation * 2) * 0.2; // Alpha oscillates between 0.6 and 1.0
    
    this.shape.graphics.clear();
    
    // Outer glow circle
    this.shape.graphics
      .beginFill("rgba(0, 255, 136, 0.3)")
      .drawCircle(0, 0, pulseSize + 3);
    
    // Inner core
    this.shape.graphics
      .beginFill(`rgba(0, 255, 136, ${pulseAlpha})`)
      .drawCircle(0, 0, pulseSize);
    
    // Bright center
    this.shape.graphics
      .beginFill("rgba(200, 255, 220, 1)")
      .drawCircle(0, 0, 2);
  }
  
  public setParticleSystem(ps: ParticleSystem): void {
    this.particleSystem = ps;
  }

  public collect(): void {
    if (this.collected) return;

    this.collected = true;

    // Emit collection sparkle
    if (this.particleSystem) {
      this.particleSystem.emitXPCollect(this.position.x, this.position.y);
    }
    
    // Create collection animation (quick scale up and fade out)
    createjs.Tween.get(this.shape)
      .to({ scaleX: 1.5, scaleY: 1.5, alpha: 0 }, 200, createjs.Ease.quadOut)
      .call(() => {
        this.destroy();
      });
  }
  
  public isCollected(): boolean {
    return this.collected;
  }
  
  public getExperienceValue(): number {
    return this.experienceValue;
  }
  
  public getPosition(): Position {
    return { ...this.position };
  }
  
  public destroy(): void {
    this.stage.removeChild(this.shape);
  }
}