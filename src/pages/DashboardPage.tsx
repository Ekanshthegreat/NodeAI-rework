import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { useAppStore } from '../store/useAppStore';
import { generateMockData } from '../utils/mockData';

const DashboardPage: React.FC = () => {
  const { currentSite, setCurrentSite, setSites, setRobots, setMissions } = useAppStore();

  useEffect(() => {
    // Load initial mock data
    const { sites, robots, missions } = generateMockData();
    setSites(sites);
    setRobots(robots);
    setMissions(missions);
    
    // Set default site
    if (!currentSite && sites.length > 0) {
      setCurrentSite(sites[0].id);
    }
  }, [currentSite, setCurrentSite, setSites, setRobots, setMissions]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
        <Canvas3D />
      </div>
    </div>
  );
};

export default DashboardPage;