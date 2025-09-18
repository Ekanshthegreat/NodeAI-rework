import React, { useRef, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import type { Site } from '../../types';

interface MapLayerProps {
  site: Site;
  visible?: boolean;
}

const MapLayer: React.FC<MapLayerProps> = ({ site, visible = true }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load the map texture
  const texture = useLoader(TextureLoader, site.map_url);
  
  // Calculate plane dimensions based on scale
  const planeDimensions = useMemo(() => {
    // Assume a standard map size if texture dimensions aren't available
    const mapWidth = texture.image?.width || 1024;
    const mapHeight = texture.image?.height || 1024;
    
    // Convert pixels to meters using the site's scale
    const worldWidth = mapWidth * site.scale_m_per_px;
    const worldHeight = mapHeight * site.scale_m_per_px;
    
    return [worldWidth, worldHeight];
  }, [texture, site.scale_m_per_px]);
  
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