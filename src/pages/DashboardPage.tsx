import React, { useEffect } from 'react';
import { generateMockData } from '../utils/mockData';
import { useAppStore } from '../store/useAppStore';
import Canvas3D from '../components/Canvas3D/Canvas3D';
import DevPanel from '../components/DevPanel';

const DashboardPage: React.FC = () => {
  const { setSites, setRobots, setMissions, pushEvent } = useAppStore();

  useEffect(() => {
    const initializeDemo = async () => {
      try {
        // Generate mock data
        const { sites, robots, missions } = generateMockData();
        
        // Set data in store
        setSites(sites);
        setRobots(robots);
        setMissions(missions);
        
        pushEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: `[DEMO] Initialized with ${sites.length} sites, ${robots.length} robots, ${missions.length} missions`,
          payload: { sites: sites.length, robots: robots.length, missions: missions.length }
        });
      } catch (error) {
        console.error('Failed to initialize demo:', error);
        pushEvent({
          ts: Date.now(),
          level: 'ERROR',
          msg: `[DEMO] Initialization failed: ${(error as Error).message}`,
          payload: { error }
        });
      }
    };

    initializeDemo();
  }, [setSites, setRobots, setMissions, pushEvent]);

  return (
    <div className="h-full flex flex-col">
      <Canvas3D />
      <DevPanel />
    </div>
  );
};

export default DashboardPage;