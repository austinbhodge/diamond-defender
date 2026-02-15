export interface PolyContour {
  points: Array<{ x: number; y: number }>;
  closed: boolean;
}

export interface DrawLayer {
  type: 'fill' | 'stroke' | 'circle' | 'ellipse';
  contour?: PolyContour;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  strokeWidth?: number;
  colorKey: string;
}

export interface ShipBlueprint {
  layers: DrawLayer[];
  boundingRadius: number;
}

export interface ColorPalette {
  [key: string]: string;
}

export interface UpgradeSnapshot {
  bulletSpeed: number;
  fireRate: number;
  extraBullets: number;
  moveSpeed: number;
  maxHealth: number;
  magnetRange: number;
  totalUpgrades: number;
}
