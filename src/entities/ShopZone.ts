import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position, ShopItem, ShopConfig } from '@types';
import { ViewportManager } from '@utils/viewport';
import { gameConfig } from '@config/gameConfig';

interface ShopSlot {
  shape: createjs.Shape;
  priceText: createjs.Text;
  item: ShopItem;
  bounds: { x: number; y: number; width: number; height: number };
}

export class ShopZone implements GameObject {
  private stage: createjs.Stage;
  private container: createjs.Container;
  private backgroundShape: createjs.Shape;
  private glowShape: createjs.Shape;
  private position: Position;
  private config: ShopConfig;
  private viewportManager: ViewportManager;
  
  // Visual state management
  private visible: boolean = false;
  private isPlayerInZone: boolean = false;
  private glowIntensity: number = 0;
  private glowDirection: number = 1;
  
  // Shop slots
  private shopSlots: ShopSlot[] = [];
  private titleText: createjs.Text;
  
  // Interaction cooldown
  private purchaseCooldown: number = 0;
  private readonly COOLDOWN_DURATION = 0.5; // 0.5 seconds between purchases

  constructor(stage: createjs.Stage, viewportManager: ViewportManager) {
    this.stage = stage;
    this.viewportManager = viewportManager;
    this.config = gameConfig.shop;
    
    // Calculate position
    this.updatePosition();

    // Create container for the shop zone
    this.container = new createjs.Container();
    this.container.x = this.position.x;
    this.container.y = this.position.y;

    // Create glow effect
    this.glowShape = new createjs.Shape();
    this.drawGlowShape();

    // Create background
    this.backgroundShape = new createjs.Shape();
    this.drawBackground();

    // Create title text
    this.titleText = new createjs.Text('SHOP', '16px Arial', '#ffffff');
    this.titleText.textAlign = 'center';
    this.titleText.x = 0;
    this.titleText.y = -this.config.zoneSize.height / 2 - 25;

    // Create shop slots
    this.createShopSlots();

    // Add components to container
    this.container.addChild(this.glowShape);
    this.container.addChild(this.backgroundShape);
    this.container.addChild(this.titleText);
    
    // Add shop slots to container
    this.shopSlots.forEach(slot => {
      this.container.addChild(slot.shape);
      this.container.addChild(slot.priceText);
    });
    
    // Initially hidden
    this.container.alpha = 0;
    this.stage.addChild(this.container);
  }

  public update(): void {
    if (!this.visible) return;

    // Update purchase cooldown
    if (this.purchaseCooldown > 0) {
      this.purchaseCooldown -= 1 / gameConfig.fps;
    }

    // Update visual effects
    this.updateVisualEffects();
  }

  private updateVisualEffects(): void {
    // Animate pulsing glow effect
    this.glowIntensity += this.glowDirection * 0.02;
    
    if (this.glowIntensity >= 1) {
      this.glowIntensity = 1;
      this.glowDirection = -1;
    } else if (this.glowIntensity <= 0.3) {
      this.glowIntensity = 0.3;
      this.glowDirection = 1;
    }

    // Update glow and background
    this.drawGlowShape();
    this.drawBackground();
  }

  private drawGlowShape(): void {
    const alpha = this.isPlayerInZone ? this.glowIntensity * 0.3 : 0.1;
    const glowSize = this.isPlayerInZone ? 15 : 8;
    
    this.glowShape.graphics.clear();
    this.glowShape.graphics
      .beginFill(`rgba(255, 215, 0, ${alpha})`) // Gold glow
      .drawRect(
        -this.config.zoneSize.width / 2 - glowSize, 
        -this.config.zoneSize.height / 2 - glowSize, 
        this.config.zoneSize.width + glowSize * 2, 
        this.config.zoneSize.height + glowSize * 2
      );
  }

  private drawBackground(): void {
    const alpha = this.isPlayerInZone ? 0.9 : 0.6;
    const brightness = this.isPlayerInZone ? (0.8 + this.glowIntensity * 0.2) : 0.7;
    
    this.backgroundShape.graphics.clear();
    this.backgroundShape.graphics
      .beginFill(`rgba(${Math.floor(139 * brightness)}, ${Math.floor(69 * brightness)}, ${Math.floor(19 * brightness)}, ${alpha})`) // Brown background
      .drawRect(
        -this.config.zoneSize.width / 2, 
        -this.config.zoneSize.height / 2, 
        this.config.zoneSize.width, 
        this.config.zoneSize.height
      );
  }

  private createShopSlots(): void {
    const slotSpacing = this.config.zoneSize.width / (this.config.items.length + 1);
    const startX = -this.config.zoneSize.width / 2 + slotSpacing;
    
    this.config.items.forEach((item, index) => {
      const slotX = startX + index * slotSpacing;
      const slotY = 0;
      
      // Create slot shape
      const shape = new createjs.Shape();
      this.updateSlotShape(shape, item, false);
      shape.x = slotX;
      shape.y = slotY;
      
      // Create price text
      const priceText = new createjs.Text(`${item.cost} XP`, '12px Arial', '#ffffff');
      priceText.textAlign = 'center';
      priceText.x = slotX;
      priceText.y = slotY + this.config.slotSize / 2 + 8;
      
      // Store slot bounds for collision detection
      const bounds = {
        x: slotX - this.config.slotSize / 2,
        y: slotY - this.config.slotSize / 2,
        width: this.config.slotSize,
        height: this.config.slotSize
      };
      
      this.shopSlots.push({
        shape,
        priceText,
        item,
        bounds
      });
    });
  }

  private updateSlotShape(shape: createjs.Shape, item: ShopItem, affordable: boolean): void {
    const alpha = affordable ? 1.0 : 0.5;
    const borderColor = affordable ? '#ffffff' : '#666666';
    
    shape.graphics.clear();
    shape.graphics
      .beginFill(`rgba(${this.hexToRgb(item.color).r}, ${this.hexToRgb(item.color).g}, ${this.hexToRgb(item.color).b}, ${alpha})`)
      .drawRect(-this.config.slotSize / 2, -this.config.slotSize / 2, this.config.slotSize, this.config.slotSize)
      .endFill()
      .setStrokeStyle(2)
      .beginStroke(borderColor)
      .drawRect(-this.config.slotSize / 2, -this.config.slotSize / 2, this.config.slotSize, this.config.slotSize);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  public show(): void {
    this.visible = true;
    this.container.alpha = 1;
  }

  public hide(): void {
    this.visible = false;
    this.isPlayerInZone = false;
    this.container.alpha = 0;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public setPlayerInZone(inZone: boolean): void {
    this.isPlayerInZone = inZone;
  }

  public getIsPlayerInZone(): boolean {
    return this.isPlayerInZone;
  }

  public checkCollision(playerPosition: Position, playerRadius: number = 14): boolean {
    if (!this.visible) return false;

    const dx = playerPosition.x - this.position.x;
    const dy = playerPosition.y - this.position.y;
    
    // Check if player is within the shop zone bounds
    const halfWidth = this.config.zoneSize.width / 2;
    const halfHeight = this.config.zoneSize.height / 2;
    
    return Math.abs(dx) < halfWidth + playerRadius && 
           Math.abs(dy) < halfHeight + playerRadius;
  }

  public checkSlotPurchase(playerPosition: Position, playerExperience: number): { slotIndex: number; item: ShopItem } | null {
    if (!this.visible || !this.isPlayerInZone || this.purchaseCooldown > 0) {
      return null;
    }

    for (let i = 0; i < this.shopSlots.length; i++) {
      const slot = this.shopSlots[i];
      const globalBounds = {
        x: this.position.x + slot.bounds.x,
        y: this.position.y + slot.bounds.y,
        width: slot.bounds.width,
        height: slot.bounds.height
      };

      // Check if player is within slot bounds and can afford the item
      const inSlot = playerPosition.x >= globalBounds.x && 
                    playerPosition.x <= globalBounds.x + globalBounds.width &&
                    playerPosition.y >= globalBounds.y && 
                    playerPosition.y <= globalBounds.y + globalBounds.height;

      if (inSlot && playerExperience >= slot.item.cost) {
        this.purchaseCooldown = this.COOLDOWN_DURATION;
        return { slotIndex: i, item: slot.item };
      }
    }

    return null;
  }

  public updateSlotAffordability(playerExperience: number): void {
    this.shopSlots.forEach(slot => {
      const affordable = playerExperience >= slot.item.cost;
      this.updateSlotShape(slot.shape, slot.item, affordable);
      
      // Update price text color
      slot.priceText.color = affordable ? '#ffffff' : '#999999';
    });
  }

  public updatePosition(): void {
    const dims = this.viewportManager.getDimensions();
    
    this.position = {
      x: dims.width * this.config.position.x, // Center horizontally
      y: dims.height * this.config.position.y  // Upper quarter of screen
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