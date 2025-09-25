import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import type { Site } from '../../types';
import { getSignedMapUrl } from '../../lib/supabase';
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
    toast.success('[DEMO] Hospital demo with mission paths loaded successfully');
  // Resolve map URL
  useEffect(() => {
    const resolveMapUrl = async () => {
      try {
        if (site.map_url) {
          const resolved = await getSignedMapUrl(site.map_url);
          setMapUrlResolved(resolved);
          
          if (resolved) {
            pushEvent({
              ts: Date.now(),
              level: 'INFO',
              msg: `[DEMO] Map loaded: ${site.name}`,
              payload: { site_id: site.id, map_url: site.map_url, resolved_url: resolved }
            });
          } else {
            pushEvent({
              ts: Date.now(),
              level: 'WARN',
              msg: `[DEMO] Map load failed, using fallback grid: ${site.name}`,
              payload: { site_id: site.id, map_url: site.map_url }
            });
          }
        }
      } catch (error) {
        console.warn('Failed to resolve map URL:', error);
        setMapUrlResolved(null);
        pushEvent({
          ts: Date.now(),
          level: 'WARN',
          msg: `[DEMO] Map resolution error: ${(error as Error).message}`,
          payload: { error, site_id: site.id, map_url: site.map_url }
        });
      }
    };
    
    resolveMapUrl();
  }, [site.map_url, site.id, site.name, pushEvent]);
  
  // Create texture
  const texture = useMemo(() => {
    if (!mapUrlResolved) {
      // Create fallback grid texture
      const canvas = document.createElement('canvas');
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
        ctx.fillText('Ward A', 350, 345);
        ctx.fillText('Lab', 430, 135);
        ctx.fillText(site.name, 256, 50);
      }
      
      const fallbackTexture = new THREE.CanvasTexture(canvas);
      fallbackTexture.wrapS = THREE.RepeatWrapping;
      fallbackTexture.wrapT = THREE.RepeatWrapping;
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
    </group>
  );
};

export default MapLayer;