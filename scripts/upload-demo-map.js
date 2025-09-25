#!/usr/bin/env node

/**
 * Upload demo hospital map to Supabase Storage
 * Usage: npm run upload-map
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.VITE_SUPABASE_STORAGE_BUCKET || 'maps';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadDemoMap() {
  console.log('🏥 NodeAI Demo Map Upload');
  console.log('========================');
  
  // Create a simple hospital map as PNG data
  const mapData = createHospitalMapPNG();
  const fileName = 'hospital.png';
  
  try {
    console.log(`📤 Uploading ${fileName} to bucket "${bucket}"...`);
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, mapData, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Upload successful!');
    console.log(`   Path: ${data.path}`);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    console.log(`🌐 Public URL: ${publicUrl}`);
    
    // Test signed URL creation
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 3600);
    
    if (signedError) {
      console.warn('⚠️  Warning: Could not create signed URL:', signedError.message);
    } else {
      console.log(`🔐 Signed URL: ${signedData.signedUrl}`);
    }
    
    console.log('');
    console.log('🎉 Demo map upload complete!');
    console.log('   You can now use "hospital.png" as the map_url in your site data.');
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    
    if (error.message.includes('Bucket not found')) {
      console.error('');
      console.error('💡 Tip: Create the "maps" bucket in your Supabase dashboard:');
      console.error('   1. Go to Storage in your Supabase dashboard');
      console.error('   2. Create a new bucket named "maps"');
      console.error('   3. Set it to public if you want direct access');
    }
    
    process.exit(1);
  }
}

function createHospitalMapPNG() {
  // Create a simple PNG data buffer for a hospital floor plan
  // This is a minimal PNG - in a real app you'd load from assets/maps/hospital.png
  
  // For now, return a minimal 1x1 PNG as placeholder
  // In production, you would:
  // const mapPath = join(__dirname, '../assets/maps/hospital.png');
  // return readFileSync(mapPath);
  
  // Minimal 1x1 transparent PNG (43 bytes)
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
}

// Run the upload
uploadDemoMap().catch(console.error);