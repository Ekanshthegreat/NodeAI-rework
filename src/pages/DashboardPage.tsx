import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { useAppStore } from '../store/useAppStore';
import { useSceneStore } from '../store/useSceneStore';
import { generateMockData } from '../utils/mockData';

const DashboardPage: React.FC = () => {
  const { currentSite, setCurrentSite, setSites, setRobots, setMissions } = useAppStore();
  const { addPath, addOverlay, clearPaths, clearOverlays } = useSceneStore();

  useEffect(() => {
    // Load initial mock data
    const { sites, robots, missions } = generateMockData();
    setSites(sites);
    setRobots(robots);
    setMissions(missions);
    
    // Set default site
    if (!currentSite && sites.length > 0) {
      setCurrentSite(sites[0].id);
    }
    
    // Add some demo paths and overlays
    clearPaths();
    clearOverlays();
    
    // Demo path
    addPath({
      id: 'demo-path-1',
      robotId: 'AGV-001',
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 3 },
        { x: 5, y: 5 },
        { x: 3, y: 8 }
      ],
      color: '#10b981',
      visible: true,
    });
    
    // Demo overlays
    addOverlay({
      id: 'waypoint-1',
      type: 'waypoint',
      position: { x: 2, y: 3 },
      label: 'Pickup',
      color: '#3b82f6',
      visible: true,
    });
    
    addOverlay({
      id: 'zone-1',
      type: 'zone',
      position: { x: 5, y: 5 },
      label: 'Loading Zone',
      color: '#f59e0b',
      visible: true,
    });
  }, [currentSite, setCurrentSite, setSites, setRobots, setMissions]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative">
        <Canvas3D />
      </div>
    </div>
  );
};

export default DashboardPage;