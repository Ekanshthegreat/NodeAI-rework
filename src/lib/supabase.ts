import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client if env vars are missing
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: { user: { id: 'mock', email: 'demo@nodeai.com' } }, error: null }),
    signUp: () => Promise.resolve({ data: { user: { id: 'mock', email: 'demo@nodeai.com' } }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
    upsert: () => ({ data: [], error: null }),
    eq: () => ({ data: [], error: null }),
    order: () => ({ data: [], error: null }),
    limit: () => ({ data: [], error: null }),
    single: () => ({ data: null, error: null }),
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
});

export const supabase = (!supabaseUrl || !supabaseAnonKey) 
  ? createMockClient() as any
  : createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

// Check if we're using mock client
export const isUsingMockClient = !supabaseUrl || !supabaseAnonKey;

if (isUsingMockClient) {
  console.warn('Using mock Supabase client - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for real data');
}

// Site management helpers
export const upsertSite = async (site: {
  id: string;
  name: string;
  map_url?: string;
  origin?: { x: number; y: number };
  scale_m_per_px?: number;
}) => {
  if (isUsingMockClient) {
    return { ...site, created_at: new Date().toISOString() };
  }
  
  const { data, error } = await supabase
    .from('sites')
    .upsert(site, { onConflict: 'id' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const uploadMapImage = async (file: File, siteId: string): Promise<string> => {
  if (isUsingMockClient) {
    return '/maps/mock-hospital.png';
  }
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${siteId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('maps')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('maps')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

export default supabase;