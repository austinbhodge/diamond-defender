import { Position } from '@types';

export function calculateAngle(from: Position, to: Position): number {
  const xOff = from.x - to.x;
  const yOff = from.y - to.y;
  let angle = (Math.atan(xOff / yOff) / Math.PI) * 180;
  
  if (yOff > 0) {
    angle += -180;
  }
  
  return angle;
}

export function calculateDistance(from: Position, to: Position): number {
  const xOff = from.x - to.x;
  const yOff = from.y - to.y;
  return Math.sqrt(Math.pow(xOff, 2) + Math.pow(yOff, 2));
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}