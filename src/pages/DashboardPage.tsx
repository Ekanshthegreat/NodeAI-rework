import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { useAppStore } from '../store/useAppStore';
import { loadSites, loadRobots, loadMissions } from '../lib/supabase';
import { useTelemetry } from '../hooks/useTelemetry';
import { usePolicyEngine } from '../hooks/usePolicyEngine';

const DashboardPage: React.FC = () => {
  const { 
    currentSite, 
    setCurrentSite, 
    setSites, 
    setRobots, 
    setMissions,
    sites,
    pushEvent 
  } = useAppStore();

  // Initialize telemetry and policy engine
  useTelemetry();
  usePolicyEngine();

  // Initialize demo data
  useEffect(() => {
    const initializeDemo = async () => {
      try {
        // Load data from Supabase (or mock data if using mock client)
        const [sitesData, robotsData, missionsData] = await Promise.all([
          loadSites(),
          loadRobots(),
          loadMissions(),
        ]);

        // Update store state
        setSites(sitesData);
        setRobots(robotsData);
        setMissions(missionsData);

        // Set default site if none selected
        if (!currentSite && sitesData.length > 0) {
          setCurrentSite(sitesData[0].id);
        }

        // Log successful initialization
        pushEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: '[DEMO] System initialized successfully',
          payload: { 
            sites: sitesData.length, 
            robots: robotsData.length, 
            missions: missionsData.length 
          }
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
  }, [setSites, setRobots, setMissions, setCurrentSite, currentSite, pushEvent]);

  if (!currentSite || sites.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent mx-auto mb-4"></div>
          <p>Loading mission control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Canvas3D />
    </div>
  );
};

export default DashboardPage;