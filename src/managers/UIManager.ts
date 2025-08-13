import * as createjs from '@thegraid/createjs-module';
import { GameObject, WaveData, WaveState, HealthBarElements, HealthBarConfig } from '@types';
import { ViewportManager, ViewportDimensions } from '@utils/viewport';
import { gameConfig } from '@config/gameConfig';

export class UIManager implements GameObject {
  private stage: createjs.Stage;
  private viewportManager: ViewportManager;
  private waveDisplay: createjs.Text;
  private enemyCounter: createjs.Text;
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

  constructor(stage: createjs.Stage, viewportManager: ViewportManager) {
    this.stage = stage;
    this.viewportManager = viewportManager;
    this.createUIElements();
    
    // Listen for viewport changes
    this.viewportManager.onResize((dimensions) => {
      this.handleResize(dimensions);
    });
  }

  private createUIElements(): void {
    const ui = gameConfig.ui;

    // Wave display (top-left)
    this.waveDisplay = new createjs.Text('Wave: 1', `${this.viewportManager.getScaledFont(24)}px Hammersmith One`, '#fff');
    const wavePos = this.viewportManager.getResponsivePosition(ui.waveDisplay.x, ui.waveDisplay.y, 'left', 'top');
    this.waveDisplay.x = wavePos.x;
    this.waveDisplay.y = wavePos.y;
    this.stage.addChild(this.waveDisplay);

    // Enemy counter (top-left, below wave)
    this.enemyCounter = new createjs.Text('Enemies: 0', `${this.viewportManager.getScaledFont(18)}px Hammersmith One`, '#fff');
    const enemyPos = this.viewportManager.getResponsivePosition(ui.enemyCounter.x, ui.enemyCounter.y, 'left', 'top');
    this.enemyCounter.x = enemyPos.x;
    this.enemyCounter.y = enemyPos.y;
    this.stage.addChild(this.enemyCounter);

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

  public update(): void {
    // Update low health warning animation
    const deltaTime = 1 / 60; // Assume 60 FPS for UI updates
    this.lowHealthFlashTimer += deltaTime;
    this.lowAmmoFlashTimer += deltaTime;
    
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
    this.waveDisplay.text = `Wave: ${waveData.number}`;
    this.enemyCounter.text = `Enemies: ${waveData.enemiesRemaining}`;
  }

  public showTimer(timeRemaining: number): void {
    this.timerDisplay.text = `Next Wave in: ${Math.ceil(timeRemaining)}s`;
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
      'Preparing next wave...',
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
    const centerPos = this.viewportManager.getResponsivePosition(ui.healthBar.x, ui.healthBar.y, 'center', 'center');
    const width = this.viewportManager.scaleValue(dims.width * (ui.healthBar.width / 100));
    const height = this.viewportManager.scaleValue(dims.height * (ui.healthBar.height / 100));
    
    const centerX = centerPos.x;
    const bottomY = centerPos.y;

    // Create health background (diamond shape)
    this.healthBackground = new createjs.Shape();
    this.healthBackground.graphics
      .beginFill('#222222')
      .moveTo(centerX - width/2, bottomY)           // Left point
      .lineTo(centerX - width/4, bottomY - height/2) // Top left
      .lineTo(centerX + width/4, bottomY - height/2) // Top right  
      .lineTo(centerX + width/2, bottomY)           // Right point
      .lineTo(centerX + width/4, bottomY + height/2) // Bottom right
      .lineTo(centerX - width/4, bottomY + height/2) // Bottom left
      .closePath();

    // Create health fill (diamond shape - starts full)
    this.healthFill = new createjs.Shape();
    this.updateDiamondFill(1.0, centerX, bottomY, width, height); // Start at 100%

    // Create health border (diamond outline)
    this.healthBorder = new createjs.Shape();
    this.healthBorder.graphics
      .setStrokeStyle(3)
      .beginStroke('#ffffff')
      .moveTo(centerX - width/2, bottomY)           // Left point
      .lineTo(centerX - width/4, bottomY - height/2) // Top left
      .lineTo(centerX + width/4, bottomY - height/2) // Top right  
      .lineTo(centerX + width/2, bottomY)           // Right point
      .lineTo(centerX + width/4, bottomY + height/2) // Bottom right
      .lineTo(centerX - width/4, bottomY + height/2) // Bottom left
      .closePath();

    // Add all elements to stage in order
    this.stage.addChild(this.healthBackground);
    this.stage.addChild(this.healthFill);
    this.stage.addChild(this.healthBorder);

    console.log(`Diamond health bar created at center (${centerX}, ${bottomY}) - ${width}x${height}px`);
  }

  private updateDiamondFill(healthPercentage: number, centerX: number, bottomY: number, width: number, height: number): void {
    const fillWidth = width * healthPercentage;
    
    this.healthFill.graphics.clear();
    if (fillWidth > 0) {
      this.healthFill.graphics
        .beginFill('rgb(0, 180, 174)') // Diamond color
        .moveTo(centerX - fillWidth/2, bottomY)           // Left point (scaled)
        .lineTo(centerX - fillWidth/4, bottomY - height/2) // Top left (scaled)
        .lineTo(centerX + fillWidth/4, bottomY - height/2) // Top right (scaled)  
        .lineTo(centerX + fillWidth/2, bottomY)           // Right point (scaled)
        .lineTo(centerX + fillWidth/4, bottomY + height/2) // Bottom right (scaled)
        .lineTo(centerX - fillWidth/4, bottomY + height/2) // Bottom left (scaled)
        .closePath();
    }
  }

  public updateHealthBar(healthPercentage: number, currentHealth: number, maxHealth: number): void {
    // Store current values
    this.currentHealthPercentage = healthPercentage;
    this.currentHealth = currentHealth;
    this.maxHealth = maxHealth;
    
    const dims = this.viewportManager.getDimensions();
    const ui = gameConfig.ui;
    const centerPos = this.viewportManager.getResponsivePosition(ui.healthBar.x, ui.healthBar.y, 'center', 'center');
    const width = this.viewportManager.scaleValue(dims.width * (ui.healthBar.width / 100));
    const height = this.viewportManager.scaleValue(dims.height * (ui.healthBar.height / 100));
    
    const centerX = centerPos.x;
    const bottomY = centerPos.y;
    
    // Update the diamond fill
    this.updateDiamondFill(healthPercentage, centerX, bottomY, width, height);

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
    const ui = gameConfig.ui;
    const centerPos = this.viewportManager.getResponsivePosition(ui.ammoBar.x, ui.ammoBar.y, 'center', 'center');
    const width = this.viewportManager.scaleValue(dims.width * (ui.ammoBar.width / 100));
    const height = this.viewportManager.scaleValue(dims.height * (ui.ammoBar.height / 100));
    
    const centerX = centerPos.x;
    const centerY = centerPos.y;

    // Create ammo background
    this.ammoBackground = new createjs.Shape();
    this.ammoBackground.graphics
      .beginFill('#333333')
      .drawRoundRect(centerX - width/2, centerY - height/2, width, height, 10);

    // Create ammo fill (starts full)
    this.ammoFill = new createjs.Shape();
    this.updateAmmoFill(1.0, centerX, centerY, width, height); // Start at 100%

    // Create ammo border
    this.ammoBorder = new createjs.Shape();
    this.ammoBorder.graphics
      .setStrokeStyle(2)
      .beginStroke('#ffffff')
      .drawRoundRect(centerX - width/2, centerY - height/2, width, height, 10);

    // Add all elements to stage in order
    this.stage.addChild(this.ammoBackground);
    this.stage.addChild(this.ammoFill);
    this.stage.addChild(this.ammoBorder);

    console.log(`Ammo bar created at center (${centerX}, ${centerY}) - ${width}x${height}px`);
  }

  private updateAmmoFill(ammoPercentage: number, centerX: number, centerY: number, width: number, height: number): void {
    const fillHeight = height * ammoPercentage;
    
    this.ammoFill.graphics.clear();
    if (fillHeight > 0) {
      // Color based on ammo percentage
      let fillColor = '#00ff00'; // Green for high ammo (75-100%)
      if (ammoPercentage <= 0.25) {
        fillColor = '#ff0000'; // Red for critical ammo (0-25%)
      } else if (ammoPercentage <= 0.75) {
        fillColor = '#ffff00'; // Yellow for medium ammo (25-75%)
      }
      
      // Fill from bottom up - start at bottom of bar and fill upward
      const fillY = centerY + height/2 - fillHeight; // Start from bottom
      this.ammoFill.graphics
        .beginFill(fillColor)
        .drawRoundRect(centerX - width/2, fillY, width, fillHeight, 10);
    }
  }

  public updateAmmoBar(ammoPercentage: number, currentAmmo: number, maxAmmo: number): void {
    // Store current values
    this.currentAmmoPercentage = ammoPercentage;
    this.currentAmmo = currentAmmo;
    this.maxAmmo = maxAmmo;
    
    const dims = this.viewportManager.getDimensions();
    const ui = gameConfig.ui;
    const centerPos = this.viewportManager.getResponsivePosition(ui.ammoBar.x, ui.ammoBar.y, 'center', 'center');
    const width = this.viewportManager.scaleValue(dims.width * (ui.ammoBar.width / 100));
    const height = this.viewportManager.scaleValue(dims.height * (ui.ammoBar.height / 100));
    
    const centerX = centerPos.x;
    const centerY = centerPos.y;
    
    // Update the ammo fill
    this.updateAmmoFill(ammoPercentage, centerX, centerY, width, height);

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

    // Update text elements
    const wavePos = this.viewportManager.getResponsivePosition(ui.waveDisplay.x, ui.waveDisplay.y, 'left', 'top');
    this.waveDisplay.x = wavePos.x;
    this.waveDisplay.y = wavePos.y;
    this.waveDisplay.font = `${this.viewportManager.getScaledFont(24)}px Hammersmith One`;

    const enemyPos = this.viewportManager.getResponsivePosition(ui.enemyCounter.x, ui.enemyCounter.y, 'left', 'top');
    this.enemyCounter.x = enemyPos.x;
    this.enemyCounter.y = enemyPos.y;
    this.enemyCounter.font = `${this.viewportManager.getScaledFont(18)}px Hammersmith One`;

    const timerPos = this.viewportManager.getResponsivePosition(ui.timerDisplay.x, ui.timerDisplay.y, 'center', 'top');
    this.timerDisplay.x = timerPos.x;
    this.timerDisplay.y = timerPos.y;
    this.timerDisplay.font = `${this.viewportManager.getScaledFont(20)}px Hammersmith One`;

    // Score display removed for clean UI

    // Recreate health and ammo bars with new dimensions
    this.recreateHealthBar();
    this.recreateAmmoBar();
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
    this.updateAmmoBar(this.currentAmmoPercentage, this.currentAmmo, this.maxAmmo);
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