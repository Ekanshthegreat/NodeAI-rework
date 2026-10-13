import { create } from 'zustand';
import {
  createDemoState,
  submitMission,
  tickFleet,
  setMissionPaused,
  cancelMission,
  injectFault,
  clearFault,
  type FleetState,
  type Fault,
} from '../simulation/engine';
import { decodeSnapshot, STORAGE_KEY } from '../simulation/persistence';
import { useAppStore } from './useAppStore';
import { useSceneStore } from './useSceneStore';

function load(): { fleet: FleetState; storageWarning: string | null } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return { fleet: saved ? decodeSnapshot(saved) : createDemoState(), storageWarning: null };
  } catch {
    return {
      fleet: createDemoState(),
      storageWarning:
        'Saved state could not be loaded. A fresh local fleet is available; reset the demo to replace it.',
    };
  }
}
function synchronize(fleet: FleetState): void {
  const completed = fleet.missions.filter((m) => m.status === 'completed').length;
  const recoveries = fleet.missions.reduce((count, m) => count + m.retries, 0);
  useAppStore.setState({
    sites: [fleet.site],
    robots: fleet.robots,
    missions: fleet.missions,
    currentSite: fleet.site.id,
    events: fleet.events
      .slice()
      .reverse()
      .map((e) => ({
        id: `event-${e.sequence}`,
        mission_id: e.missionId ?? undefined,
        robot_id: e.robotId ?? undefined,
        type: e.type,
        ts: new Date(fleet.baseTime + e.at).toISOString(),
        payload: {
          msg: e.message,
          level: e.type.includes('failed') ? 'ERROR' : e.type.includes('fault') ? 'WARN' : 'INFO',
        },
      })),
    kpi: {
      totalMissions: fleet.missions.length,
      activeMissions: fleet.missions.filter((m) => m.status === 'active').length,
      completedMissions: completed,
      totalRobots: fleet.robots.length,
      activeRobots: fleet.robots.filter((r) => r.status === 'ACTIVE').length,
      batteryAverage: fleet.robots.reduce((n, r) => n + r.battery, 0) / fleet.robots.length,
      uptime: fleet.elapsedMs / 1000,
      replans_count: recoveries,
      interventions_avoided: 0,
      mttr_ms_avg: 0,
    },
    adapterType: 'mock',
    isAdapterConnected: true,
  });
  useSceneStore.setState({
    missionPaths: Object.fromEntries(
      fleet.missions
        .filter((m) => m.status === 'active' || m.status === 'paused')
        .map((m) => [m.id, { waypoints: m.route, updated_at: fleet.elapsedMs }])
    ),
  });
}
interface FleetStore {
  fleet: FleetState;
  storageWarning: string | null;
  tick: () => void;
  submit: (text: string) => void;
  pauseMission: (id: string, paused: boolean) => void;
  cancel: (id: string) => void;
  fault: (robotId: string, type: Fault) => void;
  clearFault: (robotId: string) => void;
  setRunning: (running: boolean) => void;
  setSelfHealing: (enabled: boolean) => void;
  reset: () => void;
  save: () => void;
  initialize: () => void;
}
let lastSaveAt = 0;
export const useFleetStore = create<FleetStore>((set, get) => {
  const initial = load();
  let needsStorageReset = Boolean(initial.storageWarning);
  const apply = (fleet: FleetState) => {
    set({ fleet });
    synchronize(fleet);
  };
  return {
    ...initial,
    initialize: () => synchronize(get().fleet),
    tick: () => {
      const fleet = tickFleet(get().fleet);
      if (fleet !== get().fleet) apply(fleet);
      if (Date.now() - lastSaveAt > 2000) get().save();
    },
    submit: (text) => {
      apply(submitMission(get().fleet, text));
      get().save();
    },
    pauseMission: (id, paused) => {
      apply(setMissionPaused(get().fleet, id, paused));
      get().save();
    },
    cancel: (id) => {
      apply(cancelMission(get().fleet, id));
      get().save();
    },
    fault: (id, type) => {
      apply(injectFault(get().fleet, id, type));
      get().save();
    },
    clearFault: (id) => {
      apply(clearFault(get().fleet, id));
      get().save();
    },
    setRunning: (running) => {
      apply({ ...get().fleet, running });
      get().save();
    },
    setSelfHealing: (selfHealing) => {
      apply({ ...get().fleet, selfHealing });
      get().save();
    },
    reset: () => {
      needsStorageReset = false;
      apply(createDemoState());
      get().save();
    },
    save: () => {
      lastSaveAt = Date.now();
      if (needsStorageReset) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(get().fleet));
        set({ storageWarning: null });
      } catch {
        set({
          storageWarning:
            'Browser storage is unavailable or full. This session still works, but refresh may lose recent progress.',
        });
      }
    },
  };
});
