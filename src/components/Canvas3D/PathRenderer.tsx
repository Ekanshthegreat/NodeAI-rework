import React from 'react';
import { Line } from '@react-three/drei';
import { useSceneStore } from '../../store/useSceneStore';

const PathRenderer: React.FC = () => {
  const { paths } = useSceneStore();
  
  return (
    <group>
      {paths
        .filter(path => path.visible)
        .map((path) => {
          const points = path.points.map(p => [p.x, p.z || 0.1, p.y]);
          
          return (
            <group key={path.id}>
              {/* Path line */}
              <Line
                points={points}
                color={path.color}
                lineWidth={2}
                transparent
                opacity={0.8}
              />
              
              {/* Path markers */}
              {path.points.map((point, index) => (
                <mesh
                  key={`${path.id}-marker-${index}`}
                  position={[point.x, 0.1, point.y]}
                >
                  <sphereGeometry args={[0.05]} />
                  <meshBasicMaterial color={path.color} />
                </mesh>
              ))}
            </group>
          );
        })}
    </group>
  );
};

export default PathRenderer;