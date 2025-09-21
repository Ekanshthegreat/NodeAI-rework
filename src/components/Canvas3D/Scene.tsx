import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import RobotMesh from './RobotMesh';

const Scene: React.FC = () => {
  const { robots, currentSite } = useAppStore();
  
  const siteRobots = robots.filter(robot => robot.site_id === currentSite);

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[20, 0.1, 20]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      
      {/* Robots */}
      {siteRobots.map((robot) => (
        <RobotMesh
          key={robot.id}
          robot={robot}
          position={[robot.pose.x, 0.5, robot.pose.y]}
          rotation={[0, robot.pose.theta, 0]}
        />
      ))}
      
      {/* Reference Objects for scale */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1, 0.2, 1]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>
      
      <mesh position={[5, 0.5, 5]}>
        <cylinderGeometry args={[0.5, 0.5, 1]} />
        <meshStandardMaterial color="#e53e3e" />
      </mesh>
      
      <mesh position={[-5, 0.5, -5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3182ce" />
      </mesh>
    </group>
  );
};

export default Scene;