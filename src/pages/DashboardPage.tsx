import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import DevPanel from '../components/DevPanel';
import { useAppStore } from '../store/useAppStore';
import { generateMockData } from '../utils/mockData';

const DashboardPage: React.FC = () => {
  const { sites, robots, missions, setSites, setRobots, setMissions, setCurrentSite } = useAppStore();

  useEffect(() => {
    // Initialize with mock data if no data exists
    if (sites.length === 0 || robots.length === 0 || missions.length === 0) {
      try {
        const mockData = generateMockData();
        setSites(mockData.sites);
        setRobots(mockData.robots);
        setMissions(mockData.missions);
        
        // Set the first site as current
        if (mockData.sites.length > 0) {
          setCurrentSite(mockData.sites[0]);
        }
        
        console.log('Dashboard initialized with mock data');
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
      }
    }
  }, [sites.length, robots.length, missions.length, setSites, setRobots, setMissions, setCurrentSite]);

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <main className="flex-1">
        <Canvas3D />
      </main>
      
      <div className="h-auto">
        <DevPanel />
      </div>
    </div>
  );
};

export default DashboardPage;