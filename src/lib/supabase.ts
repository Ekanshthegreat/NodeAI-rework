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

// Map URL resolution
export const getSignedMapUrl = async (mapUrl: string): Promise<string | null> => {
  if (isUsingMockClient) {
    // Return a mock hospital map URL
    return createMockHospitalMap();
  }
  
  // If it's already a full URL, return as-is
  if (mapUrl.startsWith('http://') || mapUrl.startsWith('https://')) {
    return mapUrl;
  }
  
  // If it's a Supabase storage path, create signed URL
  try {
    const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'maps';
    const { data, error } = await supabase.storage
      .from('maps')
      .createSignedUrl(mapUrl, 3600); // 1 hour expiry
    
    if (error) {
      console.warn('Failed to create signed URL:', error);
      // Log to event system if available
      if (typeof window !== 'undefined' && (window as any).nodeai_eventLog) {
        (window as any).nodeai_eventLog({
          level: 'WARN',
          msg: `Map load failed: ${error.message}`,
          payload: { error, mapUrl }
        });
      }
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.warn('Failed to get signed URL for map:', error);
    // Log to event system if available
    if (typeof window !== 'undefined' && (window as any).nodeai_eventLog) {
      (window as any).nodeai_eventLog({
        level: 'WARN',
        msg: `Map storage error: ${(error as Error).message}`,
        payload: { error, mapUrl }
      });
    }
    return null;
  }
};

// Create a mock hospital map as data URL for demo mode
function createMockHospitalMap(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Hospital floor background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Grid lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 1024; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }
  
  // Hospital rooms and areas
  const rooms = [
    { x: 200, y: 200, w: 150, h: 100, label: 'Pharmacy', color: '#dbeafe' },
    { x: 600, y: 600, w: 200, h: 150, label: 'Ward A', color: '#dcfce7' },
    { x: 750, y: 200, w: 120, h: 120, label: 'Laboratory', color: '#fef3c7' },
    { x: 100, y: 500, w: 100, h: 80, label: 'Room 205', color: '#f3e8ff' },
    { x: 300, y: 500, w: 100, h: 80, label: 'Room 210', color: '#f3e8ff' },
    { x: 100, y: 800, w: 150, h: 100, label: 'Charging', color: '#fecaca' },
  ];
  
  rooms.forEach(room => {
    // Room background
    ctx.fillStyle = room.color;
    ctx.fillRect(room.x, room.y, room.w, room.h);
    
    // Room border
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(room.x, room.y, room.w, room.h);
    
    // Room label
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(room.label, room.x + room.w/2, room.y + room.h/2 + 6);
  });
  
  // Hospital title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Hospital Alpha - Floor 2', 512, 50);
  
  return canvas.toDataURL('image/png');
};

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