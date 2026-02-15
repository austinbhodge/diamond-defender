import * as createjs from '@thegraid/createjs-module';
import { GameObject, WaveData, WaveState, HealthBarElements, HealthBarConfig, WeaponType, ShopItem, Position } from '@types';
import { ViewportManager, ViewportDimensions } from '@utils/viewport';
import { gameConfig } from '@config/gameConfig';
import { PurchasedItemsDisplay } from '@entities/PurchasedItemsDisplay';
import { Tooltip } from '@ui/Tooltip';

export class UIManager implements GameObject {
  private stage: createjs.Stage;
  private viewportManager: ViewportManager;
  private waveCircles: createjs.Shape[] = [];
  private enemyCircles: createjs.Shape[] = [];
  private experienceCircles: createjs.Shape[] = [];
  private waveContainer: createjs.Container;
  private enemyContainer: createjs.Container;
  private experienceContainer: createjs.Container;
  private timerDisplay: createjs.Text;
  private wavePopup: createjs.Container | null = null;
  private score: number = 0;
  
  // Health bar - simplified approach
  private healthBackground: createjs.Shape;
  private healthFill: createjs.Shape;
  private healthBorder: createjs.Shape;
  private lowHealthWarning: boolean = false;
  private lowHealthFlashTimer: number = 0;
  
  // Ammo bar
  private ammoBackground: createjs.Shape;
  private ammoFill: createjs.Shape;
  private ammoBorder: createjs.Shape;
  private lowAmmoWarning: boolean = false;
  private lowAmmoFlashTimer: number = 0;
  
  // Track current values for resize operations
  private currentHealthPercentage: number = 1;
  private currentHealth: number = 100;
  private maxHealth: number = 100;
  private currentAmmoPercentage: number = 1;
  private currentAmmo: number = 100;
  private maxAmmo: number = 100;
  private currentWeaponType: WeaponType = WeaponType.LASER;
  
  // Game over screen
  private gameOverContainer: createjs.Container | null = null;
  
  // Purchased items display
  private purchasedItemsDisplay: PurchasedItemsDisplay;
  
  // Tooltips
  private healthTooltip?: Tooltip;
  private ammoTooltip?: Tooltip;
  private experienceTooltip?: Tooltip;
  private mousePosition: Position = { x: 0, y: 0 };
  private hoveredElement: 'health' | 'ammo' | 'experience' | null = null;

  constructor(stage: createjs.Stage, viewportManager: ViewportManager) {
    this.stage = stage;
    this.viewportManager = viewportManager;
    this.createUIElements();
    
    // Initialize purchased items display
    this.purchasedItemsDisplay = new PurchasedItemsDisplay(stage, viewportManager);
    
    // Create tooltips
    this.createTooltips();
    
    // Set up direct stage mouse tracking for better tooltip responsiveness
    this.setupMouseTracking();
    
    // Listen for viewport changes
    this.viewportManager.onResize((dimensions) => {
      this.handleResize(dimensions);
    });
  }

  private createUIElements(): void {
    const ui = gameConfig.ui;

    // Wave circles (top-left) - blue circles
    this.waveContainer = new createjs.Container();
    const wavePos = this.viewportManager.getResponsivePosition(ui.waveDisplay.x, ui.waveDisplay.y, 'left', 'top');
    this.waveContainer.x = wavePos.x;
    this.waveContainer.y = wavePos.y;
    this.stage.addChild(this.waveContainer);
    this.updateWaveCircles(1); // Start with wave 1

    // Enemy circles (top-left, below wave) - red circles
    this.enemyContainer = new createjs.Container();
    const enemyPos = this.viewportManager.getResponsivePosition(ui.enemyCounter.x, ui.enemyCounter.y, 'left', 'top');
    this.enemyContainer.x = enemyPos.x;
    this.enemyContainer.y = enemyPos.y;
    this.stage.addChild(this.enemyContainer);
    this.updateEnemyCircles(0); // Start with 0 enemies

    // Experience circles (top-right) - green circles
    this.experienceContainer = new createjs.Container();
    const expPos = this.viewportManager.getResponsivePosition(ui.experienceCounter.x, ui.experienceCounter.y, 'right', 'top');
    this.experienceContainer.x = expPos.x;
    this.experienceContainer.y = expPos.y;
    this.stage.addChild(this.experienceContainer);
    this.updateExperienceCircles(0); // Start with 0 experience

    // Timer display (top-center)
    this.timerDisplay = new createjs.Text('', `${this.viewportManager.getScaledFont(20)}px Hammersmith One`, '#ffff00');
    const timerPos = this.viewportManager.getResponsivePosition(ui.timerDisplay.x, ui.timerDisplay.y, 'center', 'top');
    this.timerDisplay.x = timerPos.x;
    this.timerDisplay.y = timerPos.y;
    this.timerDisplay.textAlign = 'center';
    this.timerDisplay.alpha = 0;
    this.stage.addChild(this.timerDisplay);

    // Score display removed for clean UI

    // Create diamond health bar
    this.createDiamondHealthBar();
    
    // Create ammo bar
    this.createAmmoBar();
  }
  
  private setupMouseTracking(): void {
    // Use stage's stagemousemove event for real-time mouse tracking
    this.stage.on('stagemousemove', (event: any) => {
      if (event.stageX !== undefined && event.stageY !== undefined) {
        this.mousePosition = { x: event.stageX, y: event.stageY };
      }
    });
  }
  
  private createTooltips(): void {
    // Create health tooltip
    this.healthTooltip = new Tooltip(this.stage, {
      text: 'Health',
      description: 'Your current health points',
      position: 'top',
      offset: 10,
      maxWidth: 150,
      fontSize: 11
    });
    
    // Create ammo tooltip
    this.ammoTooltip = new Tooltip(this.stage, {
      text: 'Ammo',
      description: 'Current weapon ammunition',
      position: 'top',
      offset: 10,
      maxWidth: 150,
      fontSize: 11
    });
    
    // Create experience tooltip
    this.experienceTooltip = new Tooltip(this.stage, {
      text: 'Experience',
      description: 'Spend at the shop between waves',
      position: 'bottom',
      offset: 10,
      maxWidth: 180,
      fontSize: 11
    });
  }

  public update(): void {
    // Update low health warning animation
    const deltaTime = 1 / 60; // Assume 60 FPS for UI updates
    this.lowHealthFlashTimer += deltaTime;
    
    // Update purchased items display
    this.purchasedItemsDisplay.update();
    this.lowAmmoFlashTimer += deltaTime;
    
    // Update tooltips
    this.updateTooltips(deltaTime);
    
    if (this.lowHealthWarning) {
      // Flash cycle every 0.8 seconds
      const flashCycle = Math.sin(this.lowHealthFlashTimer * Math.PI * 2.5);
      this.healthFill.alpha = 0.7 + (flashCycle * 0.3); // Range: 0.4 to 1.0
    } else {
      this.healthFill.alpha = 1.0;
    }
    
    if (this.lowAmmoWarning) {
      // Flash cycle every 0.6 seconds (slightly faster than health)
      const flashCycle = Math.sin(this.lowAmmoFlashTimer * Math.PI * 3);
      this.ammoFill.alpha = 0.6 + (flashCycle * 0.4); // Range: 0.2 to 1.0
    } else {
      this.ammoFill.alpha = 1.0;
    }
  }

  public updateWaveInfo(waveData: WaveData): void {
    this.updateWaveCircles(waveData.number);
    this.updateEnemyCircles(waveData.enemiesRemaining);
  }

  public updateExperienceDisplay(experienceCount: number): void {
    this.updateExperienceCircles(experienceCount);
  }
  
  private updateWaveCircles(waveNumber: number): void {
    // Clear existing circles
    this.waveContainer.removeAllChildren();
    this.waveCircles = [];
    
    // Create blue circles for wave count
    const circleSize = 6;
    const spacing = 16;
    
    for (let i = 0; i < waveNumber; i++) {
      const circle = new createjs.Shape();
      circle.graphics
        .setStrokeStyle(2)
        .beginStroke('#003366') // Dark blue border
        .beginFill('#0099ff')
        .drawCircle(0, 0, circleSize);
      circle.x = i * spacing;
      circle.y = 0;
      
      this.waveContainer.addChild(circle);
      this.waveCircles.push(circle);
    }
  }
  
  private updateEnemyCircles(enemyCount: number): void {
    // Clear existing circles
    this.enemyContainer.removeAllChildren();
    this.enemyCircles = [];
    
    // Create red circles for enemy count (limit display to prevent UI overflow)
    const maxDisplay = 20; // Maximum circles to display
    const displayCount = Math.min(enemyCount, maxDisplay);
    const circleSize = 4;
    const spacing = 12;
    const circlesPerRow = 10;
    
    for (let i = 0; i < displayCount; i++) {
      const circle = new createjs.Shape();
      circle.graphics
        .setStrokeStyle(1.5)
        .beginStroke('#660000') // Dark red border
        .beginFill('#ff0033')
        .drawCircle(0, 0, circleSize);
      
      // Arrange in rows
      const row = Math.floor(i / circlesPerRow);
      const col = i % circlesPerRow;
      circle.x = col * spacing;
      circle.y = row * spacing;
      
      this.enemyContainer.addChild(circle);
      this.enemyCircles.push(circle);
    }
    
    // If more enemies than max display, add a "+" indicator
    if (enemyCount > maxDisplay) {
      const plusText = new createjs.Text(`+${enemyCount - maxDisplay}`, '10px Hammersmith One', '#ff0033');
      const lastRow = Math.floor((displayCount - 1) / circlesPerRow);
      plusText.x = (displayCount % circlesPerRow) * spacing + 16;
      plusText.y = lastRow * spacing - 5;
      this.enemyContainer.addChild(plusText);
    }
  }

  private updateExperienceCircles(experienceCount: number): void {
    // Clear existing circles
    this.experienceContainer.removeAllChildren();
    this.experienceCircles = [];
    
    // Each circle represents 5 experience points
    const experiencePerCircle = 5;
    const circleCount = Math.floor(experienceCount / experiencePerCircle);
    
    // Create green circles for experience count (limit display to prevent UI overflow)
    const maxDisplay = 15; // Maximum circles to display
    const displayCount = Math.min(circleCount, maxDisplay);
    const circleSize = 5;
    const spacing = 14;
    const circlesPerRow = 8;
    
    for (let i = 0; i < displayCount; i++) {
      const circle = new createjs.Shape();
      circle.graphics
        .setStrokeStyle(2)
        .beginStroke('#004400') // Dark green border
        .beginFill('#00cc44')   // Bright green fill
        .drawCircle(0, 0, circleSize);
      
      // Arrange in rows, stacking to the left (reverse order)
      const row = Math.floor(i / circlesPerRow);
      const col = i % circlesPerRow;
      circle.x = -(col * spacing); // Negative X to stack left
      circle.y = row * spacing;
      
      this.experienceContainer.addChild(circle);
      this.experienceCircles.push(circle);
    }
    
    // If more circles than max display, add a "+" indicator
    if (circleCount > maxDisplay) {
      const remainingCircles = circleCount - maxDisplay;
      const remainingExperience = remainingCircles * experiencePerCircle;
      const plusText = new createjs.Text(`+${remainingExperience}`, '10px Hammersmith One', '#00cc44');
      const lastRow = Math.floor((displayCount - 1) / circlesPerRow);
      plusText.x = -((displayCount % circlesPerRow) * spacing + 16); // Negative X for left stacking
      plusText.y = lastRow * spacing - 5;
      this.experienceContainer.addChild(plusText);
    }
  }

  public showTimer(timeRemaining: number): void {
    if (timeRemaining <= 3) {
      // Show countdown during wave start countdown
      this.timerDisplay.text = `Wave starting in: ${Math.ceil(timeRemaining)}s`;
      this.timerDisplay.color = '#ff0000'; // Red for countdown
    } else {
      // This shouldn't happen with new system, but fallback
      this.timerDisplay.text = `Next Wave in: ${Math.ceil(timeRemaining)}s`;
      this.timerDisplay.color = '#ffff00'; // Yellow for normal timer
    }
    this.timerDisplay.alpha = 1;
  }

  public hideTimer(): void {
    this.timerDisplay.alpha = 0;
  }

  public showWaveStartPopup(waveNumber: number): void {
    // Remove existing popup if any
    this.hideWavePopup();

    // Create popup container
    this.wavePopup = new createjs.Container();

    // Use canvas dimensions directly for now
    const width = this.stage.canvas.width;
    const height = this.stage.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Background overlay
    const overlay = new createjs.Shape();
    overlay.graphics.beginFill('rgba(0, 0, 0, 0.7)').drawRect(0, 0, width, height);
    this.wavePopup.addChild(overlay);

    // Main text - responsive sizing and positioning
    const mainText = new createjs.Text(
      `WAVE ${waveNumber}`,
      `bold ${this.viewportManager.getScaledFont(72)}px Hammersmith One`,
      '#00ffff'
    );
    mainText.x = centerX;
    mainText.y = centerY - 40;
    mainText.textAlign = 'center';
    mainText.textBaseline = 'middle';
    this.wavePopup.addChild(mainText);

    // Subtitle - responsive sizing and positioning
    const subtitle = new createjs.Text(
      'GET READY!',
      `${this.viewportManager.getScaledFont(36)}px Hammersmith One`,
      '#ffffff'
    );
    subtitle.x = centerX;
    subtitle.y = centerY + 60;
    subtitle.textAlign = 'center';
    subtitle.textBaseline = 'middle';
    this.wavePopup.addChild(subtitle);

    // Add to stage
    this.stage.addChild(this.wavePopup);

    // Animate popup
    this.animateWavePopup();
  }

  private animateWavePopup(): void {
    if (!this.wavePopup) return;

    // Start with larger scale and fade in
    this.wavePopup.scaleX = 1.5;
    this.wavePopup.scaleY = 1.5;
    this.wavePopup.alpha = 0;

    // Tween to normal size and full opacity
    createjs.Tween.get(this.wavePopup)
      .to({ scaleX: 1, scaleY: 1, alpha: 1 }, 500, createjs.Ease.backOut)
      .wait(1500) // Show for 1.5 seconds
      .to({ alpha: 0 }, 500)
      .call(() => {
        this.hideWavePopup();
      });
  }

  public hideWavePopup(): void {
    if (this.wavePopup) {
      this.stage.removeChild(this.wavePopup);
      this.wavePopup = null;
    }
  }
  
  public showGameOverScreen(killCount: number, waveReached: number): void {
    // Remove existing game over screen if any
    this.hideGameOverScreen();
    
    // Create game over container
    this.gameOverContainer = new createjs.Container();
    
    // Use canvas dimensions directly
    const width = this.stage.canvas.width;
    const height = this.stage.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Background overlay
    const overlay = new createjs.Shape();
    overlay.graphics.beginFill('rgba(0, 0, 0, 0.8)').drawRect(0, 0, width, height);
    this.gameOverContainer.addChild(overlay);
    
    // Game Over title
    const gameOverText = new createjs.Text(
      'GAME OVER',
      `bold ${this.viewportManager.getScaledFont(72)}px Hammersmith One`,
      '#ff0000'
    );
    gameOverText.x = centerX;
    gameOverText.y = centerY - 120;
    gameOverText.textAlign = 'center';
    gameOverText.textBaseline = 'middle';
    this.gameOverContainer.addChild(gameOverText);
    
    // Kill count
    const killText = new createjs.Text(
      `Enemies Defeated: ${killCount}`,
      `${this.viewportManager.getScaledFont(36)}px Hammersmith One`,
      '#ffffff'
    );
    killText.x = centerX;
    killText.y = centerY - 40;
    killText.textAlign = 'center';
    killText.textBaseline = 'middle';
    this.gameOverContainer.addChild(killText);
    
    // Wave reached
    const waveText = new createjs.Text(
      `Wave Reached: ${waveReached}`,
      `${this.viewportManager.getScaledFont(36)}px Hammersmith One`,
      '#ffffff'
    );
    waveText.x = centerX;
    waveText.y = centerY + 20;
    waveText.textAlign = 'center';
    waveText.textBaseline = 'middle';
    this.gameOverContainer.addChild(waveText);
    
    // Restart prompt
    const restartText = new createjs.Text(
      'Press SPACE to restart',
      `${this.viewportManager.getScaledFont(24)}px Hammersmith One`,
      '#00ffff'
    );
    restartText.x = centerX;
    restartText.y = centerY + 80;
    restartText.textAlign = 'center';
    restartText.textBaseline = 'middle';
    this.gameOverContainer.addChild(restartText);
    
    // Add pulsing effect to restart text
    createjs.Tween.get(restartText, { loop: true })
      .to({ alpha: 0.5 }, 1000)
      .to({ alpha: 1 }, 1000);
    
    // Add to stage
    this.stage.addChild(this.gameOverContainer);
  }
  
  public addPurchasedItem(item: ShopItem): void {
    this.purchasedItemsDisplay.addPurchasedItem(item);
  }
  
  public clearPurchasedItems(): void {
    this.purchasedItemsDisplay.clear();
  }
  
  public hideGameOverScreen(): void {
    if (this.gameOverContainer) {
      createjs.Tween.removeTweens(this.gameOverContainer);
      this.stage.removeChild(this.gameOverContainer);
      this.gameOverContainer = null;
    }
  }
  
  public resetCounters(): void {
    // Reset to initial state: Wave 1, 0 enemies, 0 experience
    this.updateWaveCircles(1);
    this.updateEnemyCircles(0);
    this.updateExperienceCircles(0);
  }
  
  private updateTooltips(deltaTime: number): void {
    // Check hover state for each UI element
    const dims = this.viewportManager.getDimensions();
    let newHoveredElement: 'health' | 'ammo' | 'experience' | null = null;
    const padding = 10; // Add padding for easier hovering
    
    // Check health bar hover
    const healthBarBounds = {
      x: dims.width * gameConfig.ui.healthBar.x / 100 - padding,
      y: dims.height * gameConfig.ui.healthBar.y / 100 - padding,
      width: gameConfig.ui.healthBar.width + padding * 2,
      height: gameConfig.ui.healthBar.height + padding * 2
    };
    
    if (this.isMouseOverElement(healthBarBounds)) {
      newHoveredElement = 'health';
    }
    
    // Check ammo bar hover
    const ammoBarBounds = {
      x: dims.width * gameConfig.ui.ammoBar.x / 100 - gameConfig.ui.ammoBar.width - padding,
      y: dims.height * gameConfig.ui.ammoBar.y / 100 - padding,
      width: gameConfig.ui.ammoBar.width + padding * 2,
      height: gameConfig.ui.ammoBar.height + padding * 2
    };
    
    if (this.isMouseOverElement(ammoBarBounds)) {
      newHoveredElement = 'ammo';
    }
    
    // Check experience counter hover
    const expBounds = {
      x: dims.width * gameConfig.ui.experienceCounter.x / 100 - 50 - padding,
      y: dims.height * gameConfig.ui.experienceCounter.y / 100 - padding,
      width: 100 + padding * 2,
      height: 20 + padding * 2
    };
    
    if (this.isMouseOverElement(expBounds)) {
      newHoveredElement = 'experience';
    }
    
    // Update tooltip visibility
    if (newHoveredElement !== this.hoveredElement) {
      // Hide previous tooltip
      if (this.hoveredElement === 'health') this.healthTooltip?.hide();
      if (this.hoveredElement === 'ammo') this.ammoTooltip?.hide();
      if (this.hoveredElement === 'experience') this.experienceTooltip?.hide();
      
      // Show new tooltip
      if (newHoveredElement === 'health') {
        const pos = { 
          x: healthBarBounds.x + healthBarBounds.width / 2, 
          y: healthBarBounds.y 
        };
        this.healthTooltip?.show(pos);
      } else if (newHoveredElement === 'ammo') {
        const pos = { 
          x: ammoBarBounds.x + ammoBarBounds.width / 2, 
          y: ammoBarBounds.y 
        };
        this.ammoTooltip?.show(pos);
      } else if (newHoveredElement === 'experience') {
        const pos = { 
          x: expBounds.x + expBounds.width / 2, 
          y: expBounds.y + expBounds.height 
        };
        this.experienceTooltip?.show(pos);
      }
      
      this.hoveredElement = newHoveredElement;
    }
    
    // Update tooltip animations
    this.healthTooltip?.update(deltaTime);
    this.ammoTooltip?.update(deltaTime);
    this.experienceTooltip?.update(deltaTime);
  }
  
  private isMouseOverElement(bounds: { x: number; y: number; width: number; height: number }): boolean {
    return this.mousePosition.x >= bounds.x &&
           this.mousePosition.x <= bounds.x + bounds.width &&
           this.mousePosition.y >= bounds.y &&
           this.mousePosition.y <= bounds.y + bounds.height;
  }
  
  
  public destroy(): void {
    // Clean up tooltips
    this.healthTooltip?.destroy();
    this.ammoTooltip?.destroy();
    this.experienceTooltip?.destroy();
    
    // Clean up all UI elements
    if (this.waveContainer) this.stage.removeChild(this.waveContainer);
    if (this.enemyContainer) this.stage.removeChild(this.enemyContainer);
    if (this.experienceContainer) this.stage.removeChild(this.experienceContainer);
    if (this.timerDisplay) this.stage.removeChild(this.timerDisplay);
    if (this.healthBackground) this.stage.removeChild(this.healthBackground);
    if (this.healthFill) this.stage.removeChild(this.healthFill);
    if (this.healthBorder) this.stage.removeChild(this.healthBorder);
    if (this.ammoBackground) this.stage.removeChild(this.ammoBackground);
    if (this.ammoFill) this.stage.removeChild(this.ammoFill);
    
    // Clean up purchased items display
    this.purchasedItemsDisplay.destroy();
    if (this.ammoBorder) this.stage.removeChild(this.ammoBorder);
    if (this.gameOverContainer) this.stage.removeChild(this.gameOverContainer);
    if (this.wavePopup) this.stage.removeChild(this.wavePopup);
  }

  public showWaveCompletePopup(): void {
    // Remove existing popup if any
    this.hideWavePopup();

    // Create popup container
    this.wavePopup = new createjs.Container();

    // Use canvas dimensions directly
    const width = this.stage.canvas.width;
    const height = this.stage.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Background overlay
    const overlay = new createjs.Shape();
    overlay.graphics.beginFill('rgba(0, 100, 0, 0.8)').drawRect(0, 0, width, height);
    this.wavePopup.addChild(overlay);

    // Main text - responsive sizing and positioning
    const mainText = new createjs.Text(
      'WAVE COMPLETE!',
      `bold ${this.viewportManager.getScaledFont(56)}px Hammersmith One`,
      '#00ff00'
    );
    mainText.x = centerX;
    mainText.y = centerY - 40;
    mainText.textAlign = 'center';
    mainText.textBaseline = 'middle';
    this.wavePopup.addChild(mainText);

    // Subtitle - responsive sizing and positioning
    const subtitle = new createjs.Text(
      'Walk into the white zone to start',
      `${this.viewportManager.getScaledFont(24)}px Hammersmith One`,
      '#ffffff'
    );
    subtitle.x = centerX;
    subtitle.y = centerY + 60;
    subtitle.textAlign = 'center';
    subtitle.textBaseline = 'middle';
    this.wavePopup.addChild(subtitle);

    // Add to stage
    this.stage.addChild(this.wavePopup);

    // Auto-hide after 2 seconds
    setTimeout(() => {
      this.hideWavePopup();
    }, 2000);
  }

  public addScore(points: number): void {
    this.score += points;
    // Score display removed for clean UI - just track internally
  }

  public getScore(): number {
    return this.score;
  }

  private createDiamondHealthBar(): void {
    const dims = this.viewportManager.getDimensions();
    const ui = gameConfig.ui;
    
    // Fixed position in bottom left (in pixels, not percentage)
    const leftX = 20; // 20px from left edge
    const bottomY = dims.height - 30; // 30px from bottom
    const width = 200; // Fixed 200px width
    const height = 10; // Fixed 10px height
    const skew = 15; // Amount of rhombus skew

    // Create health background (rhombus shape)
    this.healthBackground = new createjs.Shape();
    this.healthBackground.graphics
      .beginFill('#222222')
      .moveTo(leftX, bottomY)                    // Bottom left
      .lineTo(leftX + skew, bottomY - height)    // Top left (skewed)
      .lineTo(leftX + width + skew, bottomY - height) // Top right (skewed)
      .lineTo(leftX + width, bottomY)            // Bottom right
      .closePath();

    // Create health fill (rhombus shape - starts full)
    this.healthFill = new createjs.Shape();
    this.updateDiamondFill(1.0, leftX, bottomY, width, height, skew); // Start at 100%

    // Create health border (rhombus outline with dark teal)
    this.healthBorder = new createjs.Shape();
    this.healthBorder.graphics
      .setStrokeStyle(2)
      .beginStroke('#005555') // Dark teal border
      .moveTo(leftX, bottomY)                    // Bottom left
      .lineTo(leftX + skew, bottomY - height)    // Top left (skewed)
      .lineTo(leftX + width + skew, bottomY - height) // Top right (skewed)
      .lineTo(leftX + width, bottomY)            // Bottom right
      .closePath();

    // Add all elements to stage in order
    this.stage.addChild(this.healthBackground);
    this.stage.addChild(this.healthFill);
    this.stage.addChild(this.healthBorder);
  }

  private updateDiamondFill(healthPercentage: number, leftX: number, bottomY: number, width: number, height: number, skew?: number): void {
    const fillWidth = width * healthPercentage;
    const actualSkew = skew || 15; // Default skew if not provided
    
    this.healthFill.graphics.clear();
    if (fillWidth > 0) {
      this.healthFill.graphics
        .beginFill('rgb(0, 180, 174)') // Player diamond color
        .moveTo(leftX, bottomY)                        // Bottom left (fixed)
        .lineTo(leftX + actualSkew, bottomY - height)  // Top left (fixed)
        .lineTo(leftX + fillWidth + actualSkew, bottomY - height) // Top right (shrinks from right)
        .lineTo(leftX + fillWidth, bottomY)            // Bottom right (shrinks from right)
        .closePath();
    }
  }

  public updateHealthBar(healthPercentage: number, currentHealth: number, maxHealth: number): void {
    // Store current values
    this.currentHealthPercentage = healthPercentage;
    this.currentHealth = currentHealth;
    this.maxHealth = maxHealth;
    
    // Update health tooltip text
    if (this.healthTooltip) {
      this.healthTooltip.setText(
        'Health',
        `${Math.round(currentHealth)} / ${maxHealth} HP`
      );
    }
    
    const dims = this.viewportManager.getDimensions();
    
    // Fixed position in bottom left
    const leftX = 20;
    const bottomY = dims.height - 30;
    const width = 200;
    const height = 10;
    const skew = 15;
    
    // Update the rhombus fill
    this.updateDiamondFill(healthPercentage, leftX, bottomY, width, height, skew);

    // Health text removed for clean UI

    // Check if we should show low health warning
    const wasLowHealth = this.lowHealthWarning;
    this.lowHealthWarning = healthPercentage <= 0.3;
    
    if (this.lowHealthWarning && !wasLowHealth) {
      this.lowHealthFlashTimer = 0; // Reset timer when starting warning
    }

    // Debug logging
    if (Math.random() < 0.05) {
      console.log(`Diamond Health: ${Math.ceil(currentHealth)}/${maxHealth} (${Math.round(healthPercentage * 100)}%)`);
    }
  }

  private createAmmoBar(): void {
    const dims = this.viewportManager.getDimensions();
    
    // Fixed position in bottom right (mirroring health bar)
    const rightX = dims.width - 220; // 220px from right edge (200px width + 20px margin)
    const bottomY = dims.height - 30; // 30px from bottom
    const width = 200; // Fixed 200px width
    const height = 10; // Fixed 10px height
    const skew = -15; // Negative skew for right-side rhombus

    // Create ammo background (rhombus shape)
    this.ammoBackground = new createjs.Shape();
    this.ammoBackground.graphics
      .beginFill('#222222')
      .moveTo(rightX, bottomY)                    // Bottom left
      .lineTo(rightX + skew, bottomY - height)    // Top left (skewed left)
      .lineTo(rightX + width + skew, bottomY - height) // Top right (skewed left)
      .lineTo(rightX + width, bottomY)            // Bottom right
      .closePath();

    // Create ammo fill (rhombus shape - starts full)
    this.ammoFill = new createjs.Shape();
    this.updateAmmoFill(1.0, rightX, bottomY, width, height, skew); // Start at 100%

    // Create ammo border (rhombus outline with dark teal)
    this.ammoBorder = new createjs.Shape();
    this.ammoBorder.graphics
      .setStrokeStyle(2)
      .beginStroke('#005555') // Dark teal border to match health
      .moveTo(rightX, bottomY)                    // Bottom left
      .lineTo(rightX + skew, bottomY - height)    // Top left (skewed left)
      .lineTo(rightX + width + skew, bottomY - height) // Top right (skewed left)
      .lineTo(rightX + width, bottomY)            // Bottom right
      .closePath();

    // Add all elements to stage in order
    this.stage.addChild(this.ammoBackground);
    this.stage.addChild(this.ammoFill);
    this.stage.addChild(this.ammoBorder);
  }

  private updateAmmoFill(ammoPercentage: number, rightX: number, bottomY: number, width: number, height: number, skew?: number | WeaponType, weaponType?: WeaponType): void {
    // Handle parameter overloading for backward compatibility
    let actualSkew: number;
    let actualWeaponType: WeaponType | undefined;
    
    if (typeof skew === 'string') {
      // Old signature: skew is actually weaponType
      actualSkew = -15; // Default skew for right side
      actualWeaponType = skew as WeaponType;
    } else {
      actualSkew = skew || -15;
      actualWeaponType = weaponType || this.currentWeaponType;
    }
    
    const fillWidth = width * ammoPercentage;
    
    this.ammoFill.graphics.clear();
    if (fillWidth > 0) {
      // Color based on weapon type and ammo percentage
      let fillColor = '#6be9ff'; // Default cyan for laser/dub

      if (actualWeaponType === WeaponType.CIRCLE) {
        fillColor = '#8a2be2'; // Purple for circle weapon
      } else if (actualWeaponType === WeaponType.SCATTER) {
        fillColor = '#ff6600'; // Orange for scatter
      } else if (actualWeaponType === WeaponType.HOMING) {
        fillColor = '#ff00ff'; // Magenta for homing
      } else {
        // Cyan for laser/dub with warning colors
        if (ammoPercentage <= 0.25) {
          fillColor = '#ff0000'; // Red for critical ammo
        } else if (ammoPercentage <= 0.75) {
          fillColor = '#ffff00'; // Yellow for medium ammo
        }
      }
      
      // Fill from left side, shrinking from right (opposite of health bar)
      const fillOffset = width - fillWidth; // How much to offset from left
      this.ammoFill.graphics
        .beginFill(fillColor)
        .moveTo(rightX + fillOffset, bottomY)                    // Bottom left (shrinks from left)
        .lineTo(rightX + fillOffset + actualSkew, bottomY - height)    // Top left (shrinks from left)
        .lineTo(rightX + width + actualSkew, bottomY - height)   // Top right (fixed)
        .lineTo(rightX + width, bottomY)                         // Bottom right (fixed)
        .closePath();
    }
  }

  public updateAmmoBar(ammoPercentage: number, currentAmmo: number, maxAmmo: number, weaponType?: WeaponType): void {
    // Store current values
    this.currentAmmoPercentage = ammoPercentage;
    this.currentAmmo = currentAmmo;
    this.maxAmmo = maxAmmo;
    if (weaponType) {
      this.currentWeaponType = weaponType;
    }
    
    // Update ammo tooltip text
    if (this.ammoTooltip) {
      const weaponName = weaponType === WeaponType.LASER ? 'Laser' :
                        weaponType === WeaponType.DUB ? 'Dub' :
                        weaponType === WeaponType.SCATTER ? 'Scatter' :
                        weaponType === WeaponType.HOMING ? 'Homing' : 'Circle';
      this.ammoTooltip.setText(
        `${weaponName} Ammo`,
        `${Math.round(currentAmmo)} / ${maxAmmo} bullets`
      );
    }
    
    const dims = this.viewportManager.getDimensions();
    
    // Fixed position in bottom right
    const rightX = dims.width - 220;
    const bottomY = dims.height - 30;
    const width = 200;
    const height = 10;
    const skew = -15;
    
    // Update the rhombus fill
    this.updateAmmoFill(ammoPercentage, rightX, bottomY, width, height, skew, this.currentWeaponType);

    // Ammo text removed for clean UI

    // Check if we should show low ammo warning
    const wasLowAmmo = this.lowAmmoWarning;
    this.lowAmmoWarning = ammoPercentage <= 0.25;
    
    if (this.lowAmmoWarning && !wasLowAmmo) {
      this.lowAmmoFlashTimer = 0; // Reset timer when starting warning
    }
  }

  private handleResize(_dimensions: ViewportDimensions): void {
    // Update all UI element positions and sizes
    const ui = gameConfig.ui;

    // Update circle containers
    const wavePos = this.viewportManager.getResponsivePosition(ui.waveDisplay.x, ui.waveDisplay.y, 'left', 'top');
    this.waveContainer.x = wavePos.x;
    this.waveContainer.y = wavePos.y;

    const enemyPos = this.viewportManager.getResponsivePosition(ui.enemyCounter.x, ui.enemyCounter.y, 'left', 'top');
    this.enemyContainer.x = enemyPos.x;
    this.enemyContainer.y = enemyPos.y;

    const expPos = this.viewportManager.getResponsivePosition(ui.experienceCounter.x, ui.experienceCounter.y, 'right', 'top');
    this.experienceContainer.x = expPos.x;
    this.experienceContainer.y = expPos.y;

    const timerPos = this.viewportManager.getResponsivePosition(ui.timerDisplay.x, ui.timerDisplay.y, 'center', 'top');
    this.timerDisplay.x = timerPos.x;
    this.timerDisplay.y = timerPos.y;
    this.timerDisplay.font = `${this.viewportManager.getScaledFont(20)}px Hammersmith One`;

    // Score display removed for clean UI

    // Recreate health and ammo bars with new dimensions
    this.recreateHealthBar();
    this.recreateAmmoBar();
    
    // Update purchased items display position
    this.purchasedItemsDisplay.updatePosition();
  }

  private recreateHealthBar(): void {
    // Remove existing elements
    this.stage.removeChild(this.healthBackground);
    this.stage.removeChild(this.healthFill);
    this.stage.removeChild(this.healthBorder);

    // Recreate with new dimensions
    this.createDiamondHealthBar();
    
    // Re-apply current health state using stored values
    this.updateHealthBar(this.currentHealthPercentage, this.currentHealth, this.maxHealth);
  }

  private recreateAmmoBar(): void {
    // Remove existing elements
    this.stage.removeChild(this.ammoBackground);
    this.stage.removeChild(this.ammoFill);
    this.stage.removeChild(this.ammoBorder);

    // Recreate with new dimensions
    this.createAmmoBar();
    
    // Re-apply current ammo state using stored values
    this.updateAmmoBar(this.currentAmmoPercentage, this.currentAmmo, this.maxAmmo, this.currentWeaponType);
  }

  public setWaveState(state: WaveState, timeRemaining?: number): void {
    switch (state) {
      case WaveState.PREPARATION:
        this.hideTimer();
        break;
      case WaveState.ACTIVE:
        this.hideTimer();
        break;
      case WaveState.REST:
        if (timeRemaining !== undefined) {
          this.showTimer(timeRemaining);
        }
        break;
      case WaveState.COMPLETE:
        this.hideTimer();
        break;
    }
  }
}