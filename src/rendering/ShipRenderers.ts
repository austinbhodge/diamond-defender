import * as createjs from '@thegraid/createjs-module';

export class ShipRenderers {
  /**
   * Player ship — sleek fighter with swept wings, cockpit, and engine glow.
   * ~28px tall, 24px wide, drawn at origin facing UP (nose at negative Y).
   */
  static drawPlayer(g: createjs.Graphics, flash: boolean = false): void {
    const hullColor = flash ? 'rgb(255, 100, 100)' : 'rgb(0, 180, 174)';
    const cockpitColor = flash ? 'rgb(200, 60, 60)' : 'rgb(0, 120, 130)';
    const engineColor = flash ? 'rgba(255, 150, 150, 0.6)' : 'rgba(100, 255, 240, 0.6)';
    const stripeColor = flash ? 'rgba(255, 180, 180, 0.5)' : 'rgba(160, 255, 245, 0.5)';

    // Hull polygon — pointed nose, swept wings, engine blocks
    g.beginFill(hullColor)
      .moveTo(0, -14)       // Nose tip
      .lineTo(4, -6)        // Right neck
      .lineTo(12, 4)        // Right wing tip
      .lineTo(10, 8)        // Right wing trailing edge
      .lineTo(5, 6)         // Right engine inner
      .lineTo(5, 12)        // Right engine bottom
      .lineTo(3, 14)        // Right exhaust corner
      .lineTo(-3, 14)       // Left exhaust corner
      .lineTo(-5, 12)       // Left engine bottom
      .lineTo(-5, 6)        // Left engine inner
      .lineTo(-10, 8)       // Left wing trailing edge
      .lineTo(-12, 4)       // Left wing tip
      .lineTo(-4, -6)       // Left neck
      .closePath();

    // Cockpit canopy
    g.beginFill(cockpitColor)
      .moveTo(0, -10)
      .lineTo(2.5, -4)
      .lineTo(0, 0)
      .lineTo(-2.5, -4)
      .closePath();

    // Engine glow
    g.beginFill(engineColor)
      .moveTo(-3, 12)
      .lineTo(0, 18)
      .lineTo(3, 12)
      .closePath();

    // Wing stripes
    g.setStrokeStyle(0.8)
      .beginStroke(stripeColor)
      .moveTo(4, -5).lineTo(11, 5)
      .endStroke()
      .beginStroke(stripeColor)
      .moveTo(-4, -5).lineTo(-11, 5)
      .endStroke();
  }

  /**
   * Chase enemy — aggressive arrowhead interceptor.
   * ~16px tall, dark red.
   */
  static drawChaseEnemy(g: createjs.Graphics, flash: boolean = false): void {
    const mainColor = flash ? 'rgb(255, 255, 255)' : 'rgb(180, 0, 0)';
    const stripeColor = flash ? 'rgb(220, 220, 220)' : 'rgb(100, 0, 0)';

    // Angular arrowhead hull
    g.beginFill(mainColor)
      .moveTo(0, -8)        // Nose
      .lineTo(4, -2)        // Right shoulder
      .lineTo(8, 6)         // Right wing tip
      .lineTo(5, 4)         // Right wing notch
      .lineTo(3, 8)         // Right engine
      .lineTo(-3, 8)        // Left engine
      .lineTo(-5, 4)        // Left wing notch
      .lineTo(-8, 6)        // Left wing tip
      .lineTo(-4, -2)       // Left shoulder
      .closePath();

    // Dark center stripe
    g.beginFill(stripeColor)
      .moveTo(0, -6)
      .lineTo(1.5, 0)
      .lineTo(1, 6)
      .lineTo(-1, 6)
      .lineTo(-1.5, 0)
      .closePath();
  }

  /**
   * Circle shoot enemy — hexagonal turret gunship.
   * ~18px wide, orange with gun barrel.
   */
  static drawCircleShootEnemy(g: createjs.Graphics, flash: boolean = false): void {
    const outerColor = flash ? 'rgb(255, 255, 255)' : 'rgb(200, 100, 20)';
    const innerColor = flash ? 'rgb(220, 220, 220)' : 'rgb(140, 60, 10)';
    const barrelColor = flash ? 'rgb(200, 200, 200)' : 'rgb(160, 80, 15)';

    // Outer hexagonal body
    g.beginFill(outerColor);
    ShipRenderers.drawHexagon(g, 0, 0, 9);

    // Inner hex detail
    g.beginFill(innerColor);
    ShipRenderers.drawHexagon(g, 0, 0, 5);

    // Gun barrel (top)
    g.beginFill(barrelColor)
      .drawRect(-1.5, -14, 3, 7);

    // Small side barrels
    g.beginFill(barrelColor)
      .drawRect(-8, -5, 3, 2)
      .drawRect(5, -5, 3, 2);
  }

  /**
   * Big shooter — large capital ship / battleship.
   * Base ~60px, scaled by size/30.
   */
  static drawBigShooter(g: createjs.Graphics, size: number, flash: boolean = false): void {
    const scale = size / 30;
    const glowColor = flash ? 'rgba(255, 255, 255, 0.2)' : 'rgba(200, 0, 0, 0.25)';
    const hullColor = flash ? 'rgb(255, 255, 255)' : 'rgb(180, 0, 0)';
    const bridgeColor = flash ? 'rgb(220, 220, 220)' : 'rgb(220, 50, 50)';
    const engineColor = flash ? 'rgba(255, 200, 200, 0.5)' : 'rgba(255, 100, 50, 0.5)';

    // Outer glow circle
    g.beginFill(glowColor)
      .drawCircle(0, 0, (size + 5) * 1.0);

    // Multi-point hull polygon
    const s = scale;
    g.beginFill(hullColor)
      .moveTo(0, -28 * s)       // Prow
      .lineTo(8 * s, -18 * s)   // Right prow
      .lineTo(14 * s, -8 * s)   // Right sponson front
      .lineTo(22 * s, 0)        // Right wing
      .lineTo(18 * s, 8 * s)    // Right wing trail
      .lineTo(14 * s, 12 * s)   // Right engine block
      .lineTo(10 * s, 20 * s)   // Right exhaust
      .lineTo(-10 * s, 20 * s)  // Left exhaust
      .lineTo(-14 * s, 12 * s)  // Left engine block
      .lineTo(-18 * s, 8 * s)   // Left wing trail
      .lineTo(-22 * s, 0)       // Left wing
      .lineTo(-14 * s, -8 * s)  // Left sponson front
      .lineTo(-8 * s, -18 * s)  // Left prow
      .closePath();

    // Bridge superstructure
    g.beginFill(bridgeColor)
      .moveTo(0, -16 * s)
      .lineTo(6 * s, -6 * s)
      .lineTo(6 * s, 6 * s)
      .lineTo(-6 * s, 6 * s)
      .lineTo(-6 * s, -6 * s)
      .closePath();

    // Engine glow ellipse
    g.beginFill(engineColor)
      .drawEllipse(-8 * s, 16 * s, 16 * s, 8 * s);
  }

  /**
   * Dash worm head — pentagon with mandible and eye dots.
   */
  static drawWormHead(g: createjs.Graphics, headSize: number, flash: boolean = false): void {
    const mainColor = flash ? 'rgb(255, 255, 255)' : 'rgb(200, 0, 0)';
    const eyeColor = flash ? 'rgb(200, 200, 200)' : 'rgb(255, 255, 0)';

    // Pentagon head with mandible point
    g.beginFill(mainColor)
      .moveTo(0, -headSize * 1.3) // Mandible tip
      .lineTo(headSize, -headSize * 0.3)
      .lineTo(headSize * 0.8, headSize)
      .lineTo(-headSize * 0.8, headSize)
      .lineTo(-headSize, -headSize * 0.3)
      .closePath();

    // Eye dots
    g.beginFill(eyeColor)
      .drawCircle(-headSize * 0.35, -headSize * 0.1, 1.5)
      .drawCircle(headSize * 0.35, -headSize * 0.1, 1.5);
  }

  /**
   * Dash worm body segment — hexagonal shape.
   */
  static drawWormSegment(g: createjs.Graphics, segmentSize: number, alpha: number, flash: boolean = false): void {
    const r = flash ? 255 : 180;
    const green = flash ? 255 : 20;
    const blue = flash ? 255 : 20;
    g.beginFill(`rgba(${r}, ${green}, ${blue}, ${alpha})`);
    ShipRenderers.drawHexagon(g, 0, 0, segmentSize);
  }

  /**
   * Sci-fi crosshair / targeting reticle.
   */
  static drawCrosshair(g: createjs.Graphics, animPhase: number): void {
    const outerRadius = 15;
    const innerRadius = 6;
    const tickLen = 4;
    const color = 'rgb(0, 232, 255)';
    const dimColor = 'rgba(0, 232, 255, 0.5)';

    // Outer ring
    g.setStrokeStyle(1.2)
      .beginStroke(color)
      .drawCircle(0, 0, outerRadius)
      .endStroke();

    // Inner ring
    g.setStrokeStyle(0.8)
      .beginStroke(color)
      .drawCircle(0, 0, innerRadius)
      .endStroke();

    // Cardinal tick marks (N/S/E/W)
    g.setStrokeStyle(1.5)
      .beginStroke(color);
    // North
    g.moveTo(0, -outerRadius).lineTo(0, -outerRadius - tickLen);
    // South
    g.moveTo(0, outerRadius).lineTo(0, outerRadius + tickLen);
    // East
    g.moveTo(outerRadius, 0).lineTo(outerRadius + tickLen, 0);
    // West
    g.moveTo(-outerRadius, 0).lineTo(-outerRadius - tickLen, 0);
    g.endStroke();

    // Diagonal ticks (rotate with animPhase)
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

    // Center dot
    g.beginFill(color)
      .drawCircle(0, 0, 1.5);
  }

  /**
   * Enhanced laser projectile — cyan rectangle with brighter core.
   */
  static drawLaserProjectile(g: createjs.Graphics): void {
    // Outer glow
    g.beginFill('rgba(107, 233, 255, 0.3)')
      .drawRect(-1, 0, 4, 22);

    // Main body
    g.beginFill('rgb(107, 233, 255)')
      .drawRect(0, 0, 2, 22);

    // Bright core line
    g.beginFill('rgba(200, 255, 255, 0.9)')
      .drawRect(0.5, 1, 1, 20);
  }

  /**
   * Enhanced dub projectile — layered fills.
   */
  static drawDubProjectile(g: createjs.Graphics, amplitude: number): void {
    // Dimmer outer edge
    g.beginFill('rgba(80, 200, 235, 0.4)')
      .drawRect(0, -1, amplitude, 8);

    // Main body
    g.beginFill('rgb(107, 233, 255)')
      .drawRect(0, 0, amplitude, 6);

    // Bright center strip
    g.beginFill('rgba(200, 255, 255, 0.7)')
      .drawRect(0, 2, amplitude, 2);
  }

  /**
   * Enhanced circle projectile — with inner bright center.
   */
  static drawCircleProjectile(g: createjs.Graphics, size: number): void {
    // Outer glow
    g.beginFill('rgba(138, 43, 226, 0.3)')
      .drawCircle(0, 0, size + 2);

    // Main body
    g.beginFill('rgb(138, 43, 226)')
      .drawCircle(0, 0, size);

    // Bright center
    g.beginFill('rgba(200, 140, 255, 0.9)')
      .drawCircle(0, 0, size * 0.4);
  }

  // ─── Space Port Icon Renderers ───────────────────────────────────

  /**
   * Dispatcher: draws the appropriate icon for a space port.
   */
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

  /** Three stacked arrows pointing up */
  static drawBulletSpeedIcon(g: createjs.Graphics, color: string): void {
    g.setStrokeStyle(2).beginStroke(color);
    // Three upward arrows
    for (let i = -5; i <= 5; i += 5) {
      g.moveTo(i - 3, 4).lineTo(i, -4).lineTo(i + 3, 4);
    }
    g.endStroke();
  }

  /** Lightning bolt */
  static drawFireRateIcon(g: createjs.Graphics, color: string): void {
    g.beginFill(color)
      .moveTo(2, -8)
      .lineTo(-2, -1)
      .lineTo(1, -1)
      .lineTo(-2, 8)
      .lineTo(4, 0)
      .lineTo(1, 0)
      .closePath();
  }

  /** Three small circles in triangle arrangement */
  static drawExtraBulletsIcon(g: createjs.Graphics, color: string): void {
    g.beginFill(color)
      .drawCircle(0, -5, 3)
      .drawCircle(-5, 4, 3)
      .drawCircle(5, 4, 3);
  }

  /** Small ship with speed lines */
  static drawMoveSpeedIcon(g: createjs.Graphics, color: string): void {
    // Mini ship
    g.beginFill(color)
      .moveTo(0, -6)
      .lineTo(4, 4)
      .lineTo(0, 2)
      .lineTo(-4, 4)
      .closePath();
    // Speed lines
    g.setStrokeStyle(1).beginStroke(color);
    g.moveTo(-7, -2).lineTo(-3, -2);
    g.moveTo(-8, 1).lineTo(-3, 1);
    g.moveTo(-7, 4).lineTo(-3, 4);
    g.endStroke();
  }

  /** Plus/cross symbol */
  static drawMaxHealthIcon(g: createjs.Graphics, color: string): void {
    g.beginFill(color)
      .drawRect(-2, -7, 4, 14)  // Vertical bar
      .drawRect(-7, -2, 14, 4); // Horizontal bar
  }

  /** U-shaped magnet */
  static drawMagnetRangeIcon(g: createjs.Graphics, color: string): void {
    g.setStrokeStyle(3).beginStroke(color);
    g.moveTo(-6, -6)
      .lineTo(-6, 2)
      .arc(0, 2, 6, Math.PI, 0, false)
      .lineTo(6, -6);
    g.endStroke();
    // Magnet tips
    g.beginFill('#ff0000').drawRect(-8, -8, 5, 4);
    g.beginFill('#0000ff').drawRect(3, -8, 5, 4);
  }

  /** Fan of 5 lines from a point */
  static drawScatterGunIcon(g: createjs.Graphics, color: string): void {
    g.setStrokeStyle(1.5).beginStroke(color);
    const baseY = 6;
    const tipY = -6;
    for (let i = -2; i <= 2; i++) {
      g.moveTo(0, baseY).lineTo(i * 4, tipY);
    }
    g.endStroke();
    // Nozzle base
    g.beginFill(color).drawRect(-3, 4, 6, 4);
  }

  /** Missile shape with tracking arc */
  static drawHomingMissileIcon(g: createjs.Graphics, color: string): void {
    // Missile body
    g.beginFill(color)
      .moveTo(0, -8)
      .lineTo(2, -4)
      .lineTo(2, 4)
      .lineTo(4, 7)
      .lineTo(-4, 7)
      .lineTo(-2, 4)
      .lineTo(-2, -4)
      .closePath();
    // Tracking arc
    g.setStrokeStyle(1).beginStroke(color);
    g.arc(8, 0, 6, Math.PI * 0.7, Math.PI * 1.3, false);
    g.endStroke();
  }

  /**
   * Draws a small green cost orb matching ExperienceOrb style.
   */
  static drawCostOrb(g: createjs.Graphics, x: number, y: number, radius: number = 4): void {
    // Outer glow
    g.beginFill('rgba(0, 255, 136, 0.3)')
      .drawCircle(x, y, radius + 2);
    // Inner fill
    g.beginFill('rgba(0, 255, 136, 0.8)')
      .drawCircle(x, y, radius);
    // Bright center
    g.beginFill('rgba(200, 255, 220, 1)')
      .drawCircle(x, y, radius * 0.4);
  }

  /** Scatter projectile — small orange rectangle */
  static drawScatterProjectile(g: createjs.Graphics): void {
    // Outer glow
    g.beginFill('rgba(255, 102, 0, 0.3)')
      .drawRect(-2, 0, 5, 14);
    // Main body
    g.beginFill('rgb(255, 102, 0)')
      .drawRect(-1, 0, 3, 14);
    // Bright core
    g.beginFill('rgba(255, 200, 100, 0.9)')
      .drawRect(0, 1, 1, 12);
  }

  /** Homing projectile — pink/magenta diamond */
  static drawHomingProjectile(g: createjs.Graphics): void {
    // Outer glow
    g.beginFill('rgba(255, 0, 255, 0.3)')
      .moveTo(0, -8)
      .lineTo(5, 0)
      .lineTo(0, 8)
      .lineTo(-5, 0)
      .closePath();
    // Main body
    g.beginFill('rgb(255, 0, 255)')
      .moveTo(0, -6)
      .lineTo(3.5, 0)
      .lineTo(0, 6)
      .lineTo(-3.5, 0)
      .closePath();
    // Bright center
    g.beginFill('rgba(255, 180, 255, 0.9)')
      .moveTo(0, -3)
      .lineTo(1.5, 0)
      .lineTo(0, 3)
      .lineTo(-1.5, 0)
      .closePath();
  }

  /** Helper: draw a regular hexagon at (cx, cy) with radius r. */
  private static drawHexagon(g: createjs.Graphics, cx: number, cy: number, r: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) {
        g.moveTo(px, py);
      } else {
        g.lineTo(px, py);
      }
    }
    g.closePath();
  }
}
