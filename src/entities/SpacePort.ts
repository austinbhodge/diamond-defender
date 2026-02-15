import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position, ShopItem } from '@types';
import { gameConfig } from '@config/gameConfig';
import { ShipRenderers } from '@rendering/ShipRenderers';
import { Tooltip } from '@ui/Tooltip';

export class SpacePort implements GameObject {
  private stage: createjs.Stage;
  private container: createjs.Container;
  private item: ShopItem;
  private cost: number;
  private position: Position;

  // Visual layers
  private landingPadGlow: createjs.Shape;
  private platformBase: createjs.Shape;
  private signBoard: createjs.Container;
  private tooltip: Tooltip;

  // State
  private visible: boolean = false;
  private affordable: boolean = false;
  private playerInZone: boolean = false;
  private glowPhase: number = Math.random() * Math.PI * 2;
  private purchaseCooldown: number = 0;
  private readonly COOLDOWN_DURATION = 0.5;

  constructor(stage: createjs.Stage, item: ShopItem, cost: number, position: Position) {
    this.stage = stage;
    this.item = item;
    this.cost = cost;
    this.position = { ...position };

    // Create container
    this.container = new createjs.Container();
    this.container.x = position.x;
    this.container.y = position.y;

    // 1. Landing pad glow
    this.landingPadGlow = new createjs.Shape();
    this.container.addChild(this.landingPadGlow);

    // 2. Platform base
    this.platformBase = new createjs.Shape();
    this.drawPlatformBase();
    this.container.addChild(this.platformBase);

    // 3. Sign/billboard
    this.signBoard = new createjs.Container();
    this.createSignBoard();
    this.container.addChild(this.signBoard);

    // 4. Tooltip
    this.tooltip = new Tooltip(this.stage, {
      text: item.name,
      description: item.description || '',
      position: 'top',
      offset: 15,
      maxWidth: 180,
      fontSize: 11
    });

    // Initially hidden
    this.container.alpha = 0;
    this.stage.addChild(this.container);
  }

  private drawPlatformBase(): void {
    const g = this.platformBase.graphics;
    g.clear();

    // Dark metallic trapezoid
    g.beginFill('#1a1a2e')
      .moveTo(-40, 0)
      .lineTo(-35, -20)
      .lineTo(35, -20)
      .lineTo(40, 0)
      .closePath();

    // Cyan border stripe
    g.setStrokeStyle(1.5)
      .beginStroke(this.affordable ? '#006666' : '#333333')
      .moveTo(-40, 0)
      .lineTo(-35, -20)
      .lineTo(35, -20)
      .lineTo(40, 0)
      .closePath();

    this.platformBase.y = 10; // Position at bottom of container
  }

  private createSignBoard(): void {
    this.signBoard.removeAllChildren();
    this.signBoard.y = -25; // Above the platform

    // Background panel
    const bg = new createjs.Shape();
    const borderColor = this.affordable ? '#006666' : '#333333';
    bg.graphics
      .beginFill('rgba(10, 10, 26, 0.85)')
      .drawRoundRect(-30, -25, 60, 50, 3)
      .setStrokeStyle(1)
      .beginStroke(borderColor)
      .drawRoundRect(-30, -25, 60, 50, 3);
    this.signBoard.addChild(bg);

    // Icon (top half)
    const iconShape = new createjs.Shape();
    iconShape.y = -10;
    ShipRenderers.drawSpacePortIcon(iconShape.graphics, this.item.iconType, this.item.color);
    this.signBoard.addChild(iconShape);

    // Cost orbs (bottom half) — each orb = 5 XP
    const orbCount = Math.ceil(this.cost / 5);
    const maxOrbs = 8;
    const displayOrbs = Math.min(orbCount, maxOrbs);
    const orbSpacing = 10;
    const totalWidth = (displayOrbs - 1) * orbSpacing;
    const startX = -totalWidth / 2;

    const costShape = new createjs.Shape();
    costShape.y = 12;
    for (let i = 0; i < displayOrbs; i++) {
      ShipRenderers.drawCostOrb(costShape.graphics, startX + i * orbSpacing, 0, 3);
    }

    // If more than maxOrbs, add a "+" text
    if (orbCount > maxOrbs) {
      const plusText = new createjs.Text(`+${orbCount - maxOrbs}`, '8px Arial', '#00ff88');
      plusText.x = startX + maxOrbs * orbSpacing;
      plusText.y = 8;
      this.signBoard.addChild(plusText);
    }

    this.signBoard.addChild(costShape);
  }

  public update(): void {
    if (!this.visible) return;

    // Update purchase cooldown
    if (this.purchaseCooldown > 0) {
      this.purchaseCooldown -= 1 / gameConfig.fps;
    }

    // Animate landing pad glow
    this.glowPhase += 0.05;
    this.updateLandingPadGlow();

    // Update tooltip
    this.tooltip.update(1 / gameConfig.fps);
  }

  private updateLandingPadGlow(): void {
    const g = this.landingPadGlow.graphics;
    g.clear();

    if (!this.affordable) return;

    const pulseAlpha = 0.1 + Math.sin(this.glowPhase) * 0.1; // 0.1 to 0.3 when affordable
    g.beginFill(`rgba(${this.hexToRgb(this.item.color)}, ${pulseAlpha})`)
      .drawEllipse(-45, -5, 90, 30);
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0, 0, 0';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }

  public show(): void {
    this.visible = true;
    this.container.alpha = 1;
  }

  public hide(): void {
    this.visible = false;
    this.container.alpha = 0;
    this.tooltip.hide();
  }

  public checkCollision(playerPos: Position, playerRadius: number = 14): boolean {
    if (!this.visible) return false;

    const dx = Math.abs(playerPos.x - this.position.x);
    const dy = Math.abs(playerPos.y - this.position.y);
    const halfWidth = 40 + playerRadius;
    const halfHeight = 30 + playerRadius;

    return dx < halfWidth && dy < halfHeight;
  }

  public canPurchase(experience: number): boolean {
    return this.visible && this.affordable && this.purchaseCooldown <= 0 && experience >= this.cost;
  }

  public purchase(): void {
    this.purchaseCooldown = this.COOLDOWN_DURATION;
  }

  public getItem(): ShopItem {
    return this.item;
  }

  public getCost(): number {
    return this.cost;
  }

  public setAffordable(canAfford: boolean): void {
    if (this.affordable !== canAfford) {
      this.affordable = canAfford;
      this.container.alpha = canAfford ? 1 : 0.4;
      // Rebuild sign with updated border color
      this.drawPlatformBase();
      this.createSignBoard();
    }
  }

  public setPlayerInZone(inZone: boolean): void {
    if (this.playerInZone !== inZone) {
      this.playerInZone = inZone;
      if (inZone) {
        this.tooltip.show({
          x: this.position.x,
          y: this.position.y - 55
        });
      } else {
        this.tooltip.hide();
      }
    }
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public destroy(): void {
    this.tooltip.destroy();
    this.stage.removeChild(this.container);
  }
}
