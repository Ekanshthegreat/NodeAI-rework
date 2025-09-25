import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { useAppStore } from '../store/useAppStore';
import { seedDemoData } from '../lib/db';
import { toast } from 'react-hot-toast';

const DashboardPage: React.FC = () => {
  const { sites, robots, missions, loadSites, loadRobots, loadMissions, pushEvent } = useAppStore();

  useEffect(() => {
    const initializeDemo = async () => {
      try {
        // Load existing data first
        await Promise.all([
          loadSites(),
          loadRobots(), 
          loadMissions()
        ]);

        // If no data exists, seed demo data
        if (sites.length === 0) {
          await seedDemoData();
          await Promise.all([
            loadSites(),
            loadRobots(),
            loadMissions()
          ]);
          
          pushEvent({
            ts: Date.now(),
            level: 'INFO',
            msg: '[DEMO] Hospital demo loaded: 1 sites, 3 robots, 3 missions with paths',
            payload: { sites: 1, robots: 3, missions: 3 }
          });
          
          toast.success('[DEMO] Hospital demo with mission paths loaded successfully');
        }
      } catch (error) {
        console.error('Failed to initialize demo:', error);
        pushEvent({
          ts: Date.now(),
          level: 'ERROR',
          msg: '[DEMO] Failed to initialize demo data',
          payload: { error: (error as Error).message }
        });
        toast.error('Failed to load demo data');
      }
    };

    initializeDemo();
  }, [sites.length, loadSites, loadRobots, loadMissions, pushEvent]);

  return (
    <div className="h-full w-full">
      <Canvas3D />
    </div>
  );
};

export default DashboardPage;