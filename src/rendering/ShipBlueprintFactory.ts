import { ShipBlueprint, DrawLayer, UpgradeSnapshot } from '@types';
import { WeaponType } from '@types';
import { ProceduralShipBuilder } from './ProceduralShipBuilder';

/**
 * Factory that composes ShipBlueprints for each entity type
 * using ProceduralShipBuilder helpers.
 */
export class ShipBlueprintFactory {
  // ─── Enemy Blueprints ──────────────────────────────────────

  /**
   * Chase enemy — arrowhead hull with seed-driven variation.
   * Seed varies wing sweep, adds 0-2 fin pairs, 0-1 notch pairs.
   * ~10-18 vertices.
   */
  static chaseEnemyBlueprint(seed: number): ShipBlueprint {
    const rng = ProceduralShipBuilder.seededRandom(seed);
    const layers: DrawLayer[] = [];

    // Vary wing sweep angle (how far out the wings extend)
    const wingSweep = 6 + rng() * 4; // 6-10 (base is 8)
    const wingTipY = 4 + rng() * 3; // 4-7 (base is 6)
    const noseY = -7 - rng() * 2; // -7 to -9

    // Build arrowhead hull using symmetricHull
    const hull = ProceduralShipBuilder.symmetricHull([
      { x: 0, y: noseY },           // Nose tip
      { x: 4, y: -2 },              // Right shoulder
      { x: wingSweep, y: wingTipY }, // Right wing tip
      { x: 5, y: 4 },               // Right wing notch
      { x: 3, y: 8 },               // Right engine
      { x: 0, y: 7 },               // Center rear (on centerline)
    ]);
    layers.push({ type: 'fill', contour: hull, colorKey: 'hull' });

    // Dark center stripe
    const stripe = ProceduralShipBuilder.symmetricHull([
      { x: 0, y: noseY + 2 },
      { x: 1.5, y: 0 },
      { x: 1, y: 6 },
      { x: 0, y: 6 },
    ]);
    layers.push({ type: 'fill', contour: stripe, colorKey: 'stripe' });

    // Seed-driven fin pairs (0-2)
    const finCount = Math.floor(rng() * 3); // 0, 1, or 2
    if (finCount > 0) {
      const finPositions = [-1, 3].slice(0, finCount);
      const fins = ProceduralShipBuilder.addFins(
        wingSweep - 1, finCount, 3, 2.5, finPositions, rng, 'accent'
      );
      layers.push(...fins);
    }

    // Seed-driven notch pairs (0-1)
    if (rng() > 0.5) {
      const notchY = 1 + rng() * 3;
      const notches = ProceduralShipBuilder.addNotches(
        wingSweep - 2, 1.5, [notchY], rng, 'shadow'
      );
      layers.push(...notches);
    }

    return { layers, boundingRadius: 10 };
  }

  /**
   * Circle shoot enemy — hexagonal turret with seed-driven detail ring and barrels.
   * ~24-30 vertices.
   */
  static circleShootEnemyBlueprint(seed: number): ShipBlueprint {
    const rng = ProceduralShipBuilder.seededRandom(seed);
    const layers: DrawLayer[] = [];

    // Outer hexagonal body
    const outerHex = ProceduralShipBuilder.regularPolygon(6, 9);
    layers.push({ type: 'fill', contour: outerHex, colorKey: 'hull' });

    // Inner hex detail
    const innerHex = ProceduralShipBuilder.regularPolygon(6, 5);
    layers.push({ type: 'fill', contour: innerHex, colorKey: 'inner' });

    // Main gun barrel (top) — length varies with seed
    const barrelLength = 5 + rng() * 3;
    const mainBarrel = ProceduralShipBuilder.addBarrels(1, -7, barrelLength, 3, 0, 'weapon');
    layers.push(...mainBarrel);

    // Side barrels — count varies (1-2 pairs)
    const sideBarrelCount = 1 + Math.floor(rng() * 2);
    if (sideBarrelCount >= 1) {
      const sideBarrels: DrawLayer[] = [];
      // First pair of side barrels
      const sb1: DrawLayer = {
        type: 'fill',
        contour: {
          points: [
            { x: 5, y: -5 },
            { x: 8, y: -5 },
            { x: 8, y: -3 },
            { x: 5, y: -3 },
          ],
          closed: true,
        },
        colorKey: 'weapon',
      };
      const sb1m: DrawLayer = {
        type: 'fill',
        contour: {
          points: [
            { x: -8, y: -5 },
            { x: -5, y: -5 },
            { x: -5, y: -3 },
            { x: -8, y: -3 },
          ],
          closed: true,
        },
        colorKey: 'weapon',
      };
      sideBarrels.push(sb1, sb1m);

      if (sideBarrelCount >= 2) {
        // Second pair of angled barrels
        const sb2: DrawLayer = {
          type: 'fill',
          contour: {
            points: [
              { x: 6, y: -1 },
              { x: 9, y: -2 },
              { x: 9, y: 0 },
              { x: 6, y: 1 },
            ],
            closed: true,
          },
          colorKey: 'weapon',
        };
        const sb2m: DrawLayer = {
          type: 'fill',
          contour: {
            points: [
              { x: -9, y: -2 },
              { x: -6, y: -1 },
              { x: -6, y: 1 },
              { x: -9, y: 0 },
            ],
            closed: true,
          },
          colorKey: 'weapon',
        };
        sideBarrels.push(sb2, sb2m);
      }
      layers.push(...sideBarrels);
    }

    // Seed-driven detail ring (varies in segments)
    const ringSegments = 4 + Math.floor(rng() * 4); // 4-7 segments
    const detailRing = ProceduralShipBuilder.addDetailRing(0, 0, 3, 4.5, ringSegments, 'detail');
    layers.push(...detailRing);

    return { layers, boundingRadius: 10 };
  }

  /**
   * Big shooter — large capital ship with seed-driven turrets and antenna.
   * ~30-40 vertices.
   */
  static bigShooterBlueprint(size: number, seed: number): ShipBlueprint {
    const rng = ProceduralShipBuilder.seededRandom(seed);
    const scale = size / 30;
    const layers: DrawLayer[] = [];

    // Outer glow circle
    layers.push({
      type: 'circle',
      cx: 0, cy: 0,
      rx: (size + 5) * 1.0,
      colorKey: 'glow',
    });

    // Multi-point hull polygon
    const hull = ProceduralShipBuilder.symmetricHull([
      { x: 0, y: -28 * scale },         // Prow
      { x: 8 * scale, y: -18 * scale },  // Right prow
      { x: 14 * scale, y: -8 * scale },  // Right sponson front
      { x: 22 * scale, y: 0 },           // Right wing
      { x: 18 * scale, y: 8 * scale },   // Right wing trail
      { x: 14 * scale, y: 12 * scale },  // Right engine block
      { x: 10 * scale, y: 20 * scale },  // Right exhaust
      { x: 0, y: 20 * scale },           // Center exhaust
    ]);
    layers.push({ type: 'fill', contour: hull, colorKey: 'hull' });

    // Bridge superstructure
    const bridge = ProceduralShipBuilder.symmetricHull([
      { x: 0, y: -16 * scale },
      { x: 6 * scale, y: -6 * scale },
      { x: 6 * scale, y: 6 * scale },
      { x: 0, y: 6 * scale },
    ]);
    layers.push({ type: 'fill', contour: bridge, colorKey: 'bridge' });

    // Engine glow ellipse
    layers.push({
      type: 'ellipse',
      cx: 0, cy: 20 * scale,
      rx: 8 * scale, ry: 4 * scale,
      colorKey: 'engine',
    });

    // Seed-driven turret polygons (1-3)
    const turretCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < turretCount; i++) {
      const ty = (-10 + i * 8) * scale;
      const tSize = (2 + rng() * 1.5) * scale;
      const turretSides = 4 + Math.floor(rng() * 3); // 4-6 sided turrets
      const turret = ProceduralShipBuilder.regularPolygon(turretSides, tSize);

      // Offset turret position
      const offsetX = (3 + rng() * 4) * scale;
      const rightTurret = {
        points: turret.points.map(p => ({ x: p.x + offsetX, y: p.y + ty })),
        closed: true,
      };
      const leftTurret = {
        points: turret.points.map(p => ({ x: -p.x - offsetX, y: p.y + ty })),
        closed: true,
      };
      layers.push({ type: 'fill', contour: rightTurret, colorKey: 'detail' });
      layers.push({ type: 'fill', contour: leftTurret, colorKey: 'detail' });
    }

    // Seed-driven antenna strokes (0-2)
    const antennaCount = Math.floor(rng() * 3);
    if (antennaCount > 0) {
      const antennas: Array<{ x: number; y: number; angle: number; length: number }> = [];
      for (let i = 0; i < antennaCount; i++) {
        const ax = (8 + rng() * 6) * scale;
        const ay = (-15 + i * 12) * scale;
        const aAngle = -Math.PI / 2 + (rng() - 0.5) * 0.5;
        antennas.push({ x: ax, y: ay, angle: aAngle, length: (4 + rng() * 3) * scale });
      }
      const antennaLayers = ProceduralShipBuilder.addAntennas(antennas, 'accent');
      layers.push(...antennaLayers);
    }

    return { layers, boundingRadius: size + 5 };
  }

  /**
   * Worm head — pentagon with mandible, eyes, seed varies jaw width and horn fins.
   */
  static wormHeadBlueprint(headSize: number, seed: number): ShipBlueprint {
    const rng = ProceduralShipBuilder.seededRandom(seed);
    const layers: DrawLayer[] = [];

    // Vary jaw width with seed
    const jawWidth = headSize * (0.9 + rng() * 0.3); // 90-120% of base

    // Pentagon head with mandible point
    const head: DrawLayer = {
      type: 'fill',
      contour: {
        points: [
          { x: 0, y: -headSize * 1.3 },       // Mandible tip
          { x: jawWidth, y: -headSize * 0.3 },  // Right jaw
          { x: headSize * 0.8, y: headSize },   // Right rear
          { x: -headSize * 0.8, y: headSize },  // Left rear
          { x: -jawWidth, y: -headSize * 0.3 }, // Left jaw
        ],
        closed: true,
      },
      colorKey: 'hull',
    };
    layers.push(head);

    // Eye dots
    layers.push({
      type: 'circle',
      cx: -headSize * 0.35, cy: -headSize * 0.1,
      rx: 1.5,
      colorKey: 'eye',
    });
    layers.push({
      type: 'circle',
      cx: headSize * 0.35, cy: -headSize * 0.1,
      rx: 1.5,
      colorKey: 'eye',
    });

    // Seed-driven horn fins (0-1 pair)
    if (rng() > 0.4) {
      const hornLen = 2 + rng() * 2;
      const hornY = -headSize * 0.5;
      const horns = ProceduralShipBuilder.addFins(
        jawWidth - 1, 1, hornLen, 1.5, [hornY], rng, 'accent'
      );
      layers.push(...horns);
    }

    return { layers, boundingRadius: headSize * 1.5 };
  }

  /**
   * Worm segment — simple hexagon, no seed variation.
   */
  static wormSegmentBlueprint(segmentSize: number): ShipBlueprint {
    const hex = ProceduralShipBuilder.regularPolygon(6, segmentSize);
    return {
      layers: [{ type: 'fill', contour: hex, colorKey: 'segment' }],
      boundingRadius: segmentSize,
    };
  }

  // ─── Player Blueprint ──────────────────────────────────────

  /**
   * Player ship — composed of base hull, cockpit, engine, weapon module,
   * and upgrade-driven additions.
   */
  static playerBlueprint(weaponType: WeaponType, upgrades: UpgradeSnapshot): ShipBlueprint {
    const layers: DrawLayer[] = [];

    // 1. Base hull (always) — swept-wing polygon matching current design
    const hull = ProceduralShipBuilder.symmetricHull([
      { x: 0, y: -14 },   // Nose tip
      { x: 4, y: -6 },    // Right neck
      { x: 12, y: 4 },    // Right wing tip
      { x: 10, y: 8 },    // Right wing trailing edge
      { x: 5, y: 6 },     // Right engine inner
      { x: 5, y: 12 },    // Right engine bottom
      { x: 3, y: 14 },    // Right exhaust corner
      { x: 0, y: 14 },    // Center exhaust
    ]);
    layers.push({ type: 'fill', contour: hull, colorKey: 'hull' });

    // 2. Cockpit canopy (always)
    const cockpit = ProceduralShipBuilder.symmetricHull([
      { x: 0, y: -10 },
      { x: 2.5, y: -4 },
      { x: 0, y: 0 },
    ]);
    layers.push({ type: 'fill', contour: cockpit, colorKey: 'cockpit' });

    // 3. Engine glow (always) — widens with MOVE_SPEED upgrades
    const engineWidth = 3 + Math.min(upgrades.moveSpeed, 3) * 0.8;
    const engineGlow: DrawLayer = {
      type: 'fill',
      contour: {
        points: [
          { x: -engineWidth, y: 12 },
          { x: 0, y: 18 + Math.min(upgrades.moveSpeed, 3) * 1.5 },
          { x: engineWidth, y: 12 },
        ],
        closed: true,
      },
      colorKey: 'engine',
    };
    layers.push(engineGlow);

    // 4. Wing stripes (always)
    const rightStripe: DrawLayer = {
      type: 'stroke',
      contour: {
        points: [{ x: 4, y: -5 }, { x: 11, y: 5 }],
        closed: false,
      },
      colorKey: 'stripe',
      strokeWidth: 0.8,
    };
    const leftStripe: DrawLayer = {
      type: 'stroke',
      contour: {
        points: [{ x: -4, y: -5 }, { x: -11, y: 5 }],
        closed: false,
      },
      colorKey: 'stripe',
      strokeWidth: 0.8,
    };
    layers.push(rightStripe, leftStripe);

    // 5. Weapon module (per weaponType)
    const weaponColorKey = `weapon_${weaponType}`;
    layers.push(...ShipBlueprintFactory.buildWeaponModule(weaponType, weaponColorKey));

    // 6. Upgrade additions (additive per upgrade count)
    layers.push(...ShipBlueprintFactory.buildUpgradeLayers(upgrades));

    return { layers, boundingRadius: 18 };
  }

  /**
   * Build weapon-specific visual module layers.
   */
  private static buildWeaponModule(weaponType: WeaponType, colorKey: string): DrawLayer[] {
    const layers: DrawLayer[] = [];

    switch (weaponType) {
      case WeaponType.LASER: {
        // Single thin barrel forward from nose
        const barrel: DrawLayer = {
          type: 'fill',
          contour: {
            points: [
              { x: -0.8, y: -18 },
              { x: 0.8, y: -18 },
              { x: 0.8, y: -13 },
              { x: -0.8, y: -13 },
            ],
            closed: true,
          },
          colorKey,
        };
        layers.push(barrel);
        break;
      }

      case WeaponType.DUB: {
        // Dual angled barrels with muzzle blocks
        const barrelWidth = 1.2;
        const barrelLen = 5;
        // Right barrel
        layers.push({
          type: 'fill',
          contour: {
            points: [
              { x: 2 - barrelWidth / 2, y: -14 - barrelLen },
              { x: 2 + barrelWidth / 2, y: -14 - barrelLen },
              { x: 2 + barrelWidth / 2, y: -13 },
              { x: 2 - barrelWidth / 2, y: -13 },
            ],
            closed: true,
          },
          colorKey,
        });
        // Left barrel
        layers.push({
          type: 'fill',
          contour: {
            points: [
              { x: -2 - barrelWidth / 2, y: -14 - barrelLen },
              { x: -2 + barrelWidth / 2, y: -14 - barrelLen },
              { x: -2 + barrelWidth / 2, y: -13 },
              { x: -2 - barrelWidth / 2, y: -13 },
            ],
            closed: true,
          },
          colorKey,
        });
        // Muzzle blocks
        layers.push({
          type: 'fill',
          contour: {
            points: [
              { x: 1, y: -20 }, { x: 3, y: -20 },
              { x: 3, y: -19 }, { x: 1, y: -19 },
            ],
            closed: true,
          },
          colorKey,
        });
        layers.push({
          type: 'fill',
          contour: {
            points: [
              { x: -3, y: -20 }, { x: -1, y: -20 },
              { x: -1, y: -19 }, { x: -3, y: -19 },
            ],
            closed: true,
          },
          colorKey,
        });
        break;
      }

      case WeaponType.CIRCLE: {
        // Ring detail around cockpit
        const ring = ProceduralShipBuilder.addDetailRing(0, -4, 3.5, 5, 6, colorKey);
        layers.push(...ring);
        // Orb circles at wing tips
        layers.push({ type: 'circle', cx: 11, cy: 4, rx: 2, colorKey });
        layers.push({ type: 'circle', cx: -11, cy: 4, rx: 2, colorKey });
        break;
      }

      case WeaponType.SCATTER: {
        // Fan of 3-5 short barrel strokes, wide muzzle
        const fanCount = 5;
        const spreadAngle = Math.PI / 6; // 30 degrees total
        for (let i = 0; i < fanCount; i++) {
          const angle = -Math.PI / 2 + (i - (fanCount - 1) / 2) * (spreadAngle / (fanCount - 1));
          const startR = 13;
          const endR = 17;
          layers.push({
            type: 'stroke',
            contour: {
              points: [
                { x: Math.cos(angle) * startR, y: Math.sin(angle) * startR },
                { x: Math.cos(angle) * endR, y: Math.sin(angle) * endR },
              ],
              closed: false,
            },
            colorKey,
            strokeWidth: 1.2,
          });
        }
        // Wide muzzle block
        layers.push({
          type: 'fill',
          contour: {
            points: [
              { x: -3, y: -14 }, { x: 3, y: -14 },
              { x: 4, y: -12 }, { x: -4, y: -12 },
            ],
            closed: true,
          },
          colorKey,
        });
        break;
      }

      case WeaponType.HOMING: {
        // Missile pod rectangles under wings
        const podWidth = 2.5;
        const podLen = 4;
        // Right pod
        layers.push({
          type: 'fill',
          contour: {
            points: [
              { x: 7, y: 2 }, { x: 7 + podWidth, y: 2 },
              { x: 7 + podWidth, y: 2 + podLen }, { x: 7, y: 2 + podLen },
            ],
            closed: true,
          },
          colorKey,
        });
        // Left pod
        layers.push({
          type: 'fill',
          contour: {
            points: [
              { x: -7 - podWidth, y: 2 }, { x: -7, y: 2 },
              { x: -7, y: 2 + podLen }, { x: -7 - podWidth, y: 2 + podLen },
            ],
            closed: true,
          },
          colorKey,
        });
        // Targeting dish behind cockpit
        const dish = ProceduralShipBuilder.addDetailRing(0, 2, 1.5, 3, 4, colorKey);
        layers.push(...dish);
        break;
      }
    }

    return layers;
  }

  /**
   * Build upgrade-driven visual additions.
   */
  private static buildUpgradeLayers(upgrades: UpgradeSnapshot): DrawLayer[] {
    const layers: DrawLayer[] = [];

    // BULLET_SPEED: accent stripe per wing per level (max 3)
    const bulletSpeedCount = Math.min(upgrades.bulletSpeed, 3);
    for (let i = 0; i < bulletSpeedCount; i++) {
      const offset = 1 + i * 1.5;
      // Right wing stripe
      layers.push({
        type: 'stroke',
        contour: {
          points: [
            { x: 4 + offset, y: -5 + offset * 0.3 },
            { x: 11, y: 5 + offset * 0.5 },
          ],
          closed: false,
        },
        colorKey: 'accent',
        strokeWidth: 0.6,
      });
      // Left wing stripe
      layers.push({
        type: 'stroke',
        contour: {
          points: [
            { x: -(4 + offset), y: -5 + offset * 0.3 },
            { x: -11, y: 5 + offset * 0.5 },
          ],
          closed: false,
        },
        colorKey: 'accent',
        strokeWidth: 0.6,
      });
    }

    // FIRE_RATE: heat vent notches on engine block sides
    const fireRateCount = Math.min(upgrades.fireRate, 3);
    for (let i = 0; i < fireRateCount; i++) {
      const ventY = 8 + i * 2;
      // Right vent
      layers.push({
        type: 'fill',
        contour: {
          points: [
            { x: 5, y: ventY - 0.5 },
            { x: 7, y: ventY - 0.3 },
            { x: 7, y: ventY + 0.3 },
            { x: 5, y: ventY + 0.5 },
          ],
          closed: true,
        },
        colorKey: 'shadow',
      });
      // Left vent
      layers.push({
        type: 'fill',
        contour: {
          points: [
            { x: -7, y: ventY - 0.3 },
            { x: -5, y: ventY - 0.5 },
            { x: -5, y: ventY + 0.5 },
            { x: -7, y: ventY + 0.3 },
          ],
          closed: true,
        },
        colorKey: 'shadow',
      });
    }

    // EXTRA_BULLETS: ammo pod circles near engine (symmetric)
    const ammoCount = Math.min(upgrades.extraBullets, 3);
    for (let i = 0; i < ammoCount; i++) {
      const podY = 10 + i * 2.5;
      layers.push({ type: 'circle', cx: 3, cy: podY, rx: 1.2, colorKey: 'detail' });
      layers.push({ type: 'circle', cx: -3, cy: podY, rx: 1.2, colorKey: 'detail' });
    }

    // MOVE_SPEED: thruster fins at rear (small triangles, max 3)
    const thrusterCount = Math.min(upgrades.moveSpeed, 3);
    if (thrusterCount > 0) {
      const thrusters = ProceduralShipBuilder.addEngineNacelles(
        12, 2.5, 2, thrusterCount, 'engine'
      );
      layers.push(...thrusters);
    }

    // MAX_HEALTH: armor plate trapezoids on hull flanks (max 3 pairs)
    const armorCount = Math.min(upgrades.maxHealth, 3);
    if (armorCount > 0) {
      const plates = ProceduralShipBuilder.addArmorPlates(
        10, armorCount,
        { min: -2, max: 8 },
        () => 0.5, // Deterministic for player
        'armor'
      );
      layers.push(...plates);
    }

    // MAGNET_RANGE: antenna strokes from wing tips
    const antennaCount = Math.min(upgrades.magnetRange, 3);
    if (antennaCount > 0) {
      const antennas: Array<{ x: number; y: number; angle: number; length: number }> = [];
      for (let i = 0; i < antennaCount; i++) {
        const angle = -Math.PI / 4 - i * 0.15;
        antennas.push({
          x: 11 + i * 0.5, y: 4,
          angle, length: 4 + i * 1.5,
        });
      }
      const antennaLayers = ProceduralShipBuilder.addAntennas(antennas, 'accent');
      layers.push(...antennaLayers);
    }

    return layers;
  }
}
