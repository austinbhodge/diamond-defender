import * as createjs from '@thegraid/createjs-module';
import { ShipBlueprint, ColorPalette, UpgradeSnapshot, WeaponType } from '@types';
import { ShipBlueprintFactory } from './ShipBlueprintFactory';
import { BlueprintRenderer } from './BlueprintRenderer';
import {
  PLAYER_PALETTE, PLAYER_FLASH_PALETTE,
  CHASE_PALETTE, CHASE_FLASH_PALETTE,
  CIRCLE_SHOOT_PALETTE, CIRCLE_SHOOT_FLASH_PALETTE,
  BIG_SHOOTER_PALETTE, BIG_SHOOTER_FLASH_PALETTE,
  WORM_PALETTE, WORM_FLASH_PALETTE,
} from './ColorPalettes';

/** Default upgrade snapshot (no upgrades purchased). */
const DEFAULT_UPGRADES: UpgradeSnapshot = {
  bulletSpeed: 0,
  fireRate: 0,
  extraBullets: 0,
  moveSpeed: 0,
  maxHealth: 0,
  magnetRange: 0,
  totalUpgrades: 0,
};

export class ShipRenderers {
  // ─── Blueprint Cache ─────────────────────────────────────
  private static blueprintCache: Map<string, ShipBlueprint> = new Map();

  /**
   * Clear the blueprint cache. Call on game restart.
   */
  static clearCache(): void {
    ShipRenderers.blueprintCache.clear();
  }

  private static getCachedBlueprint(key: string, factory: () => ShipBlueprint): ShipBlueprint {
    let bp = ShipRenderers.blueprintCache.get(key);
    if (!bp) {
      bp = factory();
      ShipRenderers.blueprintCache.set(key, bp);
    }
    return bp;
  }

  // ─── Player ──────────────────────────────────────────────

  /**
   * Player ship — procedural blueprint with weapon module and upgrade visuals.
   */
  static drawPlayer(
    g: createjs.Graphics,
    flash: boolean = false,
    weaponType: WeaponType = WeaponType.LASER,
    upgrades: UpgradeSnapshot = DEFAULT_UPGRADES
  ): void {
    const cacheKey = `player_${weaponType}_${upgrades.totalUpgrades}`;
    const blueprint = ShipRenderers.getCachedBlueprint(cacheKey, () =>
      ShipBlueprintFactory.playerBlueprint(weaponType, upgrades)
    );
    const palette = flash ? PLAYER_FLASH_PALETTE : PLAYER_PALETTE;
    BlueprintRenderer.render(g, blueprint, palette);
  }

  // ─── Chase Enemy ─────────────────────────────────────────

  /**
   * Chase enemy — procedural arrowhead with per-instance seed variation.
   */
  static drawChaseEnemy(g: createjs.Graphics, flash: boolean = false, seed: number = 0): void {
    const cacheKey = `chase_${seed}`;
    const blueprint = ShipRenderers.getCachedBlueprint(cacheKey, () =>
      ShipBlueprintFactory.chaseEnemyBlueprint(seed)
    );
    const palette = flash ? CHASE_FLASH_PALETTE : CHASE_PALETTE;
    BlueprintRenderer.render(g, blueprint, palette);
  }

  // ─── Circle Shoot Enemy ──────────────────────────────────

  /**
   * Circle shoot enemy — hexagonal turret with per-instance seed variation.
   */
  static drawCircleShootEnemy(g: createjs.Graphics, flash: boolean = false, seed: number = 0): void {
    const cacheKey = `circle_${seed}`;
    const blueprint = ShipRenderers.getCachedBlueprint(cacheKey, () =>
      ShipBlueprintFactory.circleShootEnemyBlueprint(seed)
    );
    const palette = flash ? CIRCLE_SHOOT_FLASH_PALETTE : CIRCLE_SHOOT_PALETTE;
    BlueprintRenderer.render(g, blueprint, palette);
  }

  // ─── Big Shooter ─────────────────────────────────────────

  /**
   * Big shooter — capital ship with per-instance seed variation.
   */
  static drawBigShooter(g: createjs.Graphics, size: number, flash: boolean = false, seed: number = 0): void {
    const cacheKey = `bigshooter_${size}_${seed}`;
    const blueprint = ShipRenderers.getCachedBlueprint(cacheKey, () =>
      ShipBlueprintFactory.bigShooterBlueprint(size, seed)
    );
    const palette = flash ? BIG_SHOOTER_FLASH_PALETTE : BIG_SHOOTER_PALETTE;
    BlueprintRenderer.render(g, blueprint, palette);
  }

  // ─── Dash Worm ───────────────────────────────────────────

  /**
   * Dash worm head — pentagon with mandible and eyes.
   */
  static drawWormHead(g: createjs.Graphics, headSize: number, flash: boolean = false, seed: number = 0): void {
    const cacheKey = `wormhead_${headSize}_${seed}`;
    const blueprint = ShipRenderers.getCachedBlueprint(cacheKey, () =>
      ShipBlueprintFactory.wormHeadBlueprint(headSize, seed)
    );
    const palette = flash ? WORM_FLASH_PALETTE : WORM_PALETTE;
    BlueprintRenderer.render(g, blueprint, palette);
  }

  /**
   * Dash worm body segment — hexagonal shape.
   */
  static drawWormSegment(g: createjs.Graphics, segmentSize: number, alpha: number, flash: boolean = false): void {
    const cacheKey = `wormseg_${segmentSize}`;
    const blueprint = ShipRenderers.getCachedBlueprint(cacheKey, () =>
      ShipBlueprintFactory.wormSegmentBlueprint(segmentSize)
    );

    // Build palette with alpha baked in
    const r = flash ? 255 : 180;
    const green = flash ? 255 : 20;
    const blue = flash ? 255 : 20;
    const palette: ColorPalette = {
      segment: `rgba(${r}, ${green}, ${blue}, ${alpha})`,
    };
    BlueprintRenderer.render(g, blueprint, palette);
  }

  // ─── Crosshair ───────────────────────────────────────────

  static drawCrosshair(g: createjs.Graphics, animPhase: number): void {
    const outerRadius = 15;
    const innerRadius = 6;
    const tickLen = 4;
    const color = 'rgb(0, 232, 255)';
    const dimColor = 'rgba(0, 232, 255, 0.5)';

    g.setStrokeStyle(1.2)
      .beginStroke(color)
      .drawCircle(0, 0, outerRadius)
      .endStroke();

    g.setStrokeStyle(0.8)
      .beginStroke(color)
      .drawCircle(0, 0, innerRadius)
      .endStroke();

    g.setStrokeStyle(1.5)
      .beginStroke(color);
    g.moveTo(0, -outerRadius).lineTo(0, -outerRadius - tickLen);
    g.moveTo(0, outerRadius).lineTo(0, outerRadius + tickLen);
    g.moveTo(outerRadius, 0).lineTo(outerRadius + tickLen, 0);
    g.moveTo(-outerRadius, 0).lineTo(-outerRadius - tickLen, 0);
    g.endStroke();

    const diagDist = outerRadius * 0.72;
    const diagLen = 3;
    g.setStrokeStyle(0.8)
      .beginStroke(dimColor);
    for (let i = 0; i < 4; i++) {
      const angle = animPhase + (Math.PI / 4) + (i * Math.PI / 2);
      const cx = Math.cos(angle) * diagDist;
      const cy = Math.sin(angle) * diagDist;
      const ex = Math.cos(angle) * (diagDist + diagLen);
      const ey = Math.sin(angle) * (diagDist + diagLen);
      g.moveTo(cx, cy).lineTo(ex, ey);
    }
    g.endStroke();

    g.beginFill(color)
      .drawCircle(0, 0, 1.5);
  }

  // ─── Projectile Renderers (unchanged) ────────────────────

  static drawLaserProjectile(g: createjs.Graphics): void {
    g.beginFill('rgba(107, 233, 255, 0.3)')
      .drawRect(-1, 0, 4, 22);
    g.beginFill('rgb(107, 233, 255)')
      .drawRect(0, 0, 2, 22);
    g.beginFill('rgba(200, 255, 255, 0.9)')
      .drawRect(0.5, 1, 1, 20);
  }

  static drawDubProjectile(g: createjs.Graphics, amplitude: number): void {
    g.beginFill('rgba(80, 200, 235, 0.4)')
      .drawRect(0, -1, amplitude, 8);
    g.beginFill('rgb(107, 233, 255)')
      .drawRect(0, 0, amplitude, 6);
    g.beginFill('rgba(200, 255, 255, 0.7)')
      .drawRect(0, 2, amplitude, 2);
  }

  static drawCircleProjectile(g: createjs.Graphics, size: number): void {
    g.beginFill('rgba(138, 43, 226, 0.3)')
      .drawCircle(0, 0, size + 2);
    g.beginFill('rgb(138, 43, 226)')
      .drawCircle(0, 0, size);
    g.beginFill('rgba(200, 140, 255, 0.9)')
      .drawCircle(0, 0, size * 0.4);
  }

  static drawScatterProjectile(g: createjs.Graphics): void {
    g.beginFill('rgba(255, 102, 0, 0.3)')
      .drawRect(-2, 0, 5, 14);
    g.beginFill('rgb(255, 102, 0)')
      .drawRect(-1, 0, 3, 14);
    g.beginFill('rgba(255, 200, 100, 0.9)')
      .drawRect(0, 1, 1, 12);
  }

  static drawHomingProjectile(g: createjs.Graphics): void {
    g.beginFill('rgba(255, 0, 255, 0.3)')
      .moveTo(0, -8).lineTo(5, 0).lineTo(0, 8).lineTo(-5, 0).closePath();
    g.beginFill('rgb(255, 0, 255)')
      .moveTo(0, -6).lineTo(3.5, 0).lineTo(0, 6).lineTo(-3.5, 0).closePath();
    g.beginFill('rgba(255, 180, 255, 0.9)')
      .moveTo(0, -3).lineTo(1.5, 0).lineTo(0, 3).lineTo(-1.5, 0).closePath();
  }

  // ─── Space Port Icon Renderers (unchanged) ───────────────

  static drawSpacePortIcon(g: createjs.Graphics, iconType: string, color: string): void {
    switch (iconType) {
      case 'bullet_speed': ShipRenderers.drawBulletSpeedIcon(g, color); break;
      case 'fire_rate': ShipRenderers.drawFireRateIcon(g, color); break;
      case 'extra_bullets': ShipRenderers.drawExtraBulletsIcon(g, color); break;
      case 'move_speed': ShipRenderers.drawMoveSpeedIcon(g, color); break;
      case 'max_health': ShipRenderers.drawMaxHealthIcon(g, color); break;
      case 'magnet_range': ShipRenderers.drawMagnetRangeIcon(g, color); break;
      case 'scatter_gun': ShipRenderers.drawScatterGunIcon(g, color); break;
      case 'homing_missile': ShipRenderers.drawHomingMissileIcon(g, color); break;
    }
  }

  static drawBulletSpeedIcon(g: createjs.Graphics, color: string): void {
    g.setStrokeStyle(2).beginStroke(color);
    for (let i = -5; i <= 5; i += 5) {
      g.moveTo(i - 3, 4).lineTo(i, -4).lineTo(i + 3, 4);
    }
    g.endStroke();
  }

  static drawFireRateIcon(g: createjs.Graphics, color: string): void {
    g.beginFill(color)
      .moveTo(2, -8).lineTo(-2, -1).lineTo(1, -1)
      .lineTo(-2, 8).lineTo(4, 0).lineTo(1, 0).closePath();
  }

  static drawExtraBulletsIcon(g: createjs.Graphics, color: string): void {
    g.beginFill(color)
      .drawCircle(0, -5, 3).drawCircle(-5, 4, 3).drawCircle(5, 4, 3);
  }

  static drawMoveSpeedIcon(g: createjs.Graphics, color: string): void {
    g.beginFill(color)
      .moveTo(0, -6).lineTo(4, 4).lineTo(0, 2).lineTo(-4, 4).closePath();
    g.setStrokeStyle(1).beginStroke(color);
    g.moveTo(-7, -2).lineTo(-3, -2);
    g.moveTo(-8, 1).lineTo(-3, 1);
    g.moveTo(-7, 4).lineTo(-3, 4);
    g.endStroke();
  }

  static drawMaxHealthIcon(g: createjs.Graphics, color: string): void {
    g.beginFill(color)
      .drawRect(-2, -7, 4, 14).drawRect(-7, -2, 14, 4);
  }

  static drawMagnetRangeIcon(g: createjs.Graphics, color: string): void {
    g.setStrokeStyle(3).beginStroke(color);
    g.moveTo(-6, -6).lineTo(-6, 2)
      .arc(0, 2, 6, Math.PI, 0, false).lineTo(6, -6);
    g.endStroke();
    g.beginFill('#ff0000').drawRect(-8, -8, 5, 4);
    g.beginFill('#0000ff').drawRect(3, -8, 5, 4);
  }

  static drawScatterGunIcon(g: createjs.Graphics, color: string): void {
    g.setStrokeStyle(1.5).beginStroke(color);
    const baseY = 6;
    const tipY = -6;
    for (let i = -2; i <= 2; i++) {
      g.moveTo(0, baseY).lineTo(i * 4, tipY);
    }
    g.endStroke();
    g.beginFill(color).drawRect(-3, 4, 6, 4);
  }

  static drawHomingMissileIcon(g: createjs.Graphics, color: string): void {
    g.beginFill(color)
      .moveTo(0, -8).lineTo(2, -4).lineTo(2, 4).lineTo(4, 7)
      .lineTo(-4, 7).lineTo(-2, 4).lineTo(-2, -4).closePath();
    g.setStrokeStyle(1).beginStroke(color);
    g.arc(8, 0, 6, Math.PI * 0.7, Math.PI * 1.3, false);
    g.endStroke();
  }

  static drawCostOrb(g: createjs.Graphics, x: number, y: number, radius: number = 4): void {
    g.beginFill('rgba(0, 255, 136, 0.3)').drawCircle(x, y, radius + 2);
    g.beginFill('rgba(0, 255, 136, 0.8)').drawCircle(x, y, radius);
    g.beginFill('rgba(200, 255, 220, 1)').drawCircle(x, y, radius * 0.4);
  }
}
