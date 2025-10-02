import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Event, EventMessage, Site, Robot, Mission, TelemetryData, KPI } from '../types';
import type { AdapterType } from '../adapters';

interface AppState {
  // Authentication
  user: any;
  isAuthenticated: boolean;

  // UI State
  sidebarOpen: boolean;

  // Current selections
  currentSite: Site | null;
  selectedRobot: Robot | null;
  selectedMission: Mission | null;

  // Connection state
  isRealtimeConnected: boolean;
  telemetryEnabled: boolean;

  // Adapter state
  adapterType: AdapterType;
  isAdapterConnected: boolean;
  adapterConnectionStatus: Record<AdapterType, boolean>;

  // Data
  sites: Site[];
  robots: Robot[];
  missions: Mission[];
  events: Event[];
  telemetryBuffer: TelemetryData[];
  kpi: KPI;

  // Fault injection
  faultInjected: boolean;

  // Actions
  setUser: (user: any) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentSite: (site: Site | null) => void;
  setSelectedRobot: (robot: Robot | null) => void;
  setSelectedMission: (mission: Mission | null) => void;
  setRealtimeConnected: (connected: boolean) => void;
  setTelemetryEnabled: (enabled: boolean) => void;
  setAdapter: (type: AdapterType) => void;
  setAdapterConnected: (connected: boolean) => void;
  setAdapterConnectionStatus: (type: AdapterType, connected: boolean) => void;
  setSites: (sites: Site[]) => void;
  setRobots: (robots: Robot[]) => void;
  setMissions: (missions: Mission[]) => void;
  addEvent: (event: EventMessage) => void;
  addTelemetry: (data: TelemetryData) => void;
  updateKpi: (kpi: Partial<KPI>) => void;
  setFaultInjected: (injected: boolean) => void;
  clearEvents: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      sidebarOpen: true,
      currentSite: null,
      selectedRobot: null,
      selectedMission: null,
      isRealtimeConnected: false,
      telemetryEnabled: true,
      adapterType: 'mock',
      isAdapterConnected: false,
      adapterConnectionStatus: {
        mock: false,
        ros: false,
        rmf: false,
        vda5050: false
      },
      sites: [],
      robots: [],
      missions: [],
      events: [],
      telemetryBuffer: [],
      kpi: {
        totalMissions: 0,
        activeMissions: 0,
        completedMissions: 0,
        totalRobots: 0,
        activeRobots: 0,
        batteryAverage: 0,
        uptime: 0
      },
      faultInjected: false,
      
      // Actions
      setUser: (user: any) => {
        set({ user, isAuthenticated: !!user });
      },
      
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },
      
      setCurrentSite: (site: Site | null) => {
        set({ currentSite: site });
      },
      
      setSelectedRobot: (robot: Robot | null) => {
        set({ selectedRobot: robot });
      },
      
      setSelectedMission: (mission: Mission | null) => {
        set({ selectedMission: mission });
      },
      
      setRealtimeConnected: (connected: boolean) => {
        set({ isRealtimeConnected: connected });
      },
      
      setTelemetryEnabled: (enabled: boolean) => {
        set({ telemetryEnabled: enabled });
      },

      setAdapter: (type: AdapterType) => {
        set({ adapterType: type });
      },

      setAdapterConnected: (connected: boolean) => {
        const { adapterType, adapterConnectionStatus } = get();
        set({
          isAdapterConnected: connected,
          adapterConnectionStatus: {
            ...adapterConnectionStatus,
            [adapterType]: connected
          }
        });
      },

      setAdapterConnectionStatus: (type: AdapterType, connected: boolean) => {
        const { adapterConnectionStatus } = get();
        set({
          adapterConnectionStatus: {
            ...adapterConnectionStatus,
            [type]: connected
          }
        });
      },

      setSites: (sites: Site[]) => {
        set({ sites });
      },
      
      setRobots: (robots: Robot[]) => {
        set({ robots });
      },
      
      setMissions: (missions: Mission[]) => {
        set({ missions });
      },
      
      addEvent: (eventMessage: EventMessage) => {
        const event: Event = {
          id: crypto.randomUUID(),
          type: 'SYSTEM',
          payload: {
            msg: eventMessage.msg,
            level: eventMessage.level,
            ...eventMessage.payload
          },
          ts: new Date(eventMessage.ts).toISOString()
        };
        
        set((state) => ({
          events: [event, ...state.events].slice(0, 1000) // Keep last 1000 events
        }));
      },
      
      addTelemetry: (data: TelemetryData) => {
        set((state) => ({
          telemetryBuffer: [...state.telemetryBuffer, data].slice(-100) // Keep last 100 telemetry points
        }));
      },
      
      updateKpi: (kpiUpdate: Partial<KPI>) => {
        set((state) => ({
          kpi: { ...state.kpi, ...kpiUpdate }
        }));
      },
      
      setFaultInjected: (injected: boolean) => {
        set({ faultInjected: injected });
      },
      
      clearEvents: () => {
        set({ events: [] });
      }
    }),
    {
      name: 'app-store'
    }
  )
);