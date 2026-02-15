import * as createjs from '@thegraid/createjs-module';
import { Position, ShopItem } from '@types';
import { gameConfig } from '@config/gameConfig';
import { SpacePort } from '@entities/SpacePort';
import { UpgradeManager } from './UpgradeManager';

export interface PurchaseResult {
  item: ShopItem;
  cost: number;
}

export class SpacePortManager {
  private stage: createjs.Stage;
  private upgradeManager: UpgradeManager;
  private ports: SpacePort[] = [];
  private visible: boolean = false;

  constructor(stage: createjs.Stage, upgradeManager: UpgradeManager) {
    this.stage = stage;
    this.upgradeManager = upgradeManager;
  }

  /**
   * Generate new space ports for a rest period.
   * Fisher-Yates shuffles the eligible upgrades, picks up to maxPortsPerRest,
   * and assigns them to random positions.
   */
  public generatePorts(): void {
    // Destroy existing ports
    this.destroyPorts();

    const config = gameConfig.shop.spacePort;
    const pool = gameConfig.shop.upgradePool;

    // Get eligible upgrades (not maxed out)
    const eligible = this.upgradeManager.getEligibleUpgrades(pool);
    if (eligible.length === 0) return;

    // Fisher-Yates shuffle
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take up to maxPortsPerRest
    const selected = shuffled.slice(0, config.maxPortsPerRest);

    // Shuffle positions
    const positions = [...config.positions];
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Create ports
    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      const cost = this.upgradeManager.getScaledCost(item);
      const position = positions[i];

      const port = new SpacePort(this.stage, item, cost, position);
      this.ports.push(port);
    }
  }

  /**
   * Check if player can purchase from any port.
   * Also updates affordability state for all ports.
   */
  public checkPurchases(playerPos: Position, experience: number): PurchaseResult | null {
    if (!this.visible) return null;

    for (const port of this.ports) {
      // Update affordability
      port.setAffordable(experience >= port.getCost());

      // Check collision
      const inZone = port.checkCollision(playerPos);
      port.setPlayerInZone(inZone);

      // Check for purchase
      if (inZone && port.canPurchase(experience)) {
        port.purchase();
        return {
          item: port.getItem(),
          cost: port.getCost()
        };
      }
    }

    return null;
  }

  public update(): void {
    if (!this.visible) return;
    for (const port of this.ports) {
      port.update();
    }
  }

  public show(): void {
    this.visible = true;
    for (const port of this.ports) {
      port.show();
    }
  }

  public hide(): void {
    this.visible = false;
    for (const port of this.ports) {
      port.hide();
    }
  }

  public isVisible(): boolean {
    return this.visible;
  }

  private destroyPorts(): void {
    for (const port of this.ports) {
      port.destroy();
    }
    this.ports = [];
  }

  public destroy(): void {
    this.destroyPorts();
  }

  public reset(): void {
    this.destroyPorts();
    this.visible = false;
  }
}
