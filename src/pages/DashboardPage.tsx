import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { DevPanel } from '../components/DevPanel';
import { generateMockData } from '../utils/mockData';
import { useAppStore } from '../store/useAppStore';
import { useTelemetry } from '../hooks/useTelemetry';

export const DashboardPage: React.FC = () => {
  const { setSites, setRobots, setMissions, setSelectedSite, addEvent } = useAppStore();
  
  // Initialize telemetry
  useTelemetry();

  useEffect(() => {
    const initializeDemo = async () => {
      try {
        // Generate mock data
        const { sites: mockSites, robots: mockRobots, missions: mockMissions } = generateMockData();
        
        // Set data in store
        setSites(mockSites);
        setRobots(mockRobots);
        setMissions(mockMissions);
        
        // Select first site by default
        if (mockSites.length > 0) {
          setSelectedSite(mockSites[0].id);
        }
        
        addEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: `[DEMO] Initialized with ${mockSites.length} sites, ${mockRobots.length} robots, ${mockMissions.length} missions`,
          payload: { sites: mockSites.length, robots: mockRobots.length, missions: mockMissions.length }
        });
      } catch (error) {
        console.error('Failed to initialize demo:', error);
        addEvent({
          ts: Date.now(),
          level: 'ERROR',
          msg: `[DEMO] Initialization failed: ${(error as Error).message}`,
          payload: { error }
        });
      }
    };

    initializeDemo();
  }, [setSites, setRobots, setMissions, setSelectedSite, addEvent]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <Canvas3D />
      </div>
      <DevPanel />
    </div>
  );
};