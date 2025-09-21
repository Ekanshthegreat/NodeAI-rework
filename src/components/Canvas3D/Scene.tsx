import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import RobotMesh from './RobotMesh';
import MapLayer from './MapLayer';
import PathRenderer from './PathRenderer';
import ObstacleRenderer from './ObstacleRenderer';
import AnchorRenderer from './AnchorRenderer';

const Scene: React.FC = () => {
  const { robots, currentSite, sites } = useAppStore();
  
  const siteRobots = robots.filter(robot => robot.site_id === currentSite);
  const currentSiteData = sites.find(site => site.id === currentSite);

  return (
    <group>
      {/* Map layer */}
      {currentSiteData && (
        <MapLayer site={currentSiteData} visible={true} />
      )}
      
      {/* Robots */}
      {siteRobots.map((robot) => (
        <RobotMesh
          key={robot.id}
          robot={robot}
          position={[robot.pose.x, 0.5, robot.pose.y]}
          rotation={[0, robot.pose.theta, 0]}
        />
      ))}
      
      {/* Mission paths */}
      <PathRenderer />
      
      {/* Obstacles and no-go zones */}
      <ObstacleRenderer />
      
      {/* Named anchors/locations */}
      <AnchorRenderer />
      
      {/* Reference lighting objects */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>
    </group>
  );
};

export default Scene;