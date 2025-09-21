import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import type { Robot, Site, Mission, Event, TelemetryMessage, MissionPlan } from '../types';

interface KPI {
  replans_count: number;
  interventions_avoided: number;
  mttr_ms_avg: number;
}

interface PolicyConfig {
  selfHealEnabled: boolean;
  defaultMinBatteryPct: number;
  defaultBlockedSeconds: number;
}

interface FaultInjection {
  blockedUntil?: number;
  drained?: boolean;
}

interface AppStore {
  // Auth
  user: User | null;
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
  
  // Policy & KPI
  kpi: KPI;
  policy: PolicyConfig;
  faultInjected: Record<string, FaultInjection>;
  missionPlans: Record<string, MissionPlan>;
  
  // UI State
  isRealtimeConnected: boolean;
  telemetryEnabled: boolean;
  sidebarOpen: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
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
  
  // Policy & KPI Actions
  setMissionPlan: (mission_id: string, plan: MissionPlan) => void;
  setPolicy: (p: Partial<PolicyConfig>) => void;
  bumpKPI: (delta: Partial<KPI>) => void;
  setFault: (robotId: string, patch: FaultInjection) => void;
  pushEvent: (event: { ts: number; level: 'INFO' | 'WARN' | 'ERROR'; msg: string; payload?: Record<string, unknown> }) => void;
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
      
      // Policy & KPI initial state
      kpi: {
        replans_count: 0,
        interventions_avoided: 0,
        mttr_ms_avg: 0,
      },
      policy: {
        selfHealEnabled: true,
        defaultMinBatteryPct: 0.2,
        defaultBlockedSeconds: 10,
      },
      faultInjected: {},
      missionPlans: {},

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
      
      // Policy & KPI Actions
      setMissionPlan: (mission_id, plan) =>
        set(
          (state) => ({
            missionPlans: { ...state.missionPlans, [mission_id]: plan }
          }),
          false,
          'setMissionPlan'
        ),
      
      setPolicy: (p) =>
        set(
          (state) => ({ policy: { ...state.policy, ...p } }),
          false,
          'setPolicy'
        ),
      
      bumpKPI: (delta) =>
        set(
          (state) => ({ kpi: { ...state.kpi, ...delta } }),
          false,
          'bumpKPI'
        ),
      
      setFault: (robotId, patch) =>
        set(
          (state) => ({
            faultInjected: { ...state.faultInjected, [robotId]: patch }
          }),
          false,
          'setFault'
        ),
      
      pushEvent: (event) =>
        set(
          (state) => ({
            events: [...state.events.slice(-99), {
              id: `event-${Date.now()}`,
              mission_id: null,
              robot_id: null,
              type: 'system',
              payload: event.payload || {},
              ts: new Date(event.ts).toISOString(),
            }]
          }),
          false,
          'pushEvent'
        ),
    }),
    { name: 'nodeai-store' }
  )
);