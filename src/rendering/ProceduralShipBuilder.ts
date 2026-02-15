import { PolyContour, DrawLayer } from '@types';

/**
 * Core geometry engine for procedural ship generation.
 * Provides seeded PRNG, polygon construction, and decorative element generators.
 */
export class ProceduralShipBuilder {
  /**
   * Mulberry32 seeded PRNG. Returns a deterministic () => number function
   * that produces values in [0, 1).
   */
  static seededRandom(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Generate a regular n-gon as a PolyContour.
   * Points start at top (negative Y) and go clockwise.
   */
  static regularPolygon(n: number, radius: number, rotationOffset: number = -Math.PI / 2): PolyContour {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const angle = rotationOffset + (2 * Math.PI * i) / n;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return { points, closed: true };
  }

  /**
   * Takes right-side points from nose to tail, mirrors them to produce
   * a full symmetric polygon. Points should be ordered top-to-bottom
   * on the right side (positive X). The left side is generated automatically.
   */
  static symmetricHull(rightHalfPoints: Array<{ x: number; y: number }>): PolyContour {
    const points: Array<{ x: number; y: number }> = [];

    // Add right side points as-is
    for (const p of rightHalfPoints) {
      points.push({ x: p.x, y: p.y });
    }

    // Mirror left side (skip first and last if they're on the centerline)
    for (let i = rightHalfPoints.length - 1; i >= 0; i--) {
      const p = rightHalfPoints[i];
      // Skip points on the centerline (x === 0) to avoid duplicates
      if (Math.abs(p.x) > 0.01) {
        points.push({ x: -p.x, y: p.y });
      }
    }

    return { points, closed: true };
  }

  /**
   * Generate symmetric fin pairs as DrawLayers.
   * Fins are small triangular protrusions at specified Y positions.
   */
  static addFins(
    baseRadius: number,
    finCount: number,
    finLength: number,
    finWidth: number,
    yPositions: number[],
    rng: () => number,
    colorKey: string = 'accent'
  ): DrawLayer[] {
    const layers: DrawLayer[] = [];

    for (let i = 0; i < Math.min(finCount, yPositions.length); i++) {
      const y = yPositions[i];
      const lengthVar = finLength * (0.8 + rng() * 0.4);
      const widthVar = finWidth * (0.8 + rng() * 0.4);

      // Right fin
      const rightFin: PolyContour = {
        points: [
          { x: baseRadius - 1, y: y - widthVar / 2 },
          { x: baseRadius + lengthVar, y: y },
          { x: baseRadius - 1, y: y + widthVar / 2 },
        ],
        closed: true,
      };

      // Left fin (mirrored)
      const leftFin: PolyContour = {
        points: [
          { x: -(baseRadius - 1), y: y - widthVar / 2 },
          { x: -(baseRadius + lengthVar), y: y },
          { x: -(baseRadius - 1), y: y + widthVar / 2 },
        ],
        closed: true,
      };

      layers.push({ type: 'fill', contour: rightFin, colorKey });
      layers.push({ type: 'fill', contour: leftFin, colorKey });
    }

    return layers;
  }

  /**
   * Generate notch modifications to a hull contour.
   * Returns new DrawLayers representing inset notches on both sides.
   */
  static addNotches(
    hullWidth: number,
    notchDepth: number,
    yPositions: number[],
    rng: () => number,
    colorKey: string = 'shadow'
  ): DrawLayer[] {
    const layers: DrawLayer[] = [];
    const notchWidth = 2 + rng() * 2;

    for (const y of yPositions) {
      const depth = notchDepth * (0.7 + rng() * 0.6);

      // Right notch (dark rectangle inset)
      const rightNotch: PolyContour = {
        points: [
          { x: hullWidth - depth, y: y - notchWidth },
          { x: hullWidth + 0.5, y: y - notchWidth },
          { x: hullWidth + 0.5, y: y + notchWidth },
          { x: hullWidth - depth, y: y + notchWidth },
        ],
        closed: true,
      };

      // Left notch
      const leftNotch: PolyContour = {
        points: [
          { x: -(hullWidth - depth), y: y - notchWidth },
          { x: -(hullWidth + 0.5), y: y - notchWidth },
          { x: -(hullWidth + 0.5), y: y + notchWidth },
          { x: -(hullWidth - depth), y: y + notchWidth },
        ],
        closed: true,
      };

      layers.push({ type: 'fill', contour: rightNotch, colorKey });
      layers.push({ type: 'fill', contour: leftNotch, colorKey });
    }

    return layers;
  }

  /**
   * Generate pointed spike protrusions radiating outward.
   */
  static addSpikes(
    count: number,
    baseRadius: number,
    spikeLength: number,
    rng: () => number,
    colorKey: string = 'accent'
  ): DrawLayer[] {
    const layers: DrawLayer[] = [];
    const angleStep = (2 * Math.PI) / count;
    const startAngle = rng() * angleStep;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      const len = spikeLength * (0.7 + rng() * 0.6);
      const halfWidth = 1.5 + rng() * 1.5;

      const tipX = Math.cos(angle) * (baseRadius + len);
      const tipY = Math.sin(angle) * (baseRadius + len);
      const perpX = -Math.sin(angle) * halfWidth;
      const perpY = Math.cos(angle) * halfWidth;
      const baseX = Math.cos(angle) * (baseRadius - 1);
      const baseY = Math.sin(angle) * (baseRadius - 1);

      const spike: PolyContour = {
        points: [
          { x: baseX + perpX, y: baseY + perpY },
          { x: tipX, y: tipY },
          { x: baseX - perpX, y: baseY - perpY },
        ],
        closed: true,
      };

      layers.push({ type: 'fill', contour: spike, colorKey });
    }

    return layers;
  }

  /**
   * Generate gun barrel rectangles, symmetric about the Y axis.
   */
  static addBarrels(
    count: number,
    baseY: number,
    length: number,
    width: number,
    spacing: number,
    colorKey: string = 'weapon'
  ): DrawLayer[] {
    const layers: DrawLayer[] = [];

    if (count === 1) {
      // Single center barrel
      const barrel: PolyContour = {
        points: [
          { x: -width / 2, y: baseY - length },
          { x: width / 2, y: baseY - length },
          { x: width / 2, y: baseY },
          { x: -width / 2, y: baseY },
        ],
        closed: true,
      };
      layers.push({ type: 'fill', contour: barrel, colorKey });
    } else {
      // Symmetric barrel pairs
      const pairCount = Math.ceil(count / 2);
      for (let i = 0; i < pairCount; i++) {
        const offsetX = spacing * (i + 1);

        // Right barrel
        const rightBarrel: PolyContour = {
          points: [
            { x: offsetX - width / 2, y: baseY - length },
            { x: offsetX + width / 2, y: baseY - length },
            { x: offsetX + width / 2, y: baseY },
            { x: offsetX - width / 2, y: baseY },
          ],
          closed: true,
        };

        // Left barrel
        const leftBarrel: PolyContour = {
          points: [
            { x: -offsetX - width / 2, y: baseY - length },
            { x: -offsetX + width / 2, y: baseY - length },
            { x: -offsetX + width / 2, y: baseY },
            { x: -offsetX - width / 2, y: baseY },
          ],
          closed: true,
        };

        layers.push({ type: 'fill', contour: rightBarrel, colorKey });
        layers.push({ type: 'fill', contour: leftBarrel, colorKey });
      }
    }

    return layers;
  }

  /**
   * Generate trapezoidal armor plate overlays on hull flanks.
   */
  static addArmorPlates(
    hullRadius: number,
    plateCount: number,
    yRange: { min: number; max: number },
    rng: () => number,
    colorKey: string = 'armor'
  ): DrawLayer[] {
    const layers: DrawLayer[] = [];
    const ySpan = yRange.max - yRange.min;
    const plateHeight = (ySpan / plateCount) * 0.7;

    for (let i = 0; i < plateCount; i++) {
      const y = yRange.min + (ySpan * (i + 0.5)) / plateCount;
      const innerWidth = hullRadius * (0.6 + rng() * 0.2);
      const outerWidth = hullRadius * (0.9 + rng() * 0.2);

      // Right plate (trapezoid)
      const rightPlate: PolyContour = {
        points: [
          { x: innerWidth, y: y - plateHeight / 2 },
          { x: outerWidth, y: y - plateHeight / 3 },
          { x: outerWidth, y: y + plateHeight / 3 },
          { x: innerWidth, y: y + plateHeight / 2 },
        ],
        closed: true,
      };

      // Left plate
      const leftPlate: PolyContour = {
        points: [
          { x: -innerWidth, y: y - plateHeight / 2 },
          { x: -outerWidth, y: y - plateHeight / 3 },
          { x: -outerWidth, y: y + plateHeight / 3 },
          { x: -innerWidth, y: y + plateHeight / 2 },
        ],
        closed: true,
      };

      layers.push({ type: 'fill', contour: rightPlate, colorKey });
      layers.push({ type: 'fill', contour: leftPlate, colorKey });
    }

    return layers;
  }

  /**
   * Generate engine nacelle triangles/ellipses at the rear of the ship.
   */
  static addEngineNacelles(
    baseY: number,
    spacing: number,
    size: number,
    count: number,
    colorKey: string = 'engine'
  ): DrawLayer[] {
    const layers: DrawLayer[] = [];

    for (let i = 0; i < count; i++) {
      const offsetX = spacing * (i + 1);

      // Right nacelle (small triangle)
      const rightNacelle: PolyContour = {
        points: [
          { x: offsetX, y: baseY - size },
          { x: offsetX + size * 0.6, y: baseY + size },
          { x: offsetX - size * 0.6, y: baseY + size },
        ],
        closed: true,
      };

      // Left nacelle
      const leftNacelle: PolyContour = {
        points: [
          { x: -offsetX, y: baseY - size },
          { x: -offsetX + size * 0.6, y: baseY + size },
          { x: -offsetX - size * 0.6, y: baseY + size },
        ],
        closed: true,
      };

      layers.push({ type: 'fill', contour: rightNacelle, colorKey });
      layers.push({ type: 'fill', contour: leftNacelle, colorKey });
    }

    return layers;
  }

  /**
   * Generate a segmented detail ring (for turrets, cockpits).
   */
  static addDetailRing(
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    segments: number,
    colorKey: string = 'detail'
  ): DrawLayer[] {
    const layers: DrawLayer[] = [];
    const gapAngle = 0.15; // Gap between segments in radians
    const segmentAngle = (2 * Math.PI) / segments - gapAngle;

    for (let i = 0; i < segments; i++) {
      const startAngle = (2 * Math.PI * i) / segments;
      const endAngle = startAngle + segmentAngle;

      // Each segment is a small arc approximated as a quad
      const cos1 = Math.cos(startAngle);
      const sin1 = Math.sin(startAngle);
      const cos2 = Math.cos(endAngle);
      const sin2 = Math.sin(endAngle);

      const segment: PolyContour = {
        points: [
          { x: cx + cos1 * innerR, y: cy + sin1 * innerR },
          { x: cx + cos1 * outerR, y: cy + sin1 * outerR },
          { x: cx + cos2 * outerR, y: cy + sin2 * outerR },
          { x: cx + cos2 * innerR, y: cy + sin2 * innerR },
        ],
        closed: true,
      };

      layers.push({ type: 'fill', contour: segment, colorKey });
    }

    return layers;
  }

  /**
   * Generate antenna stroke lines from specified positions.
   */
  static addAntennas(
    positions: Array<{ x: number; y: number; angle: number; length: number }>,
    colorKey: string = 'accent'
  ): DrawLayer[] {
    const layers: DrawLayer[] = [];

    for (const pos of positions) {
      const endX = pos.x + Math.cos(pos.angle) * pos.length;
      const endY = pos.y + Math.sin(pos.angle) * pos.length;

      const antenna: PolyContour = {
        points: [
          { x: pos.x, y: pos.y },
          { x: endX, y: endY },
        ],
        closed: false,
      };

      layers.push({ type: 'stroke', contour: antenna, colorKey, strokeWidth: 0.8 });

      // Mirrored antenna
      const mirroredAntenna: PolyContour = {
        points: [
          { x: -pos.x, y: pos.y },
          { x: -endX, y: endY },
        ],
        closed: false,
      };

      layers.push({ type: 'stroke', contour: mirroredAntenna, colorKey, strokeWidth: 0.8 });
    }

    return layers;
  }
}
