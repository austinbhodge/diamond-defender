import { Position } from '../types/index';

export interface ViewportDimensions {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export interface ResponsivePosition {
  x: number;
  y: number;
  anchorX?: 'left' | 'center' | 'right';
  anchorY?: 'top' | 'center' | 'bottom';
}

export class ViewportManager {
  private canvas: HTMLCanvasElement;
  private stage: createjs.Stage;
  private targetWidth: number;
  private targetHeight: number;
  private targetAspectRatio: number;
  private minWidth: number;
  private maxWidth: number;
  private currentDimensions: ViewportDimensions;
  private resizeCallbacks: Array<(dimensions: ViewportDimensions) => void> = [];

  constructor(
    canvas: HTMLCanvasElement,
    stage: createjs.Stage,
    targetWidth: number = 1400,
    targetHeight: number = 800,
    minWidth: number = 800,
    maxWidth: number = 1920
  ) {
    this.canvas = canvas;
    this.stage = stage;
    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;
    this.targetAspectRatio = targetWidth / targetHeight;
    this.minWidth = minWidth;
    this.maxWidth = maxWidth;

    this.currentDimensions = {
      width: targetWidth,
      height: targetHeight,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0
    };

    this.setupResizeListener();
    this.updateViewport();
  }

  private setupResizeListener(): void {
    const handleResize = () => {
      this.updateViewport();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      // Delay to account for mobile orientation change
      setTimeout(handleResize, 100);
    });
  }

  public updateViewport(): void {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    // Calculate the best fit while maintaining aspect ratio
    let canvasWidth = containerWidth;
    let canvasHeight = containerWidth / this.targetAspectRatio;

    // If height exceeds container, scale by height instead
    if (canvasHeight > containerHeight) {
      canvasHeight = containerHeight;
      canvasWidth = containerHeight * this.targetAspectRatio;
    }

    // Enforce min/max constraints
    canvasWidth = Math.max(this.minWidth, Math.min(this.maxWidth, canvasWidth));
    canvasHeight = canvasWidth / this.targetAspectRatio;

    // Calculate scaling factors for coordinate conversion
    const scaleX = canvasWidth / this.targetWidth;
    const scaleY = canvasHeight / this.targetHeight;

    // Center the canvas
    const offsetX = (containerWidth - canvasWidth) / 2;
    const offsetY = (containerHeight - canvasHeight) / 2;

    // Update canvas dimensions
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;

    // Update stage bounds
    this.stage.canvas = this.canvas;

    // Store current dimensions
    this.currentDimensions = {
      width: canvasWidth,
      height: canvasHeight,
      scaleX,
      scaleY,
      offsetX,
      offsetY
    };

    // Notify all callbacks about the viewport change
    this.notifyResizeCallbacks();
  }

  public onResize(callback: (dimensions: ViewportDimensions) => void): void {
    this.resizeCallbacks.push(callback);
  }

  private notifyResizeCallbacks(): void {
    this.resizeCallbacks.forEach(callback => {
      callback(this.currentDimensions);
    });
  }

  public getDimensions(): ViewportDimensions {
    return { ...this.currentDimensions };
  }

  public getResponsivePosition(
    xPercent: number,
    yPercent: number,
    anchorX: 'left' | 'center' | 'right' = 'left',
    anchorY: 'top' | 'center' | 'bottom' = 'top'
  ): Position {
    const dims = this.currentDimensions;
    
    let x = (xPercent / 100) * dims.width;
    let y = (yPercent / 100) * dims.height;

    // Apply anchor adjustments
    if (anchorX === 'center') {
      // No adjustment needed for center
    } else if (anchorX === 'right') {
      // No adjustment needed for right positioning
    }

    if (anchorY === 'center') {
      // No adjustment needed for center
    } else if (anchorY === 'bottom') {
      // No adjustment needed for bottom positioning
    }

    return { x, y };
  }

  public scaleValue(value: number): number {
    // Use the smaller scale factor to ensure elements fit
    const scale = Math.min(this.currentDimensions.scaleX, this.currentDimensions.scaleY);
    return value * scale;
  }

  public getScaledFont(baseFontSize: number): number {
    const scale = Math.min(this.currentDimensions.scaleX, this.currentDimensions.scaleY);
    return Math.max(12, Math.round(baseFontSize * scale));
  }

  public getCanvasCenter(): Position {
    return {
      x: this.currentDimensions.width / 2,
      y: this.currentDimensions.height / 2
    };
  }

  public destroy(): void {
    window.removeEventListener('resize', this.updateViewport);
    window.removeEventListener('orientationchange', this.updateViewport);
    this.resizeCallbacks = [];
  }
}