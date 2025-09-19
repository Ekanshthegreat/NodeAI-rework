import { describe, it, expect } from 'vitest';
import { pixelToWorld, worldToPixel, calculateScale, validateCalibration } from './coordinates';
import type { Site } from '../types';

const mockSite: Site = {
  id: 'test-site',
  name: 'Test Site',
  map_url: 'test.png',
  origin: { x: 0, y: 0 },
  scale_m_per_px: 0.1,
};

describe('Coordinate Transformations', () => {
  describe('pixelToWorld', () => {
    it('should convert pixel coordinates to world coordinates', () => {
      const [worldX, worldY] = pixelToWorld(100, 200, mockSite);
      expect(worldX).toBe(10); // 0 + (100 * 0.1)
      expect(worldY).toBe(20); // 0 + (200 * 0.1)
    });

    it('should handle origin offset', () => {
      const siteWithOffset = { ...mockSite, origin: { x: 5, y: 10 } };
      const [worldX, worldY] = pixelToWorld(100, 200, siteWithOffset);
      expect(worldX).toBe(15); // 5 + (100 * 0.1)
      expect(worldY).toBe(30); // 10 + (200 * 0.1)
    });
  });

  describe('worldToPixel', () => {
    it('should convert world coordinates to pixel coordinates', () => {
      const [pixelX, pixelY] = worldToPixel(10, 20, mockSite);
      expect(pixelX).toBe(100); // (10 - 0) / 0.1
      expect(pixelY).toBe(200); // (20 - 0) / 0.1
    });

    it('should handle origin offset', () => {
      const siteWithOffset = { ...mockSite, origin: { x: 5, y: 10 } };
      const [pixelX, pixelY] = worldToPixel(15, 30, siteWithOffset);
      expect(pixelX).toBe(100); // (15 - 5) / 0.1
      expect(pixelY).toBe(200); // (30 - 10) / 0.1
    });
  });

  describe('calculateScale', () => {
    it('should calculate correct scale from two points and distance', () => {
      const point1: [number, number] = [0, 0];
      const point2: [number, number] = [100, 0]; // 100 pixels apart horizontally
      const realDistance = 10; // 10 meters in real world
      
      const scale = calculateScale(point1, point2, realDistance);
      expect(scale).toBe(0.1); // 10m / 100px = 0.1 m/px
    });

    it('should handle diagonal distances', () => {
      const point1: [number, number] = [0, 0];
      const point2: [number, number] = [30, 40]; // 3-4-5 triangle, 50 pixels apart
      const realDistance = 5; // 5 meters in real world
      
      const scale = calculateScale(point1, point2, realDistance);
      expect(scale).toBe(0.1); // 5m / 50px = 0.1 m/px
    });

    it('should throw error for identical points', () => {
      const point1: [number, number] = [100, 100];
      const point2: [number, number] = [100, 100];
      const realDistance = 10;
      
      expect(() => calculateScale(point1, point2, realDistance)).toThrow(
        'Calibration points cannot be the same'
      );
    });
  });

  describe('validateCalibration', () => {
    it('should validate correct calibration data', () => {
      const points: Array<[number, number]> = [[0, 0], [100, 0]];
      const distance = 10;
      
      const result = validateCalibration(points, distance);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject insufficient points', () => {
      const points: Array<[number, number]> = [[0, 0]];
      const distance = 10;
      
      const result = validateCalibration(points, distance);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Need at least 2 calibration points');
    });

    it('should reject invalid distance', () => {
      const points: Array<[number, number]> = [[0, 0], [100, 0]];
      const distance = 0;
      
      const result = validateCalibration(points, distance);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Distance must be greater than 0');
    });

    it('should reject points too close together', () => {
      const points: Array<[number, number]> = [[0, 0], [5, 0]]; // Only 5 pixels apart
      const distance = 10;
      
      const result = validateCalibration(points, distance);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Calibration points too close together');
    });
  });
});

describe('Round-trip Conversions', () => {
  it('should maintain accuracy in round-trip conversions', () => {
    const originalWorld: [number, number] = [15.5, 23.7];
    
    // World -> Pixel -> World
    const [px, py] = worldToPixel(originalWorld[0], originalWorld[1], mockSite);
    const [worldX, worldY] = pixelToWorld(px, py, mockSite);
    
    expect(worldX).toBeCloseTo(originalWorld[0], 10);
    expect(worldY).toBeCloseTo(originalWorld[1], 10);
  });

  it('should handle different scales correctly', () => {
    const highResSite = { ...mockSite, scale_m_per_px: 0.01 }; // 1cm per pixel
    const originalWorld: [number, number] = [5.25, 8.75];
    
    const [px, py] = worldToPixel(originalWorld[0], originalWorld[1], highResSite);
    const [worldX, worldY] = pixelToWorld(px, py, highResSite);
    
    expect(worldX).toBeCloseTo(originalWorld[0], 10);
    expect(worldY).toBeCloseTo(originalWorld[1], 10);
  });
});