import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Robot, Site } from '../types';

export interface Path {
  id: string;
  robotId: string;
  points: Array<{ x: number; y: number; z?: number }>;
  color: string;
  visible: boolean;
}

export interface Overlay {
  id: string;
  type: 'waypoint' | 'zone' | 'marker';
  position: { x: number; y: number; z?: number };
  label: string;
  color: string;
  visible: boolean;
}

interface SceneStore {
  // Scene state
  selectedSiteId: string | null;
  robots: Robot[];
  paths: Path[];
  overlays: Overlay[];
  
  // Camera state
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  
  // Performance
  fps: number;
  
  // Actions
  setSelectedSiteId: (siteId: string | null) => void;
  setRobots: (robots: Robot[]) => void;
  addPath: (path: Path) => void;
  removePath: (pathId: string) => void;
  updatePath: (pathId: string, updates: Partial<Path>) => void;
  addOverlay: (overlay: Overlay) => void;
  removeOverlay: (overlayId: string) => void;
  updateOverlay: (overlayId: string, updates: Partial<Overlay>) => void;
  setCameraPosition: (position: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setFPS: (fps: number) => void;
  clearPaths: () => void;
  clearOverlays: () => void;
}

export const useSceneStore = create<SceneStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      selectedSiteId: null,
      robots: [],
      paths: [],
      overlays: [],
      cameraPosition: [10, 10, 10],
      cameraTarget: [0, 0, 0],
      fps: 60,

      // Actions
      setSelectedSiteId: (siteId) =>
        set({ selectedSiteId: siteId }, false, 'setSelectedSiteId'),
      
      setRobots: (robots) =>
        set({ robots }, false, 'setRobots'),
      
      addPath: (path) =>
        set(
          (state) => ({ paths: [...state.paths, path] }),
          false,
          'addPath'
        ),
      
      removePath: (pathId) =>
        set(
          (state) => ({ paths: state.paths.filter(p => p.id !== pathId) }),
          false,
          'removePath'
        ),
      
      updatePath: (pathId, updates) =>
        set(
          (state) => ({
            paths: state.paths.map(p => 
              p.id === pathId ? { ...p, ...updates } : p
            )
          }),
          false,
          'updatePath'
        ),
      
      addOverlay: (overlay) =>
        set(
          (state) => ({ overlays: [...state.overlays, overlay] }),
          false,
          'addOverlay'
        ),
      
      removeOverlay: (overlayId) =>
        set(
          (state) => ({ overlays: state.overlays.filter(o => o.id !== overlayId) }),
          false,
          'removeOverlay'
        ),
      
      updateOverlay: (overlayId, updates) =>
        set(
          (state) => ({
            overlays: state.overlays.map(o => 
              o.id === overlayId ? { ...o, ...updates } : o
            )
          }),
          false,
          'updateOverlay'
        ),
      
      setCameraPosition: (position) =>
        set({ cameraPosition: position }, false, 'setCameraPosition'),
      
      setCameraTarget: (target) =>
        set({ cameraTarget: target }, false, 'setCameraTarget'),
      
      setFPS: (fps) =>
        set({ fps }, false, 'setFPS'),
      
      clearPaths: () =>
        set({ paths: [] }, false, 'clearPaths'),
      
      clearOverlays: () =>
        set({ overlays: [] }, false, 'clearOverlays'),
      
      // Calibration actions
      setCalibrationPoints: (points) =>
        set({ calibrationPoints: points }, false, 'setCalibrationPoints'),
      
      addCalibrationPoint: (point) =>
        set(
          (state) => ({
            calibrationPoints: [...state.calibrationPoints, point]
          }),
          false,
          'addCalibrationPoint'
        ),
      
      setCalibrationDistance: (distance) =>
        set({ calibrationDistance: distance }, false, 'setCalibrationDistance'),
      
      setOrigin: (origin) =>
        set({ origin }, false, 'setOrigin'),
      
      setIsCalibrating: (calibrating) =>
        set({ isCalibrating: calibrating }, false, 'setIsCalibrating'),
      
      resetCalibration: () =>
        set({
          calibrationPoints: [],
          calibrationDistance: null,
          origin: null,
          isCalibrating: false,
        }, false, 'resetCalibration'),
    }),
    { name: 'scene-store' }
  )
);