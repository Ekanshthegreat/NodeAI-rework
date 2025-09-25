import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { useAppStore } from '../store/useAppStore';
import { useTelemetry } from '../hooks/useTelemetry';
import { generateMockData } from '../utils/mockData';

const DashboardPage: React.FC = () => {
  const { 
    addEvent, 
    setSites, 
    setRobots, 
    setMissions, 
    setCurrentSite,
    sites 
  } = useAppStore();

  // Initialize telemetry
  useTelemetry();

  useEffect(() => {
    const initializeDemo = async () => {
      try {
        // Generate mock data
        const { mockSites, mockRobots, mockMissions } = generateMockData();
        
        // Set data in store
        setSites(mockSites);
        setRobots(mockRobots);
        setMissions(mockMissions);
        
        // Set first site as current
        if (mockSites.length > 0) {
          setCurrentSite(mockSites[0]);
        }

        addEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: '[DEMO] Demo initialized successfully',
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
          msg: '[DEMO] Failed to initialize demo',
          payload: { error: (error as Error).message }
        });
      }
    };

    // Only initialize if we don't have sites yet
    if (sites.length === 0) {
      initializeDemo();
    }
  }, [addEvent, setSites, setRobots, setMissions, setCurrentSite, sites.length]);

  return (
    <main className="flex-1 overflow-hidden">
      <Canvas3D />
    </main>
  );
};

export default DashboardPage;