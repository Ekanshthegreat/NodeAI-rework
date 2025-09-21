import React from 'react';
import { Line, Text } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { useSceneStore } from '../../store/useSceneStore';

const PathRenderer: React.FC = () => {
  const { missions, selectedMission } = useAppStore();
  const { missionPaths } = useSceneStore();
  
  return (
    <group>
      {missions
        .filter(mission => mission.status === 'active' || mission.status === 'planning')
        .map((mission) => {
          const missionPath = missionPaths[mission.id];
          if (!missionPath || !missionPath.waypoints.length) return null;
          
          const isSelected = selectedMission === mission.id;
          const points = missionPath.waypoints.map(p => [p.x, 0.2, p.y]);
          const color = isSelected ? '#3b82f6' : '#10b981';
          const opacity = isSelected ? 1.0 : 0.6;
          
          return (
            <group key={mission.id}>
              {/* Path line */}
              <Line
                points={points}
                color={color}
                lineWidth={isSelected ? 4 : 2}
                transparent
                opacity={opacity}
              />
              
              {/* Waypoint markers */}
              {missionPath.waypoints.map((waypoint, index) => (
                <group key={`${mission.id}-waypoint-${index}`}>
                  {/* Waypoint cylinder */}
                  <mesh position={[waypoint.x, 0.1, waypoint.y]}>
                    <cylinderGeometry args={[0.1, 0.1, 0.2]} />
                    <meshStandardMaterial
                      color={color}
                      emissive={color}
                      emissiveIntensity={0.3}
                      transparent
                      opacity={opacity}
                    />
                  </mesh>
                  
                  {/* Direction arrow */}
                  <mesh
                    position={[
                      waypoint.x + Math.cos(waypoint.theta) * 0.3,
                      0.2,
                      waypoint.y + Math.sin(waypoint.theta) * 0.3
                    ]}
                    rotation={[0, waypoint.theta, 0]}
                  >
                    <coneGeometry args={[0.05, 0.15]} />
                    <meshStandardMaterial
                      color={color}
                      transparent
                      opacity={opacity}
                    />
                  </mesh>
                  
                  {/* Waypoint labels for start/end */}
                  {(index === 0 || index === missionPath.waypoints.length - 1) && (
                    <Text
                      position={[waypoint.x, 0.5, waypoint.y]}
                      fontSize={0.15}
                      color={color}
                      anchorX="center"
                      anchorY="middle"
                    >
                      {index === 0 ? 'START' : 'GOAL'}
                    </Text>
                  )}
                </group>
              ))}
              
              {/* Mission label */}
              {isSelected && missionPath.waypoints.length > 0 && (
                <Text
                  position={[
                    missionPath.waypoints[0].x,
                    0.8,
                    missionPath.waypoints[0].y
                  ]}
                  fontSize={0.2}
                  color={color}
                  anchorX="center"
                  anchorY="middle"
                >
                  {`Mission #${mission.id.slice(-6)}`}
                </Text>
              )}
            </group>
          );
        })}
    </group>
  );
};

export default PathRenderer;