import React, { useEffect } from 'react';
import { Canvas3D } from '../components/Canvas3D/Canvas3D';
import { useAppStore } from '../store/useAppStore';
import { useSceneStore } from '../store/useSceneStore';
import DevPanel from '../components/DevPanel';
import { useTelemetry } from '../hooks/useTelemetry';
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

  // Initialize telemetry with policy engine
  useTelemetry();

  useEffect(() => {
    // Load mock hospital data immediately
    const mockSites = [
      {
        id: 'HospitalA-F2',
        name: 'Hospital Alpha - Floor 2',
        map_url: '/maps/hospital-f2.png',
        origin: { x: 0, y: 0 },
        scale_m_per_px: 0.05,
        created_at: new Date().toISOString(),
      }
    ];

    const mockRobots = [
      {
        id: 'MED-001',
        site_id: 'HospitalA-F2',
        vendor: 'rmf',
        pose: { x: 2.5, y: 1.0, theta: 0.0 },
        battery: 0.85,
        status: 'IDLE',
        capabilities: ['delivery', 'dock'],
        updated_at: new Date().toISOString(),
      },
      {
        id: 'MED-002',
        site_id: 'HospitalA-F2',
        vendor: 'vda5050',
        pose: { x: -1.5, y: 3.2, theta: 1.57 },
        battery: 0.42,
        status: 'CHARGING',
        capabilities: ['delivery', 'dock'],
        updated_at: new Date().toISOString(),
      },
      {
        id: 'MED-003',
        site_id: 'HospitalA-F2',
        vendor: 'mock',
        pose: { x: 4.0, y: -2.1, theta: -0.78 },
        battery: 0.67,
        status: 'ACTIVE',
        capabilities: ['delivery', 'dock', 'elevator'],
        updated_at: new Date().toISOString(),
      },
    ];

    const mockMissions = [
      {
        id: 'mission-001',
        site_id: 'HospitalA-F2',
        nl: 'Deliver medication from pharmacy to room 205',
        status: 'active',
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 'mission-002',
        site_id: 'HospitalA-F2',
        nl: 'Transport lab samples from room 210 to laboratory',
        status: 'completed',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: 'mission-003',
        site_id: 'HospitalA-F2',
        nl: 'Perform security patrol of all patient rooms',
        status: 'planning',
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
    ];
    
    setSites(mockSites);
    setRobots(mockRobots);
    setMissions(mockMissions);
    
    // Set default site
    if (!currentSite) {
      setCurrentSite(mockSites[0].id);
    }
    
    // Add demo paths and overlays
    clearPaths();
    clearOverlays();
    
    // Demo path for first robot
    addPath({
      id: 'demo-path-1',
      robotId: mockRobots[0].id,
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 3 },
        { x: 5, y: 5 },
        { x: 3, y: 8 }
      ],
      color: '#10b981',
      visible: true,
    });
    
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
      msg: `Dashboard loaded: ${mockSites.length} sites, ${mockRobots.length} robots, ${mockMissions.length} missions`,
      payload: { sites: mockSites.length, robots: mockRobots.length, missions: mockMissions.length }
    });

    toast.success('Hospital demo data loaded successfully');
  }, []);

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