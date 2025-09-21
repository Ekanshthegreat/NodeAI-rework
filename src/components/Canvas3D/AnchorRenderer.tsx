import React from 'react';
import { Text } from '@react-three/drei';
import { getAllAnchors } from '../../lib/anchors';

const AnchorRenderer: React.FC = () => {
  const anchors = getAllAnchors();
  
  return (
    <group>
      {anchors.map((anchor) => (
        <group key={anchor.name} position={[anchor.position.x, 0, anchor.position.y]}>
          {/* Anchor marker */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.05]} />
            <meshStandardMaterial
              color="#8b5cf6"
              emissive="#8b5cf6"
              emissiveIntensity={0.3}
            />
          </mesh>
          
          {/* Anchor label */}
          <Text
            position={[0, 0.4, 0]}
            fontSize={0.12}
            color="#a855f7"
            anchorX="center"
            anchorY="middle"
          >
            {anchor.name}
          </Text>
        </group>
      ))}
    </group>
  );
};

export default AnchorRenderer;