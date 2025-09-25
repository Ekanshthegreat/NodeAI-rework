import React, { useEffect } from 'react';
import { { Canvas3D } from '../components/Canvas3D/Canvas3D';
}
import DevPanel from '../components/DevPanel';
import { useAppStore } from '../store/useAppStore';
import { generateMockData } from '../utils/mockData';

const DashboardPage: React.FC = () => {
  const { setSites, setRobots, setMissions, pushEvent } = useAppStore();

  useEffect(() => {
    const initializeDemo = async () => {
      try {
        pushEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: '[DEMO] Initializing demo data...',
          payload: {}
        });

        const { sites: mockSites, robots: mockRobots, missions: mockMissions } = generateMockData();
        
        setSites(mockSites);
        setRobots(mockRobots);
        setMissions(mockMissions);

        pushEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: `[DEMO] Demo initialized with ${mockSites.length} sites, ${mockRobots.length} robots, ${mockMissions.length} missions`,
          payload: { sites: mockSites.length, robots: mockRobots.length, missions: mockMissions.length }
        });
      } catch (error) {
        console.error('Failed to initialize demo:', error);
        pushEvent({
          ts: Date.now(),
          level: 'ERROR',
          msg: `[DEMO] Failed to initialize: ${(error as Error).message}`,
          payload: { error }
        });
      }
    };

    initializeDemo();
  }, [setSites, setRobots, setMissions, pushEvent]);

  return (
    <div className="flex-1 flex flex-col">
      <Canvas3D />
      <DevPanel />
    </div>
  );
};

export default DashboardPage;