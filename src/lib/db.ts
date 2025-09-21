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
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('created_at');

    if (error) {
      throw new Error(`Failed to fetch sites: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.warn('Using mock sites data');
    return getMockSites();
  }
}

export async function fetchRobots(siteId?: string) {
  try {
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
  } catch (error) {
    console.warn('Using mock robots data');
    return getMockRobots(siteId);
  }
}

export async function fetchMissions(siteId?: string) {
  try {
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
  } catch (error) {
    console.warn('Using mock missions data');
    return getMockMissions(siteId);
  }
}

// Mock data fallbacks
function getMockSites() {
  return [
    {
      id: 'HospitalA-F2',
      name: 'Hospital Alpha - Floor 2',
      map_url: '/maps/hospital-f2.png',
      origin: { x: 0, y: 0 },
      scale_m_per_px: 0.05,
      created_at: new Date().toISOString(),
    }
  ];
}

function getMockRobots(siteId?: string) {
  const robots = [
    {
      id: 'MED-001',
      site_id: 'HospitalA-F2',
      vendor: 'rmf',
      pose: { x: 2.5, y: 1.0, theta: 0.0 },
      battery: 0.85,
      status: 'IDLE',
      capabilities: ['delivery', 'dock'],
      updated_at: new Date().toISOString(),
    },
    {
      id: 'MED-002',
      site_id: 'HospitalA-F2',
      vendor: 'vda5050',
      pose: { x: -1.5, y: 3.2, theta: 1.57 },
      battery: 0.42,
      status: 'CHARGING',
      capabilities: ['delivery', 'dock'],
      updated_at: new Date().toISOString(),
    },
    {
      id: 'MED-003',
      site_id: 'HospitalA-F2',
      vendor: 'mock',
      pose: { x: 4.0, y: -2.1, theta: -0.78 },
      battery: 0.67,
      status: 'ACTIVE',
      capabilities: ['delivery', 'dock', 'elevator'],
      updated_at: new Date().toISOString(),
    },
  ];

  return siteId ? robots.filter(r => r.site_id === siteId) : robots;
}

function getMockMissions(siteId?: string) {
  const missions = [
    {
      id: 'mission-001',
      site_id: 'HospitalA-F2',
      nl: 'Deliver medication from pharmacy to room 205',
      status: 'active',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'mission-002',
      site_id: 'HospitalA-F2',
      nl: 'Transport lab samples from room 210 to laboratory',
      status: 'completed',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'mission-003',
      site_id: 'HospitalA-F2',
      nl: 'Perform security patrol of all patient rooms',
      status: 'planning',
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ];

  return siteId ? missions.filter(m => m.site_id === siteId) : missions;
}

export async function seedIfEmpty(): Promise<void> {
  try {
    // Check if we already have data
    const { data: sites } = await supabase.from('sites').select('id').limit(1);
    
    if (sites && sites.length > 0) {
      return; // Already seeded
    }
  } catch (error) {
    console.warn('Supabase not available, using mock data');
    return; // Skip seeding if Supabase is not available
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

  if (missionsError) {
    throw new Error(`Failed to seed missions: ${missionsError.message}`);
  }

  console.log('Database seeded successfully:', {
    sites: 1,
    robots: 3,
    missions: missions?.length || 0
  });
}