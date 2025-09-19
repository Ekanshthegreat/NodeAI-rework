import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Site management helpers
export const upsertSite = async (site: {
  id: string;
  name: string;
  map_url?: string;
  origin?: { x: number; y: number };
  scale_m_per_px?: number;
}) => {
  const { data, error } = await supabase
    .from('sites')
    .upsert(site, { onConflict: 'id' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const uploadMapImage = async (file: File, siteId: string): Promise<string> => {
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