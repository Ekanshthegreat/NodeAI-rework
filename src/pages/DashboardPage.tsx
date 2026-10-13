import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import DevPanel from '../components/DevPanel';
import { useAppStore } from '../store/useAppStore';
import { useTelemetry } from '../hooks/useTelemetry';
import { usePolicyEngine } from '../hooks/usePolicyEngine';
import { generateMockData } from '../utils/mockData';

const DashboardPage: React.FC = () => {
  const { setSites, setRobots, setMissions, addEvent } = useAppStore();

  // Enable telemetry for robot movement
  useTelemetry({ interval: 100 });

  // Enable policy engine for self-healing
  usePolicyEngine();

  useEffect(() => {
    const initializeData = async () => {
      try {
        const mockData = generateMockData();
        setSites(mockData.sites);
        setRobots(mockData.robots);
        setMissions(mockData.missions);
        
        addEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: '[DEMO] Mock data initialized successfully',
          payload: { 
            sites: mockData.sites.length,
            robots: mockData.robots.length,
            missions: mockData.missions.length
          }
        });
      } catch (error) {
        console.error('Failed to initialize mock data:', error);
        addEvent({
          ts: Date.now(),
          level: 'ERROR',
          msg: '[DEMO] Failed to initialize mock data',
          payload: { error: (error as Error).message }
        });
      }
    };

    initializeData();
  }, [setSites, setRobots, setMissions, addEvent]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <main className="flex-1 min-h-0">
        <Canvas3D />
      </main>
      <div className="h-32 flex-shrink-0">
        <DevPanel />
      </div>
    </div>
  );
};

export default DashboardPage;