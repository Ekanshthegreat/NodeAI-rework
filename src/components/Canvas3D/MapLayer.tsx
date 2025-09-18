import React, { useRef, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import type { Site } from '../../types';

interface MapLayerProps {
  site: Site;
  visible?: boolean;
}

const MapLayer: React.FC<MapLayerProps> = ({ site, visible = true }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load the map texture with error handling
  const texture = useMemo(() => {
    try {
      // Create a fallback texture if the image fails to load
      const loader = new TextureLoader();
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a simple grid pattern as fallback
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#ccc';
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
        ctx.fillStyle = '#666';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(site.name, 256, 256);
      }
      
      const fallbackTexture = new THREE.CanvasTexture(canvas);
      
      // Try to load the actual texture, fall back to generated one
      const actualTexture = loader.load(
        site.map_url,
        undefined, // onLoad
        undefined, // onProgress
        (error) => {
          console.warn(`Failed to load map texture: ${site.map_url}`, error);
        }
      );
      
      return actualTexture || fallbackTexture;
    } catch (error) {
      console.warn('Error creating map texture:', error);
      // Return a basic colored texture as last resort
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, 256, 256);
      }
      return new THREE.CanvasTexture(canvas);
    }
  }, [site.map_url, site.name]);
  
  // Calculate plane dimensions based on scale
  const planeDimensions = useMemo(() => {
    // Use standard map size for consistent scaling
    const mapWidth = 1024;
    const mapHeight = 1024;
    
    // Convert pixels to meters using the site's scale
    const worldWidth = mapWidth * site.scale_m_per_px;
    const worldHeight = mapHeight * site.scale_m_per_px;
    
    return [worldWidth, worldHeight];
  }, [site.scale_m_per_px]);
  
  if (!visible) return null;
  
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