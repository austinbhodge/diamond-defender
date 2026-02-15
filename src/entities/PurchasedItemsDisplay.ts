import * as createjs from '@thegraid/createjs-module';
import { GameObject, PurchasedItem, ShopItem } from '@types';
import { ViewportManager } from '@utils/viewport';

export class PurchasedItemsDisplay implements GameObject {
  private stage: createjs.Stage;
  private container: createjs.Container;
  private viewportManager: ViewportManager;
  private purchasedItems: PurchasedItem[] = [];
  private itemShapes: Map<string, createjs.Shape> = new Map();
  
  // Display configuration
  private readonly ITEM_SIZE = 30;
  private readonly ITEM_SPACING = 10;
  private readonly MARGIN_RIGHT = 35; // Distance from right edge
  private readonly MARGIN_BOTTOM = 60; // Distance above ammo bar
  
  constructor(stage: createjs.Stage, viewportManager: ViewportManager) {
    this.stage = stage;
    this.viewportManager = viewportManager;
    
    // Create container for all purchased items
    this.container = new createjs.Container();
    this.updatePosition();
    this.stage.addChild(this.container);
  }
  
  public update(): void {
    // No animation needed for now, but could add hover effects later
  }
  
  public addPurchasedItem(item: ShopItem): void {
    // Create purchased item data
    const purchasedItem: PurchasedItem = {
      id: item.id,
      name: item.name,
      color: item.color,
      stackPosition: this.purchasedItems.length // Stack position based on current count
    };
    
    // Add to array
    this.purchasedItems.push(purchasedItem);
    
    // Create visual representation
    this.createItemVisual(purchasedItem);
  }
  
  private createItemVisual(item: PurchasedItem): void {
    const dims = this.viewportManager.getDimensions();
    
    // Calculate position (stack upward from bottom)
    const x = 0; // Relative to container
    const y = -(item.stackPosition * (this.ITEM_SIZE + this.ITEM_SPACING));
    
    // Create item shape
    const shape = new createjs.Shape();
    
    // Draw background
    shape.graphics
      .beginFill('rgba(0, 0, 0, 0.5)')
      .drawRect(-this.ITEM_SIZE / 2, -this.ITEM_SIZE / 2, this.ITEM_SIZE, this.ITEM_SIZE)
      .endFill();
    
    // Draw colored item
    shape.graphics
      .beginFill(item.color)
      .drawRect(-this.ITEM_SIZE / 2 + 2, -this.ITEM_SIZE / 2 + 2, this.ITEM_SIZE - 4, this.ITEM_SIZE - 4)
      .endFill();
    
    // Draw border
    shape.graphics
      .setStrokeStyle(2)
      .beginStroke('#ffffff')
      .drawRect(-this.ITEM_SIZE / 2, -this.ITEM_SIZE / 2, this.ITEM_SIZE, this.ITEM_SIZE);
    
    // Position the shape
    shape.x = x;
    shape.y = y;
    
    // Add to container and map
    this.container.addChild(shape);
    this.itemShapes.set(item.id, shape);
  }
  
  public updatePosition(): void {
    const dims = this.viewportManager.getDimensions();
    
    // Position container at bottom right, above ammo bar
    this.container.x = dims.width - this.MARGIN_RIGHT;
    this.container.y = dims.height - this.MARGIN_BOTTOM;
  }
  
  public clear(): void {
    // Remove all visual elements
    this.container.removeAllChildren();
    this.itemShapes.clear();
    this.purchasedItems = [];
  }
  
  public getPurchasedItems(): PurchasedItem[] {
    return [...this.purchasedItems];
  }
  
  public destroy(): void {
    this.clear();
    this.stage.removeChild(this.container);
  }
}