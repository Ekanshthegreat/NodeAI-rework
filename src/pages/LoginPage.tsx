import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import type { Site } from '../../types';
import { getSignedMapUrl } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';

interface MapLayerProps {
  site: Site;
  visible?: boolean;
}

const MapLayer: React.FC<MapLayerProps> = ({ site, visible = true }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [mapUrlResolved, setMapUrlResolved] = useState<string | null>(null);
  const [textureLoaded, setTextureLoaded] = useState(false);
  const { pushEvent } = useAppStore();
  
  // Resolve map URL
  useEffect(() => {
    const resolveMapUrl = async () => {
      try {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Dark hospital floor
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 512, 512);
        
        // Grid lines
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 512; i += 32) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 512);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(512, i);
          ctx.stroke();
        }
        
        // Hospital areas (simplified)
        ctx.fillStyle = '#334155';
        ctx.fillRect(100, 100, 80, 60); // Pharmacy
        ctx.fillRect(300, 300, 100, 80); // Ward A
        ctx.fillRect(400, 100, 60, 60); // Lab
        
        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Pharmacy', 140, 135);
      if (signInData?.user) {
        setUser(signInData.user);
        toast.success(email === 'demo@nodeai.com' ? 'Demo account logged in successfully' : 'Logged in successfully');
      }
      
      const fallbackTexture = new THREE.CanvasTexture(canvas);
      fallbackTexture.wrapS = THREE.RepeatWrapping;
      
      // Provide helpful error messages
      if (error.message?.includes('Invalid login credentials')) {
        if (email === 'demo@nodeai.com') {
          toast.error('Demo account login failed. Make sure password is: demo123');
        } else {
          toast.error('Invalid email or password');
        }
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Please check your email and confirm your account');
      } else {
        toast.error(error.message || 'Login failed');
      }
      setTextureLoaded(true);
      return fallbackTexture;
    }
    
    // Try to load actual map image
    const loader = new TextureLoader();
    const mapTexture = loader.load(
      mapUrlResolved,
      () => setTextureLoaded(true),
      undefined,
      (error) => {
        console.warn('Failed to load map texture:', error);
        setTextureLoaded(true);
      }
    );
    
    mapTexture.wrapS = THREE.ClampToEdgeWrapping;
    mapTexture.wrapT = THREE.ClampToEdgeWrapping;
    return mapTexture;
  }, [mapUrlResolved, site.name]);
  
  // Calculate plane dimensions based on scale
  const planeDimensions = useMemo(() => {
    // Standard map size for consistent scaling
    const mapWidth = 1024;
    const mapHeight = 1024;
    
    // Convert pixels to meters using the site's scale
    const worldWidth = mapWidth * site.scale_m_per_px;
    const worldHeight = mapHeight * site.scale_m_per_px;
    
    return [worldWidth, worldHeight];
  }, [site.scale_m_per_px]);
  
  if (!visible || !textureLoaded) return null;
  
  return (
    <group position={[site.origin.x, 0, site.origin.y]}>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat on XZ plane
        position={[0, 0.01, 0]} // Slightly above ground to prevent z-fighting
        receiveShadow
      >
        <planeGeometry args={planeDimensions} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
      
      {/* Optional: Add a subtle border */}
      <lineSegments position={[0, 0.02, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(...planeDimensions)]} />
        <lineBasicMaterial color="#4a5568" opacity={0.3} transparent />
      </lineSegments>
      if (signInError) {
        // If login fails and it's a demo account, try to create it
        if (email === 'demo@nodeai.com' && signInError.message.includes('Invalid login credentials')) {
          console.log('Demo account not found, creating...');
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: undefined, // Disable email confirmation
            },
          });

          if (signUpError) {
            if (signUpError.message.includes('already registered')) {
              // Account exists but password is wrong
              toast.error('Demo account exists but password is incorrect. Try: demo123');
            } else {
              throw signUpError;
            }
          } else if (signUpData.user) {
            // Account created successfully
            setUser(signUpData.user);
            toast.success('Demo account created and logged in successfully');
            navigate('/app');
            return;
          }
        } else {
          // Regular login error
          throw signInError;
        }
};

export default MapLayer;