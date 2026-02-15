import { ShopEffectType, ShopItem, WeaponType } from '@types';

export class UpgradeManager {
  private purchaseCounts: Map<ShopEffectType, number> = new Map();
  private unlockedWeapons: Set<WeaponType> = new Set();

  // Upgrade scaling constants
  private readonly BULLET_SPEED_INCREASE = 0.2; // 20% per upgrade
  private readonly FIRE_RATE_REDUCTION = 0.15; // 15% reduction per upgrade
  private readonly FIRE_RATE_MAX_REDUCTION = 0.8; // Max 80% reduction
  private readonly EXTRA_BULLETS_AMOUNT = 25; // 25 bullets per upgrade
  private readonly MOVE_SPEED_INCREASE = 0.15; // 15% per upgrade
  private readonly MAX_HEALTH_BONUS = 25; // 25 HP per upgrade
  private readonly MAGNET_RANGE_INCREASE = 0.5; // 50% per upgrade

  constructor() {
    this.reset();
  }

  public applyUpgrade(item: ShopItem): void {
    const current = this.purchaseCounts.get(item.effect) || 0;
    this.purchaseCounts.set(item.effect, current + 1);

    // Track weapon unlocks
    if (item.effect === ShopEffectType.WEAPON_SCATTER) {
      this.unlockedWeapons.add(WeaponType.SCATTER);
    } else if (item.effect === ShopEffectType.WEAPON_HOMING) {
      this.unlockedWeapons.add(WeaponType.HOMING);
    }

    console.log(`Applied upgrade: ${item.name} (Count: ${this.purchaseCounts.get(item.effect)})`);
  }

  public getBulletSpeedMultiplier(): number {
    const count = this.getPurchaseCount(ShopEffectType.BULLET_SPEED);
    return Math.pow(1 + this.BULLET_SPEED_INCREASE, count);
  }

  public getFireRateMultiplier(): number {
    const count = this.getPurchaseCount(ShopEffectType.FIRE_RATE);
    const reduction = Math.pow(1 - this.FIRE_RATE_REDUCTION, count);
    return Math.max(1 - this.FIRE_RATE_MAX_REDUCTION, reduction);
  }

  public getExtraBulletsBonus(): number {
    return this.getPurchaseCount(ShopEffectType.EXTRA_BULLETS) * this.EXTRA_BULLETS_AMOUNT;
  }

  public getMoveSpeedMultiplier(): number {
    const count = this.getPurchaseCount(ShopEffectType.MOVE_SPEED);
    return 1 + count * this.MOVE_SPEED_INCREASE;
  }

  public getMaxHealthBonus(): number {
    return this.getPurchaseCount(ShopEffectType.MAX_HEALTH) * this.MAX_HEALTH_BONUS;
  }

  public getMagnetRangeMultiplier(): number {
    const count = this.getPurchaseCount(ShopEffectType.MAGNET_RANGE);
    return 1 + count * this.MAGNET_RANGE_INCREASE;
  }

  public isWeaponUnlocked(type: WeaponType): boolean {
    return this.unlockedWeapons.has(type);
  }

  public getUnlockedWeapons(): WeaponType[] {
    return Array.from(this.unlockedWeapons);
  }

  public getPurchaseCount(effect: ShopEffectType): number {
    return this.purchaseCounts.get(effect) || 0;
  }

  public getScaledCost(item: ShopItem): number {
    const count = this.getPurchaseCount(item.effect);
    const scaling = item.scalingCost || 0;
    return item.cost + count * scaling;
  }

  public getEligibleUpgrades(pool: ShopItem[]): ShopItem[] {
    return pool.filter(item => {
      if (item.maxPurchases === undefined) return true;
      const count = this.getPurchaseCount(item.effect);
      return count < item.maxPurchases;
    });
  }

  public getUpgradeCount(effect: ShopEffectType): number {
    return this.getPurchaseCount(effect);
  }

  public reset(): void {
    this.purchaseCounts = new Map();
    this.unlockedWeapons = new Set();
  }
}
