import { ColorPalette } from '@types';

// ─── Player Palettes ───────────────────────────────────────

export const PLAYER_PALETTE: ColorPalette = {
  hull: 'rgb(0, 180, 174)',
  cockpit: 'rgb(0, 120, 130)',
  engine: 'rgba(100, 255, 240, 0.6)',
  stripe: 'rgba(160, 255, 245, 0.5)',
  accent: 'rgba(0, 220, 210, 0.7)',
  armor: 'rgba(0, 150, 145, 0.8)',
  shadow: 'rgba(0, 80, 78, 0.6)',
  detail: 'rgba(0, 200, 195, 0.6)',
  weapon: 'rgb(0, 180, 174)',
  // Weapon-specific colors
  weapon_laser: 'rgb(107, 233, 255)',
  weapon_dub: 'rgb(80, 200, 235)',
  weapon_circle: 'rgb(138, 43, 226)',
  weapon_scatter: 'rgb(255, 102, 0)',
  weapon_homing: 'rgb(255, 0, 255)',
};

export const PLAYER_FLASH_PALETTE: ColorPalette = {
  hull: 'rgb(255, 100, 100)',
  cockpit: 'rgb(200, 60, 60)',
  engine: 'rgba(255, 150, 150, 0.6)',
  stripe: 'rgba(255, 180, 180, 0.5)',
  accent: 'rgba(255, 150, 150, 0.7)',
  armor: 'rgba(255, 120, 120, 0.8)',
  shadow: 'rgba(180, 60, 60, 0.6)',
  detail: 'rgba(255, 160, 160, 0.6)',
  weapon: 'rgb(255, 100, 100)',
  weapon_laser: 'rgb(255, 180, 180)',
  weapon_dub: 'rgb(255, 180, 180)',
  weapon_circle: 'rgb(255, 180, 180)',
  weapon_scatter: 'rgb(255, 180, 180)',
  weapon_homing: 'rgb(255, 180, 180)',
};

// ─── Chase Enemy Palettes ──────────────────────────────────

export const CHASE_PALETTE: ColorPalette = {
  hull: 'rgb(180, 0, 0)',
  stripe: 'rgb(100, 0, 0)',
  accent: 'rgb(220, 40, 40)',
  shadow: 'rgb(80, 0, 0)',
  detail: 'rgb(150, 20, 20)',
};

export const CHASE_FLASH_PALETTE: ColorPalette = {
  hull: 'rgb(255, 255, 255)',
  stripe: 'rgb(220, 220, 220)',
  accent: 'rgb(240, 240, 240)',
  shadow: 'rgb(200, 200, 200)',
  detail: 'rgb(230, 230, 230)',
};

// ─── Circle Shoot Enemy Palettes ───────────────────────────

export const CIRCLE_SHOOT_PALETTE: ColorPalette = {
  hull: 'rgb(200, 100, 20)',
  inner: 'rgb(140, 60, 10)',
  weapon: 'rgb(160, 80, 15)',
  accent: 'rgb(230, 120, 30)',
  detail: 'rgb(180, 90, 20)',
  shadow: 'rgb(100, 50, 10)',
};

export const CIRCLE_SHOOT_FLASH_PALETTE: ColorPalette = {
  hull: 'rgb(255, 255, 255)',
  inner: 'rgb(220, 220, 220)',
  weapon: 'rgb(200, 200, 200)',
  accent: 'rgb(240, 240, 240)',
  detail: 'rgb(230, 230, 230)',
  shadow: 'rgb(210, 210, 210)',
};

// ─── Big Shooter Palettes ──────────────────────────────────

export const BIG_SHOOTER_PALETTE: ColorPalette = {
  glow: 'rgba(200, 0, 0, 0.25)',
  hull: 'rgb(180, 0, 0)',
  bridge: 'rgb(220, 50, 50)',
  engine: 'rgba(255, 100, 50, 0.5)',
  accent: 'rgb(200, 30, 30)',
  detail: 'rgb(160, 20, 20)',
  shadow: 'rgb(100, 0, 0)',
  weapon: 'rgb(180, 40, 40)',
};

export const BIG_SHOOTER_FLASH_PALETTE: ColorPalette = {
  glow: 'rgba(255, 255, 255, 0.2)',
  hull: 'rgb(255, 255, 255)',
  bridge: 'rgb(220, 220, 220)',
  engine: 'rgba(255, 200, 200, 0.5)',
  accent: 'rgb(240, 240, 240)',
  detail: 'rgb(230, 230, 230)',
  shadow: 'rgb(200, 200, 200)',
  weapon: 'rgb(240, 240, 240)',
};

// ─── Dash Worm Palettes ────────────────────────────────────

export const WORM_PALETTE: ColorPalette = {
  hull: 'rgb(200, 0, 0)',
  eye: 'rgb(255, 255, 0)',
  accent: 'rgb(220, 30, 30)',
  shadow: 'rgb(120, 0, 0)',
  detail: 'rgb(180, 20, 20)',
  segment: 'rgba(180, 20, 20, 1)',
};

export const WORM_FLASH_PALETTE: ColorPalette = {
  hull: 'rgb(255, 255, 255)',
  eye: 'rgb(200, 200, 200)',
  accent: 'rgb(240, 240, 240)',
  shadow: 'rgb(210, 210, 210)',
  detail: 'rgb(230, 230, 230)',
  segment: 'rgba(255, 255, 255, 1)',
};
