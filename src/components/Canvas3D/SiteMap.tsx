import React from 'react';
import type { Site } from '../../types';

interface SiteMapProps {
  site: Site;
}

const SiteMap: React.FC<SiteMapProps> = ({ site }) => {
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[20, 0.1, 20]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      
      {/* Walls (simplified warehouse layout) */}
      <group>
        {/* Outer walls */}
        <mesh position={[0, 1, 10]}>
          <boxGeometry args={[20, 2, 0.2]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0, 1, -10]}>
          <boxGeometry args={[20, 2, 0.2]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[10, 1, 0]}>
          <boxGeometry args={[0.2, 2, 20]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[-10, 1, 0]}>
          <boxGeometry args={[0.2, 2, 20]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        
        {/* Interior structures */}
        <mesh position={[3, 0.5, 0]}>
          <boxGeometry args={[2, 1, 8]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
        <mesh position={[-3, 0.5, 3]}>
          <boxGeometry args={[2, 1, 4]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
      </group>
    </group>
  );
};

export default SiteMap;