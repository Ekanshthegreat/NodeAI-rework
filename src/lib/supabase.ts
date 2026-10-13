import { createClient } from '@supabase/supabase-js';
import type { Site, Robot, Mission, MissionPlan } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'maps';

// Check if we're using mock client (when Supabase env vars are missing)
export const isUsingMockClient = !supabaseUrl || !supabaseAnonKey;

// Create Supabase client or mock
export const supabase = isUsingMockClient
  ? createMockClient()
  : createClient(supabaseUrl, supabaseAnonKey);

function createMockClient() {
  console.warn('Using mock Supabase client - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for real backend');
  
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: { message: 'Mock client' } }),
      signUp: () => Promise.resolve({ data: { user: null }, error: { message: 'Mock client' } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      single: () => ({ data: null, error: null }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: () => Promise.resolve({ data: null, error: { message: 'Mock storage' } }),
        upload: () => Promise.resolve({ data: null, error: { message: 'Mock storage' } }),
        getPublicUrl: () => ({ data: { publicUrl: null } }),
      }),
    },
  } as any;
}

// Database operations
export async function loadSites(): Promise<Site[]> {
  if (isUsingMockClient) {
    return [
      {
        id: 'HospitalA-F2',
        name: 'Hospital Alpha - Floor 2',
        map_url: 'hospital.png',
        origin: { x: 0, y: 0 },
        scale_m_per_px: 0.05,
        obstacles: [
          { id: 'obs1', rect: { x: 3, y: 1, w: 2, h: 1 } },
          { id: 'obs2', rect: { x: -2, y: 4, w: 1.5, h: 2 } },
        ],
        noGo: [
          { id: 'nogo1', poly: [{ x: 1, y: -3 }, { x: 3, y: -3 }, { x: 2, y: -1 }] },
        ],
      },
    ];
  }

  const { data, error } = await supabase.from('sites').select('*');
  if (error) throw error;
  return data || [];
}

export async function loadRobots(): Promise<Robot[]> {
  if (isUsingMockClient) {
    return [
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
        capabilities: ['delivery', 'dock', 'inspect'],
        updated_at: new Date().toISOString(),
      },
    ];
  }

  const { data, error } = await supabase.from('robots').select('*');
  if (error) throw error;
  return data || [];
}

export async function loadMissions(): Promise<Mission[]> {
  if (isUsingMockClient) {
    return [
      {
        id: 'mission-001',
        site_id: 'HospitalA-F2',
        nl: 'Deliver medication from pharmacy to room 205',
        status: 'active',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'mission-002',
        site_id: 'HospitalA-F2',
        nl: 'Transport lab samples from room 210 to laboratory',
        status: 'completed',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mission-003',
        site_id: 'HospitalA-F2',
        nl: 'Perform security patrol of all patient rooms',
        status: 'planning',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];
  }

  const { data, error } = await supabase.from('missions').select('*');
  if (error) throw error;
  return data || [];
}

export async function saveMissionPlan(missionId: string, plan: MissionPlan): Promise<void> {
  if (isUsingMockClient) {
    console.log('Mock: Saving mission plan for', missionId);
    return;
  }

  const { error } = await supabase
    .from('mission_plans')
    .upsert({
      mission_id: missionId,
      plan_json: plan,
      validated: true,
    });

  if (error) throw error;
}

export async function upsertSite(site: Omit<Site, 'obstacles' | 'noGo'>): Promise<Site> {
  if (isUsingMockClient) {
    return {
      ...site,
      obstacles: [],
      noGo: [],
    };
  }

  const { data, error } = await supabase
    .from('sites')
    .upsert(site)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadMapImage(file: File, siteId: string): Promise<string> {
  if (isUsingMockClient) {
    throw new Error('Map upload not available in demo mode');
  }

  const fileName = `${siteId}-${Date.now()}.${file.name.split('.').pop()}`;
  
  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(storageBucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function getSignedMapUrl(path: string): Promise<string | null> {
  try {
    // If it's already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // If using mock client, return null to trigger fallback
    if (isUsingMockClient) {
      return null;
    }

    // Create signed URL for Supabase storage path
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.warn('Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.warn('Error resolving map URL:', error);
    return null;
  }
}