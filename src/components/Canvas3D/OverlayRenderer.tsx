import React from 'react';
import { Text } from '@react-three/drei';
import { useSceneStore } from '../../store/useSceneStore';

const OverlayRenderer: React.FC = () => {
  const { overlays } = useSceneStore();
  
  const getOverlayGeometry = (type: string) => {
    switch (type) {
      case 'waypoint':
        return <cylinderGeometry args={[0.2, 0.2, 0.1]} />;
      case 'zone':
        return <boxGeometry args={[1, 0.1, 1]} />;
      case 'marker':
      default:
        return <sphereGeometry args={[0.15]} />;
    }
  };
  
  return (
    <group>
      {overlays
        .filter(overlay => overlay.visible)
        .map((overlay) => (
          <group
            key={overlay.id}
            position={[overlay.position.x, overlay.position.z || 0.1, overlay.position.y]}
          >
            {/* Overlay geometry */}
            <mesh>
              {getOverlayGeometry(overlay.type)}
              <meshStandardMaterial
                color={overlay.color}
                transparent
                opacity={0.7}
                emissive={overlay.color}
                emissiveIntensity={0.2}
              />
            </mesh>
            
            {/* Label */}
            <Text
              position={[0, 0.5, 0]}
              fontSize={0.2}
              color={overlay.color}
              anchorX="center"
              anchorY="middle"
              font="/fonts/inter-regular.woff"
            >
              {overlay.label}
            </Text>
          </group>
        ))}
    </group>
  );
};

export default OverlayRenderer;