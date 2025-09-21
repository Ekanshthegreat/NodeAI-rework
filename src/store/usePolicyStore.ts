import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { MissionPlan } from '../lib/schemas';

interface PolicyStore {
  // Policy state
  selfHealingEnabled: boolean;
  missionPlans: Map<string, MissionPlan>;
  replanHistory: Map<string, number>; // mission_id -> replan count
  
  // Fault injection state
  injectedFaults: Map<string, { type: 'BLOCKED' | 'LOW_BATTERY'; until: number }>;
  
  // Actions
  setSelfHealingEnabled: (enabled: boolean) => void;
  setMissionPlan: (missionId: string, plan: MissionPlan) => void;
  getMissionPlan: (missionId: string) => MissionPlan | null;
  incrementReplanCount: (missionId: string) => void;
  getReplanCount: (missionId: string) => number;
  
  // Fault injection
  injectFault: (robotId: string, type: 'BLOCKED' | 'LOW_BATTERY', durationMs: number) => void;
  clearFault: (robotId: string) => void;
  getFault: (robotId: string) => { type: 'BLOCKED' | 'LOW_BATTERY'; until: number } | null;
  clearExpiredFaults: () => void;
}

export const usePolicyStore = create<PolicyStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      selfHealingEnabled: true,
      missionPlans: new Map(),
      replanHistory: new Map(),
      injectedFaults: new Map(),

      // Actions
      setSelfHealingEnabled: (enabled) =>
        set({ selfHealingEnabled: enabled }, false, 'setSelfHealingEnabled'),

      setMissionPlan: (missionId, plan) =>
        set(
          (state) => {
            const newPlans = new Map(state.missionPlans);
            newPlans.set(missionId, plan);
            return { missionPlans: newPlans };
          },
          false,
          'setMissionPlan'
        ),

      getMissionPlan: (missionId) => {
        const state = get();
        return state.missionPlans.get(missionId) || null;
      },

      incrementReplanCount: (missionId) =>
        set(
          (state) => {
            const newHistory = new Map(state.replanHistory);
            const current = newHistory.get(missionId) || 0;
            newHistory.set(missionId, current + 1);
            return { replanHistory: newHistory };
          },
          false,
          'incrementReplanCount'
        ),

      getReplanCount: (missionId) => {
        const state = get();
        return state.replanHistory.get(missionId) || 0;
      },

      // Fault injection
      injectFault: (robotId, type, durationMs) =>
        set(
          (state) => {
            const newFaults = new Map(state.injectedFaults);
            newFaults.set(robotId, { type, until: Date.now() + durationMs });
            return { injectedFaults: newFaults };
          },
          false,
          'injectFault'
        ),

      clearFault: (robotId) =>
        set(
          (state) => {
            const newFaults = new Map(state.injectedFaults);
            newFaults.delete(robotId);
            return { injectedFaults: newFaults };
          },
          false,
          'clearFault'
        ),

      getFault: (robotId) => {
        const state = get();
        return state.injectedFaults.get(robotId) || null;
      },

      clearExpiredFaults: () =>
        set(
          (state) => {
            const now = Date.now();
            const newFaults = new Map();
            
            for (const [robotId, fault] of state.injectedFaults) {
              if (fault.until > now) {
                newFaults.set(robotId, fault);
              }
            }
            
            return { injectedFaults: newFaults };
          },
          false,
          'clearExpiredFaults'
        ),
    }),
    { name: 'policy-store' }
  )
);