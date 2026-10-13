/**
 * Coordinate transformation utilities for map calibration
 */

import type { Site } from '../types';

export interface CalibrationPoint {
  pixel: [number, number];
  world?: [number, number];
}

/**
 * Convert pixel coordinates to world coordinates
 */
export const pixelToWorld = (px: number, py: number, site: Site): [number, number] => {
  const worldX = site.origin.x + px * site.scale_m_per_px;
  const worldY = site.origin.y + py * site.scale_m_per_px;
  return [worldX, worldY];
};

/**
 * Convert world coordinates to pixel coordinates
 */
export const worldToPixel = (x: number, y: number, site: Site): [number, number] => {
  const px = (x - site.origin.x) / site.scale_m_per_px;
  const py = (y - site.origin.y) / site.scale_m_per_px;
  return [px, py];
};

/**
 * Calculate scale from two calibration points and real-world distance
 */
export const calculateScale = (
  point1: [number, number],
  point2: [number, number],
  realWorldDistance: number
): number => {
  const pixelDistance = Math.sqrt(
    Math.pow(point2[0] - point1[0], 2) + Math.pow(point2[1] - point1[1], 2)
  );

  if (pixelDistance === 0) {
    throw new Error('Calibration points cannot be the same');
  }

  return realWorldDistance / pixelDistance;
};

/**
 * Validate calibration data
 */
export const validateCalibration = (
  points: Array<[number, number]>,
  distance: number | null
): { valid: boolean; error?: string } => {
  if (points.length < 2) {
    return { valid: false, error: 'Need at least 2 calibration points' };
  }

  if (!distance || distance <= 0) {
    return { valid: false, error: 'Distance must be greater than 0' };
  }

  const [point1, point2] = points;
  const pixelDistance = Math.sqrt(
    Math.pow(point2[0] - point1[0], 2) + Math.pow(point2[1] - point1[1], 2)
  );

  if (pixelDistance < 10) {
    return { valid: false, error: 'Calibration points too close together' };
  }

  return { valid: true };
};
