import * as createjs from '@thegraid/createjs-module';
import { ShipBlueprint, ColorPalette } from '@types';

/**
 * Renders a ShipBlueprint to a createjs.Graphics context using a ColorPalette.
 */
export class BlueprintRenderer {
  /**
   * Iterate blueprint layers and issue Graphics API calls.
   */
  static render(g: createjs.Graphics, blueprint: ShipBlueprint, palette: ColorPalette): void {
    for (const layer of blueprint.layers) {
      const color = palette[layer.colorKey] || '#ff00ff'; // Magenta fallback for missing keys

      switch (layer.type) {
        case 'fill':
          if (layer.contour && layer.contour.points.length > 0) {
            g.beginFill(color);
            const pts = layer.contour.points;
            g.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              g.lineTo(pts[i].x, pts[i].y);
            }
            if (layer.contour.closed) {
              g.closePath();
            }
            g.endFill();
          }
          break;

        case 'stroke':
          if (layer.contour && layer.contour.points.length > 0) {
            g.setStrokeStyle(layer.strokeWidth || 1);
            g.beginStroke(color);
            const pts = layer.contour.points;
            g.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              g.lineTo(pts[i].x, pts[i].y);
            }
            g.endStroke();
          }
          break;

        case 'circle':
          g.beginFill(color);
          g.drawCircle(layer.cx || 0, layer.cy || 0, layer.rx || 5);
          g.endFill();
          break;

        case 'ellipse':
          g.beginFill(color);
          g.drawEllipse(
            (layer.cx || 0) - (layer.rx || 5),
            (layer.cy || 0) - (layer.ry || 5),
            (layer.rx || 5) * 2,
            (layer.ry || 5) * 2
          );
          g.endFill();
          break;
      }
    }
  }
}
