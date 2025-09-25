import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { useTelemetry } from '../hooks/useTelemetry';
import { useAppStore } from '../store/useAppStore';
import { generateMockSites, generateMockRobots, generateMockMissions } from '../utils/mockData';

const DashboardPage: React.FC = () => {
  const { 
    currentSite, 
    sites, 
    robots, 
    missions,
    setSites, 
    setRobots, 
    setMissions, 
    setCurrentSite,
    addEvent 
  } = useAppStore();

  // Initialize telemetry
  useTelemetry();

  // Initialize demo data
  useEffect(() => {
    const initializeDemo = async () => {
      try {
        // Generate mock data
        const mockSites = generateMockSites();
        const mockRobots = generateMockRobots(mockSites);
        const mockMissions = generateMockMissions(mockSites);

        // Set data in store
        setSites(mockSites);
        setRobots(mockRobots);
        setMissions(mockMissions);

        // Set current site to first site
        if (mockSites.length > 0) {
          setCurrentSite(mockSites[0]);
        }

        addEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: '[DEMO] Demo data initialized successfully',
          payload: { 
            sites: mockSites.length, 
            robots: mockRobots.length, 
            missions: mockMissions.length 
          }
        });
      } catch (error) {
        console.error('Failed to initialize demo:', error);
        addEvent({
          ts: Date.now(),
          level: 'ERROR',
          msg: '[DEMO] Failed to initialize demo data',
          payload: { error: (error as Error).message }
        });
      }
    };

    // Only initialize if we don't have data yet
    if (sites.length === 0) {
      initializeDemo();
    }
  }, [sites.length, setSites, setRobots, setMissions, setCurrentSite, addEvent]);

  return (
    <main className="flex-1 overflow-hidden">
      <div className="h-full w-full">
        <Canvas3D />
      </div>
    </main>
  );
};

export default DashboardPage;