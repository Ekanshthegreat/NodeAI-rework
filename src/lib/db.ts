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

  // Insert demo site
  const { error: siteError } = await supabase
    .from('sites')
    .insert({
      id: 'demo_site',
      name: 'Demo Hospital',
      map_url: null,
      origin: { x: 0, y: 0 },
      scale_m_per_px: 0.02,
    });

  if (siteError) {
    throw new Error(`Failed to seed site: ${siteError.message}`);
  }

  // Insert demo robots
  const { error: robotsError } = await supabase
    .from('robots')
    .insert([
      {
        id: 'R1',
        site_id: 'demo_site',
        vendor: 'mock',
        pose: { x: 0, y: 0, theta: 0 },
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
}