import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Robot, Site, Mission, Event, TelemetryMessage } from '../types';

interface AppStore {
  // Auth
  user: unknown | null;
  isAuthenticated: boolean;
  
  // Current selections
  currentSite: string | null;
  selectedRobot: string | null;
  selectedMission: string | null;
  
  // Data
  sites: Site[];
  robots: Robot[];
  missions: Mission[];
  events: Event[];
  telemetryBuffer: TelemetryMessage[];
  
  // UI State
  isRealtimeConnected: boolean;
  telemetryEnabled: boolean;
  sidebarOpen: boolean;
  
  // Actions
  setUser: (user: unknown | null) => void;
  setCurrentSite: (siteId: string | null) => void;
  setSelectedRobot: (robotId: string | null) => void;
  setSelectedMission: (missionId: string | null) => void;
  setSites: (sites: Site[]) => void;
  setRobots: (robots: Robot[]) => void;
  setMissions: (missions: Mission[]) => void;
  addEvent: (event: Event) => void;
  addTelemetry: (telemetry: TelemetryMessage) => void;
  setRealtimeConnected: (connected: boolean) => void;
  setTelemetryEnabled: (enabled: boolean) => void;
  toggleSidebar: () => void;
  clearTelemetryBuffer: () => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      currentSite: null,
      selectedRobot: null,
      selectedMission: null,
      sites: [],
      robots: [],
      missions: [],
      events: [],
      telemetryBuffer: [],
      isRealtimeConnected: false,
      telemetryEnabled: true,
      sidebarOpen: true,

      // Actions
      setUser: (user) =>
        set({ user, isAuthenticated: !!user }, false, 'setUser'),
      
      setCurrentSite: (siteId) =>
        set({ currentSite: siteId }, false, 'setCurrentSite'),
      
      setSelectedRobot: (robotId) =>
        set({ selectedRobot: robotId }, false, 'setSelectedRobot'),
      
      setSelectedMission: (missionId) =>
        set({ selectedMission: missionId }, false, 'setSelectedMission'),
      
      setSites: (sites) =>
        set({ sites }, false, 'setSites'),
      
      setRobots: (robots) =>
        set({ robots }, false, 'setRobots'),
      
      setMissions: (missions) =>
        set({ missions }, false, 'setMissions'),
      
      addEvent: (event) =>
        set(
          (state) => ({ events: [...state.events.slice(-99), event] }),
          false,
          'addEvent'
        ),
      
      addTelemetry: (telemetry) =>
        set(
          (state) => ({
            telemetryBuffer: [...state.telemetryBuffer.slice(-999), telemetry],
          }),
          false,
          'addTelemetry'
        ),
      
      setRealtimeConnected: (connected) =>
        set({ isRealtimeConnected: connected }, false, 'setRealtimeConnected'),
      
      setTelemetryEnabled: (enabled) =>
        set({ telemetryEnabled: enabled }, false, 'setTelemetryEnabled'),
      
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar'),
      
      clearTelemetryBuffer: () =>
        set({ telemetryBuffer: [] }, false, 'clearTelemetryBuffer'),
    }),
    { name: 'nodeai-store' }
  )
);