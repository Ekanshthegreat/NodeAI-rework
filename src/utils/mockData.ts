import type { Site, Robot, Mission } from '../types';

export const generateMockData = () => {
  const sites: Site[] = [
    {
      id: 'warehouse_alpha',
      name: 'Warehouse Alpha',
      map_url:
        'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=1024&h=1024&fit=crop',
      origin: { x: 0, y: 0 },
      scale_m_per_px: 0.1,
    },
    {
      id: 'factory_beta',
      name: 'Factory Beta',
      map_url:
        'https://images.pexels.com/photos/236698/pexels-photo-236698.jpeg?auto=compress&cs=tinysrgb&w=1024&h=1024&fit=crop',
      origin: { x: 0, y: 0 },
      scale_m_per_px: 0.05,
    },
  ];

  const robots: Robot[] = [
    {
      id: 'AGV-001',
      site_id: 'warehouse_alpha',
      vendor: 'rmf',
      pose: { x: 2, y: 3, theta: 0.5 },
      battery: 0.85,
      status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'AGV-002',
      site_id: 'warehouse_alpha',
      vendor: 'vda5050',
      pose: { x: -1, y: -2, theta: 1.2 },
      battery: 0.42,
      status: 'CHARGING',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'AGV-003',
      site_id: 'warehouse_alpha',
      vendor: 'mock',
      pose: { x: 4, y: -1, theta: -0.8 },
      battery: 0.67,
      status: 'IDLE',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'AGV-101',
      site_id: 'factory_beta',
      vendor: 'rmf',
      pose: { x: 1, y: 2, theta: 0 },
      battery: 0.91,
      status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    },
  ];

  const missions: Mission[] = [
    {
      id: 'mission-001',
      site_id: 'warehouse_alpha',
      nl: 'Pick up package from dock A and deliver to zone 3',
      status: 'active',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    },
    {
      id: 'mission-002',
      site_id: 'warehouse_alpha',
      nl: 'Inspect all security zones and report any anomalies',
      status: 'completed',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: 'mission-003',
      site_id: 'factory_beta',
      nl: 'Transport materials from storage to production line B',
      status: 'planning',
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    },
  ];

  return { sites, robots, missions };
};
