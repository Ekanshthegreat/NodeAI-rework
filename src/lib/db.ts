import { supabase } from './supabase';
import type { MissionPlan } from './schemas';

export async function saveMissionPlan(missionId: string, plan: MissionPlan): Promise<void> {
  const { error } = await supabase
    .from('mission_plans')
    .upsert({
      mission_id: missionId,
      plan_json: plan,
      validated: true,
    });

  if (error) {
    throw new Error(`Failed to save mission plan: ${error.message}`);
  }
}

export async function getMissionPlan(missionId: string): Promise<MissionPlan | null> {
  const { data, error } = await supabase
    .from('mission_plans')
    .select('plan_json')
    .eq('mission_id', missionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get mission plan: ${error.message}`);
  }

  return data?.plan_json as MissionPlan;
}

export async function recordReplan(
  missionId: string,
  reason: string,
  oldPlan: MissionPlan,
  newPlan: MissionPlan
): Promise<void> {
  const { error } = await supabase
    .from('replans')
    .insert({
      mission_id: missionId,
      reason,
      old_plan: oldPlan,
      new_plan: newPlan,
    });

  if (error) {
    throw new Error(`Failed to record replan: ${error.message}`);
  }
}

export async function getReplanHistory(missionId: string): Promise<Array<{
  id: string;
  reason: string;
  old_plan: MissionPlan;
  new_plan: MissionPlan;
  ts: string;
}>> {
  const { data, error } = await supabase
    .from('replans')
    .select('*')
    .eq('mission_id', missionId)
    .order('ts', { ascending: false });

  if (error) {
    throw new Error(`Failed to get replan history: ${error.message}`);
  }

  return data || [];
}

export async function fetchSites() {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('created_at');

  if (error) {
    throw new Error(`Failed to fetch sites: ${error.message}`);
  }

  return data || [];
}

export async function fetchRobots(siteId?: string) {
  let query = supabase
    .from('robots')
    .select('*')
    .order('id');

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch robots: ${error.message}`);
  }

  return data || [];
}

export async function fetchMissions(siteId?: string) {
  let query = supabase
    .from('missions')
    .select('*')
    .order('created_at', { ascending: false });

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch missions: ${error.message}`);
  }

  return data || [];
}

export async function seedIfEmpty(): Promise<void> {
  // Check if we already have data
  const { data: sites } = await supabase.from('sites').select('id').limit(1);
  
  if (sites && sites.length > 0) {
    return; // Already seeded
  }

  console.log('Seeding database with initial data...');

  // Insert demo site
  const { error: siteError } = await supabase
    .from('sites')
    .insert({
      id: 'HospitalA-F2',
      name: 'Hospital Alpha - Floor 2',
      map_url: '/maps/hospital-f2.png',
      origin: { x: 0, y: 0 },
      scale_m_per_px: 0.05,
    });

  if (siteError) {
    throw new Error(`Failed to seed site: ${siteError.message}`);
  }

  // Insert demo robots
  const { error: robotsError } = await supabase
    .from('robots')
    .insert([
      {
        id: 'MED-001',
        site_id: 'HospitalA-F2',
        vendor: 'rmf',
        pose: { x: 2.5, y: 1.0, theta: 0.0 },
        battery: 0.85,
        status: 'IDLE',
      },
      {
        id: 'MED-002',
        site_id: 'HospitalA-F2',
        vendor: 'vda5050',
        pose: { x: -1.5, y: 3.2, theta: 1.57 },
        battery: 0.42,
        status: 'CHARGING',
      },
      {
        id: 'MED-003',
        site_id: 'HospitalA-F2',
        vendor: 'mock',
        pose: { x: 4.0, y: -2.1, theta: -0.78 },
        battery: 0.67,
        status: 'ACTIVE',
      },
    ]);
        battery: 0.9,
        status: 'IDLE',
      },
      {
        id: 'R2',
        site_id: 'demo_site',
        vendor: 'mock',
        pose: { x: 2, y: 0, theta: 0 },
        battery: 0.9,
        status: 'IDLE',
      },
    ]);

  if (robotsError) {
    throw new Error(`Failed to seed robots: ${robotsError.message}`);
  }

  // Insert sample missions
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .insert([
      {
        site_id: 'HospitalA-F2',
        nl: 'Deliver medication from pharmacy to room 205',
        status: 'active',
      },
      {
        site_id: 'HospitalA-F2',
        nl: 'Transport lab samples from room 210 to laboratory',
        status: 'completed',
      },
      {
        site_id: 'HospitalA-F2',
        nl: 'Perform security patrol of all patient rooms',
        status: 'planning',
      },
    ])
    .select();
  if (robotsError) {
    throw new Error(`Failed to seed robots: ${robotsError.message}`);
  if (missionsError) {
    throw new Error(`Failed to seed missions: ${missionsError.message}`);
  }
  }
  console.log('Database seeded successfully:', {
    sites: 1,
    robots: 3,
    missions: missions?.length || 0
  });
}