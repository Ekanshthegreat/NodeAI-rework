import { supabase } from './supabase';
import type { MissionPlan } from '../types';

export async function saveMissionPlan(missionId: string, plan: MissionPlan): Promise<void> {
  const { error } = await supabase
    .from('mission_plans')
    .upsert({
      mission_id: missionId,
      plan_json: plan,
      validated: true,
    });

  if (error) throw error;
}

export async function seedDemoData(): Promise<void> {
  // This function seeds demo data when no data exists
  // Implementation depends on whether we're using mock or real Supabase
  console.log('Demo data seeding handled by individual load functions');
}