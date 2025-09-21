import React, { useRef, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { TextureLoader, RepeatWrapping } from 'three';
import * as THREE from 'three';
import type { Site } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface MapLayerProps {
  site: Site;
  visible?: boolean;
}

const MapLayer: React.FC<MapLayerProps> = ({ site, visible = true }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { sites } = useAppStore();
  
  // Get the latest site data from the store
  const currentSiteData = sites.find(s => s.id === site.id) || site;
  
  // Load the map texture with error handling
  const texture = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a simple grid pattern as fallback
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        
        // Draw grid lines
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
        
        // Add site name
        ctx.fillStyle = '#94a3b8';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(currentSiteData.name, 256, 256);
      }
      
      const fallbackTexture = new THREE.CanvasTexture(canvas);
      
      // For now, just use the fallback texture
      // TODO: Load actual map images when available
      return fallbackTexture;
    } catch (error) {
      console.warn('Error creating map texture:', error);
      // Return a basic colored texture as last resort
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 256, 256);
      }
      return new THREE.CanvasTexture(canvas);
    }
  }, [currentSiteData.map_url, currentSiteData.name]);
  
  // Calculate plane dimensions based on scale
  const planeDimensions = useMemo(() => {
    // Use standard map size for consistent scaling
    const mapWidth = 1024;
    const mapHeight = 1024;
    
    // Convert pixels to meters using the site's scale
    const worldWidth = mapWidth * currentSiteData.scale_m_per_px;
    const worldHeight = mapHeight * currentSiteData.scale_m_per_px;
    
    return [worldWidth, worldHeight];
  }, [currentSiteData.scale_m_per_px]);
  
  if (!visible) return null;
  
  return (
    <group position={[currentSiteData.origin.x, 0, currentSiteData.origin.y]}>
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
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>
      
      {/* Optional: Add a subtle border */}
      <lineSegments position={[0, 0.02, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(...planeDimensions)]} />
        <lineBasicMaterial color="#4a5568" opacity={0.5} transparent />
      </lineSegments>
    </group>
  );
};

export default MapLayer;