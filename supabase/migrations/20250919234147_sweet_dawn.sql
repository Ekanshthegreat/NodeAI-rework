/*
  # Create maps storage bucket

  1. Storage
    - Create 'maps' bucket for storing floor plan images
    - Enable public access for map images
    - Set up RLS policies for authenticated users

  2. Security
    - Allow authenticated users to upload maps
    - Allow public read access to map images
    - Restrict file types to images only
*/

-- Create the maps storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maps',
  'maps',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload maps
CREATE POLICY "Authenticated users can upload maps"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maps');

-- Allow authenticated users to update their maps
CREATE POLICY "Authenticated users can update maps"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'maps');

-- Allow authenticated users to delete maps
CREATE POLICY "Authenticated users can delete maps"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'maps');

-- Allow public read access to maps
CREATE POLICY "Public can view maps"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'maps');