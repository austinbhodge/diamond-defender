import * as createjs from '@thegraid/createjs-module';
import { Position } from '@types';

export interface TooltipConfig {
  text: string;
  description?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  maxWidth?: number;
  fontSize?: number;
  padding?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export class Tooltip {
  private stage: createjs.Stage;
  private container: createjs.Container;
  private background: createjs.Shape;
  private titleText: createjs.Text;
  private descriptionText?: createjs.Text;
  private config: Required<TooltipConfig>;
  private visible: boolean = false;
  private targetAlpha: number = 0;
  private currentAlpha: number = 0;
  
  private static readonly DEFAULT_CONFIG: Required<TooltipConfig> = {
    text: '',
    description: '',
    position: 'top',
    offset: 10,
    maxWidth: 200,
    fontSize: 12,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    textColor: '#ffffff',
    borderColor: '#666666',
    borderWidth: 1,
    fadeInDuration: 200,
    fadeOutDuration: 150
  };
  
  constructor(stage: createjs.Stage, config: TooltipConfig) {
    this.stage = stage;
    this.config = { ...Tooltip.DEFAULT_CONFIG, ...config };
    
    // Create container
    this.container = new createjs.Container();
    this.container.alpha = 0;
    this.container.mouseEnabled = false; // Tooltips shouldn't block mouse events
    
    // Create background
    this.background = new createjs.Shape();
    this.container.addChild(this.background);
    
    // Create title text
    this.titleText = new createjs.Text(
      this.config.text,
      `bold ${this.config.fontSize}px Arial`,
      this.config.textColor
    );
    this.titleText.lineWidth = this.config.maxWidth - this.config.padding * 2;
    this.titleText.lineHeight = this.config.fontSize * 1.2;
    this.container.addChild(this.titleText);
    
    // Create description text if provided
    if (this.config.description) {
      this.descriptionText = new createjs.Text(
        this.config.description,
        `${this.config.fontSize - 1}px Arial`,
        this.config.textColor
      );
      this.descriptionText.lineWidth = this.config.maxWidth - this.config.padding * 2;
      this.descriptionText.lineHeight = (this.config.fontSize - 1) * 1.3;
      this.descriptionText.alpha = 0.85;
      this.container.addChild(this.descriptionText);
    }
    
    this.updateLayout();
    this.stage.addChild(this.container);
  }
  
  private updateLayout(): void {
    const padding = this.config.padding;
    
    // Position texts
    this.titleText.x = padding;
    this.titleText.y = padding;
    
    let totalHeight = padding + this.titleText.getMeasuredHeight();
    let totalWidth = padding * 2 + this.titleText.getMeasuredWidth();
    
    if (this.descriptionText) {
      this.descriptionText.x = padding;
      this.descriptionText.y = totalHeight + 4;
      totalHeight = this.descriptionText.y + this.descriptionText.getMeasuredHeight() + padding;
      totalWidth = Math.max(
        totalWidth,
        padding * 2 + this.descriptionText.getMeasuredWidth()
      );
    } else {
      totalHeight += padding;
    }
    
    // Ensure minimum width
    totalWidth = Math.max(totalWidth, 60);
    
    // Draw background
    this.background.graphics.clear();
    
    // Draw shadow
    this.background.graphics
      .beginFill('rgba(0, 0, 0, 0.3)')
      .drawRoundRect(2, 2, totalWidth, totalHeight, 4);
    
    // Draw main background
    this.background.graphics
      .beginFill(this.config.backgroundColor)
      .drawRoundRect(0, 0, totalWidth, totalHeight, 4);
    
    // Draw border
    if (this.config.borderWidth > 0) {
      this.background.graphics
        .setStrokeStyle(this.config.borderWidth)
        .beginStroke(this.config.borderColor)
        .drawRoundRect(0, 0, totalWidth, totalHeight, 4);
    }
  }
  
  public show(targetPosition: Position, immediatePosition?: Position): void {
    this.visible = true;
    this.targetAlpha = 1;
    
    // Position the tooltip relative to target
    const bounds = this.container.getBounds();
    const width = bounds ? bounds.width : 100;
    const height = bounds ? bounds.height : 40;
    
    // Use immediate position if provided (for mouse hover), otherwise use target position
    const pos = immediatePosition || targetPosition;
    
    switch (this.config.position) {
      case 'top':
        this.container.x = pos.x - width / 2;
        this.container.y = pos.y - height - this.config.offset;
        break;
      case 'bottom':
        this.container.x = pos.x - width / 2;
        this.container.y = pos.y + this.config.offset;
        break;
      case 'left':
        this.container.x = pos.x - width - this.config.offset;
        this.container.y = pos.y - height / 2;
        break;
      case 'right':
        this.container.x = pos.x + this.config.offset;
        this.container.y = pos.y - height / 2;
        break;
    }
    
    // Keep tooltip on screen
    const stageCanvas = this.stage.canvas as HTMLCanvasElement;
    if (this.container.x < 5) this.container.x = 5;
    if (this.container.y < 5) this.container.y = 5;
    if (this.container.x + width > stageCanvas.width - 5) {
      this.container.x = stageCanvas.width - width - 5;
    }
    if (this.container.y + height > stageCanvas.height - 5) {
      this.container.y = stageCanvas.height - height - 5;
    }
    
    // Move to top of display list
    this.stage.setChildIndex(this.container, this.stage.numChildren - 1);
  }
  
  public hide(): void {
    this.visible = false;
    this.targetAlpha = 0;
  }
  
  public update(deltaTime: number): void {
    // Animate alpha
    if (this.currentAlpha !== this.targetAlpha) {
      const fadeSpeed = this.targetAlpha > this.currentAlpha 
        ? 1000 / this.config.fadeInDuration 
        : 1000 / this.config.fadeOutDuration;
      
      const alphaDelta = fadeSpeed * deltaTime;
      
      if (this.targetAlpha > this.currentAlpha) {
        this.currentAlpha = Math.min(this.targetAlpha, this.currentAlpha + alphaDelta);
      } else {
        this.currentAlpha = Math.max(this.targetAlpha, this.currentAlpha - alphaDelta);
      }
      
      this.container.alpha = this.currentAlpha;
    }
  }
  
  public updatePosition(position: Position): void {
    if (!this.visible) return;
    
    const bounds = this.container.getBounds();
    const width = bounds ? bounds.width : 100;
    const height = bounds ? bounds.height : 40;
    
    switch (this.config.position) {
      case 'top':
        this.container.x = position.x - width / 2;
        this.container.y = position.y - height - this.config.offset;
        break;
      case 'bottom':
        this.container.x = position.x - width / 2;
        this.container.y = position.y + this.config.offset;
        break;
      case 'left':
        this.container.x = position.x - width - this.config.offset;
        this.container.y = position.y - height / 2;
        break;
      case 'right':
        this.container.x = position.x + this.config.offset;
        this.container.y = position.y - height / 2;
        break;
    }
    
    // Keep tooltip on screen
    const stageCanvas = this.stage.canvas as HTMLCanvasElement;
    if (this.container.x < 5) this.container.x = 5;
    if (this.container.y < 5) this.container.y = 5;
    if (this.container.x + width > stageCanvas.width - 5) {
      this.container.x = stageCanvas.width - width - 5;
    }
    if (this.container.y + height > stageCanvas.height - 5) {
      this.container.y = stageCanvas.height - height - 5;
    }
  }
  
  public setText(text: string, description?: string): void {
    this.config.text = text;
    this.config.description = description || '';
    
    this.titleText.text = text;
    if (this.descriptionText) {
      this.descriptionText.text = description || '';
    } else if (description) {
      // Create description text if it didn't exist before
      this.descriptionText = new createjs.Text(
        description,
        `${this.config.fontSize - 1}px Arial`,
        this.config.textColor
      );
      this.descriptionText.lineWidth = this.config.maxWidth - this.config.padding * 2;
      this.descriptionText.lineHeight = (this.config.fontSize - 1) * 1.3;
      this.descriptionText.alpha = 0.85;
      this.container.addChild(this.descriptionText);
    }
    
    this.updateLayout();
  }
  
  public isVisible(): boolean {
    return this.visible;
  }
  
  public destroy(): void {
    this.stage.removeChild(this.container);
  }
}