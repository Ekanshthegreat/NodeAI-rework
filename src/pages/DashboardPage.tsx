import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { useAppStore } from '../store/useAppStore';
import { useSceneStore } from '../store/useSceneStore';
import DevPanel from '../components/DevPanel';
import { useTelemetry } from '../hooks/useTelemetry';
import { fetchSites, fetchRobots, fetchMissions, seedIfEmpty } from '../lib/db';
import { toast } from 'react-hot-toast';

const DashboardPage: React.FC = () => {
  const { 
    currentSite, 
    setCurrentSite, 
    setSites, 
    setRobots, 
    setMissions,
    pushEvent 
  } = useAppStore();
  const { addPath, addOverlay, clearPaths, clearOverlays } = useSceneStore();
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize telemetry with policy engine
  useTelemetry();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Try to ensure seed data exists (will fallback to mock if Supabase unavailable)
        try {
          await seedIfEmpty();
        } catch (error) {
          console.warn('Seeding failed, using mock data:', error);
        }
        
        // Load data from Supabase
        const [sites, robots, missions] = await Promise.all([
          fetchSites(),
          fetchRobots(),
          fetchMissions()
        ]);
        
        setSites(sites);
        setRobots(robots);
        setMissions(missions);
        
        // Set default site
        if (!currentSite && sites.length > 0) {
          setCurrentSite(sites[0].id);
        }
        
        // Add demo paths and overlays
        clearPaths();
        clearOverlays();
        
        // Demo path for first robot
        if (robots.length > 0) {
          addPath({
            id: 'demo-path-1',
            robotId: robots[0].id,
            points: [
              { x: 0, y: 0 },
              { x: 2, y: 3 },
              { x: 5, y: 5 },
              { x: 3, y: 8 }
            ],
            color: '#10b981',
            visible: true,
          });
        }
        
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
        
        pushEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: `Dashboard loaded: ${sites.length} sites, ${robots.length} robots, ${missions.length} missions`,
          payload: { sites: sites.length, robots: robots.length, missions: missions.length }
        });
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Using mock data - Supabase connection failed');
        pushEvent({
          ts: Date.now(),
          level: 'ERROR',
          msg: 'Failed to load dashboard data',
          payload: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-lg">
        <div className="flex flex-col items-center space-y-4 text-slate-400">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-400 border-t-transparent"></div>
          <div className="text-center">
            <div className="text-lg font-medium text-slate-300">Loading Dashboard</div>
            <div className="text-sm text-slate-500 mt-1">Initializing systems...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden relative">
        <Canvas3D />
      </div>
      <DevPanel />
    </div>
  );
};

export default DashboardPage;