import * as createjs from '@thegraid/createjs-module';
import { Velocity } from '@types';

interface StarLayer {
  shape: createjs.Shape;
  parallaxFactor: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export class StarfieldBackground {
  private container: createjs.Container;
  private layers: StarLayer[] = [];
  private backgroundFill: createjs.Shape;
  private nebulaShape: createjs.Shape | null = null;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(stage: createjs.Stage, canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.container = new createjs.Container();

    // Solid background fill so the canvas is never transparent/empty
    this.backgroundFill = new createjs.Shape();
    this.drawBackgroundFill();
    this.container.addChild(this.backgroundFill);

    // Add nebula layer (static, very low alpha)
    this.createNebulaLayer();

    // Create 3 star layers with different densities and parallax speeds
    this.createStarLayer(120, 0.5, 1.0, 0.2, 0.4, 0.05); // Far (dim)
    this.createStarLayer(60,  1.0, 2.0, 0.4, 0.7, 0.15);  // Mid
    this.createStarLayer(20,  2.0, 3.0, 0.7, 1.0, 0.3);   // Near (bright)

    // Insert container behind all gameplay
    stage.addChildAt(this.container, 0);
  }

  private drawBackgroundFill(): void {
    this.backgroundFill.graphics.clear()
      .beginFill('#000811')
      .drawRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.backgroundFill.cache(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private createNebulaLayer(): void {
    const shape = new createjs.Shape();
    const g = shape.graphics;

    // 3 large, very faint nebula ellipses
    const nebulas = [
      { x: this.canvasWidth * 0.25, y: this.canvasHeight * 0.3, w: 400, h: 250, color: 'rgba(80, 40, 120, 0.04)' },
      { x: this.canvasWidth * 0.7, y: this.canvasHeight * 0.6, w: 350, h: 300, color: 'rgba(30, 60, 120, 0.04)' },
      { x: this.canvasWidth * 0.5, y: this.canvasHeight * 0.8, w: 300, h: 200, color: 'rgba(0, 100, 100, 0.05)' }
    ];

    for (const n of nebulas) {
      g.beginFill(n.color)
        .drawEllipse(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h);
    }

    shape.cache(0, 0, this.canvasWidth, this.canvasHeight);
    this.nebulaShape = shape;
    this.container.addChild(shape);
  }

  private createStarLayer(
    starCount: number,
    sizeMin: number,
    sizeMax: number,
    alphaMin: number,
    alphaMax: number,
    parallaxFactor: number
  ): void {
    // Make layer 2x canvas size so wrapping always covers the visible area
    const layerWidth = Math.ceil(this.canvasWidth * 2);
    const layerHeight = Math.ceil(this.canvasHeight * 2);

    const shape = new createjs.Shape();
    const g = shape.graphics;

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * layerWidth;
      const y = Math.random() * layerHeight;
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      const alpha = alphaMin + Math.random() * (alphaMax - alphaMin);

      g.beginFill(`rgba(255, 255, 255, ${alpha})`)
        .drawCircle(x, y, size);
    }

    // Cache for zero per-frame redraw cost
    shape.cache(0, 0, layerWidth, layerHeight);

    this.container.addChild(shape);
    this.layers.push({
      shape,
      parallaxFactor,
      offsetX: 0,
      offsetY: 0,
      width: layerWidth,
      height: layerHeight
    });
  }

  public update(playerVelocity: Velocity): void {
    for (const layer of this.layers) {
      // Move layers opposite to player velocity for parallax effect
      layer.offsetX -= playerVelocity.x * layer.parallaxFactor;
      layer.offsetY -= playerVelocity.y * layer.parallaxFactor;

      // Wrap at canvas dimensions (not layer dimensions) for seamless tiling
      layer.offsetX = ((layer.offsetX % this.canvasWidth) + this.canvasWidth) % this.canvasWidth;
      layer.offsetY = ((layer.offsetY % this.canvasHeight) + this.canvasHeight) % this.canvasHeight;

      // Position so the 2x-sized layer always covers [0, canvasWidth/Height]
      layer.shape.x = layer.offsetX - this.canvasWidth;
      layer.shape.y = layer.offsetY - this.canvasHeight;
    }
  }

  public resize(newWidth: number, newHeight: number): void {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;

    // Redraw background fill to new size
    this.drawBackgroundFill();

    // Remove old nebula and star layers
    if (this.nebulaShape) {
      this.container.removeChild(this.nebulaShape);
      this.nebulaShape = null;
    }
    for (const layer of this.layers) {
      this.container.removeChild(layer.shape);
    }
    this.layers = [];

    // Recreate
    this.createNebulaLayer();
    this.createStarLayer(120, 0.5, 1.0, 0.2, 0.4, 0.05);
    this.createStarLayer(60,  1.0, 2.0, 0.4, 0.7, 0.15);
    this.createStarLayer(20,  2.0, 3.0, 0.7, 1.0, 0.3);
  }

  public reset(): void {
    for (const layer of this.layers) {
      layer.offsetX = 0;
      layer.offsetY = 0;
      layer.shape.x = 0;
      layer.shape.y = 0;
    }
  }

  public getContainer(): createjs.Container {
    return this.container;
  }

  public destroy(): void {
    for (const layer of this.layers) {
      this.container.removeChild(layer.shape);
    }
    this.container.parent?.removeChild(this.container);
  }
}
