import * as createjs from '@thegraid/createjs-module';
import { GameObject } from '@types';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: () => void;
}

export class UpgradeManager implements GameObject {
  private stage: createjs.Stage;
  private menuOpen: boolean = false;
  private button: createjs.Shape;
  private buttonText: createjs.Text;
  private upgradeMenu: createjs.Container | null = null;
  private upgrades: Upgrade[] = [];
  private points: number = 0;

  constructor(stage: createjs.Stage) {
    this.stage = stage;
    this.createUpgradeButton();
    this.initializeUpgrades();
  }

  private createUpgradeButton(): void {
    // Create upgrade button
    this.button = new createjs.Shape();
    this.button.graphics
      .beginFill("rgb(42, 47, 47)")
      .drawRect(1312, 13, 100, 30);
    this.button.alpha = 0.3;
    
    // Create button text
    this.buttonText = new createjs.Text("upgrades", "18px Hammersmith One", "#fff");
    this.buttonText.x = 1320;
    this.buttonText.y = 16;
    this.buttonText.alpha = 0.4;
    
    // Add click handler
    this.button.addEventListener('click', this.toggleMenu.bind(this));
    this.button.cursor = 'pointer';
    
    // Add to stage
    this.stage.addChild(this.button);
    this.stage.addChild(this.buttonText);
  }

  private initializeUpgrades(): void {
    this.upgrades = [
      {
        id: 'speed',
        name: 'Speed Boost',
        description: 'Increase player movement speed',
        cost: 100,
        effect: () => {
          console.log('Speed upgrade purchased');
        }
      },
      {
        id: 'damage',
        name: 'Damage Increase',
        description: 'Increase weapon damage',
        cost: 150,
        effect: () => {
          console.log('Damage upgrade purchased');
        }
      },
      {
        id: 'firerate',
        name: 'Fire Rate',
        description: 'Increase weapon fire rate',
        cost: 200,
        effect: () => {
          console.log('Fire rate upgrade purchased');
        }
      }
    ];
  }

  private toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    
    if (this.menuOpen) {
      this.createUpgradeMenu();
    } else {
      this.closeUpgradeMenu();
    }
  }

  private createUpgradeMenu(): void {
    if (this.upgradeMenu) return;
    
    // Create menu container
    this.upgradeMenu = new createjs.Container();
    
    // Create menu background
    const menuBg = new createjs.Shape();
    menuBg.graphics
      .beginFill("rgba(42, 47, 47, 0.95)")
      .drawRect(800, 0, 600, 800);
    this.upgradeMenu.addChild(menuBg);
    
    // Add title
    const title = new createjs.Text("UPGRADES", "32px Hammersmith One", "#fff");
    title.x = 950;
    title.y = 30;
    this.upgradeMenu.addChild(title);
    
    // Add points display
    const pointsText = new createjs.Text(`Points: ${this.points}`, "20px Hammersmith One", "#fff");
    pointsText.x = 820;
    pointsText.y = 80;
    this.upgradeMenu.addChild(pointsText);
    
    // Add close button
    const closeBtn = new createjs.Shape();
    closeBtn.graphics
      .beginFill("#ff4444")
      .drawRect(1360, 20, 30, 30);
    closeBtn.cursor = 'pointer';
    closeBtn.addEventListener('click', this.toggleMenu.bind(this));
    this.upgradeMenu.addChild(closeBtn);
    
    const closeText = new createjs.Text("X", "20px Hammersmith One", "#fff");
    closeText.x = 1370;
    closeText.y = 25;
    this.upgradeMenu.addChild(closeText);
    
    // Add upgrade items
    let yOffset = 130;
    for (const upgrade of this.upgrades) {
      this.createUpgradeItem(upgrade, yOffset);
      yOffset += 100;
    }
    
    this.stage.addChild(this.upgradeMenu);
  }

  private createUpgradeItem(upgrade: Upgrade, yOffset: number): void {
    if (!this.upgradeMenu) return;
    
    // Create upgrade item container
    const itemContainer = new createjs.Container();
    
    // Background
    const itemBg = new createjs.Shape();
    itemBg.graphics
      .beginFill("rgba(255, 255, 255, 0.1)")
      .drawRect(820, yOffset, 550, 80);
    itemContainer.addChild(itemBg);
    
    // Name
    const nameText = new createjs.Text(upgrade.name, "24px Hammersmith One", "#fff");
    nameText.x = 840;
    nameText.y = yOffset + 10;
    itemContainer.addChild(nameText);
    
    // Description
    const descText = new createjs.Text(upgrade.description, "16px Hammersmith One", "#aaa");
    descText.x = 840;
    descText.y = yOffset + 40;
    itemContainer.addChild(descText);
    
    // Cost
    const costText = new createjs.Text(`Cost: ${upgrade.cost}`, "18px Hammersmith One", "#ffd700");
    costText.x = 1200;
    costText.y = yOffset + 30;
    itemContainer.addChild(costText);
    
    // Buy button
    const buyBtn = new createjs.Shape();
    const canAfford = this.points >= upgrade.cost;
    buyBtn.graphics
      .beginFill(canAfford ? "#4CAF50" : "#666")
      .drawRect(1300, yOffset + 25, 60, 30);
    
    if (canAfford) {
      buyBtn.cursor = 'pointer';
      buyBtn.addEventListener('click', () => this.purchaseUpgrade(upgrade));
    }
    
    itemContainer.addChild(buyBtn);
    
    const buyText = new createjs.Text("BUY", "16px Hammersmith One", "#fff");
    buyText.x = 1315;
    buyText.y = yOffset + 32;
    itemContainer.addChild(buyText);
    
    this.upgradeMenu.addChild(itemContainer);
  }

  private closeUpgradeMenu(): void {
    if (this.upgradeMenu) {
      this.stage.removeChild(this.upgradeMenu);
      this.upgradeMenu = null;
    }
  }

  private purchaseUpgrade(upgrade: Upgrade): void {
    if (this.points >= upgrade.cost) {
      this.points -= upgrade.cost;
      upgrade.effect();
      this.closeUpgradeMenu();
      this.createUpgradeMenu(); // Refresh menu
    }
  }

  public addPoints(amount: number): void {
    this.points += amount;
  }

  public update(): void {
    // Update button hover effect
    if (this.button.hitTest(this.stage.mouseX - this.button.x, this.stage.mouseY - this.button.y)) {
      this.button.alpha = 0.5;
      this.buttonText.alpha = 0.6;
    } else {
      this.button.alpha = 0.3;
      this.buttonText.alpha = 0.4;
    }
  }
}