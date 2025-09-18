import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSceneStore } from '../../store/useSceneStore';
import RobotMesh from './RobotMesh';
import MapLayer from './MapLayer';
import PathRenderer from './PathRenderer';
import OverlayRenderer from './OverlayRenderer';
import SceneAxes from './SceneAxes';
import CameraHUD from './CameraHUD';

const Scene: React.FC = () => {
  const { robots, currentSite, sites } = useAppStore();
  const { selectedSiteId, setSelectedSiteId, setRobots } = useSceneStore();
  
  // Sync with app store
  React.useEffect(() => {
    if (currentSite !== selectedSiteId) {
      setSelectedSiteId(currentSite);
    }
  }, [currentSite, selectedSiteId, setSelectedSiteId]);
  
  React.useEffect(() => {
    setRobots(robots);
  }, [robots, setRobots]);
  
  const siteRobots = robots.filter(robot => robot.site_id === (selectedSiteId || currentSite));
  const currentSiteData = sites.find(site => site.id === (selectedSiteId || currentSite));

  return (
    <>
      {/* Camera HUD */}
      <CameraHUD />
      
      <group>
        {/* Scene Axes */}
        <SceneAxes />
        
        {/* Map Layer */}
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
        
        {/* Paths */}
        <PathRenderer />
        
        {/* Overlays */}
        <OverlayRenderer />
        
        {/* Reference Objects (keeping for demo) */}
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
    </>
  );
};

export default Scene;
      
      {/* Reference Objects */}
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