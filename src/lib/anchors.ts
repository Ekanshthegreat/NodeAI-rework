// Named locations for mission planning (in meters, world coordinates)
export const HOSPITAL_ANCHORS: Record<string, { x: number; y: number }> = {
  // Medical areas
  'Pharmacy': { x: 5, y: 2 },
  'Laboratory': { x: -3, y: 8 },
  'Nurses Station': { x: 0, y: 0 },
  'Emergency Room': { x: 8, y: -2 },
  
  // Patient areas
  'Ward A': { x: -3, y: 8 },
  'Ward B': { x: 6, y: 8 },
  'Room 205': { x: 4, y: 6 },
  'Room 210': { x: 2, y: 6 },
  'Room 215': { x: 0, y: 6 },
  
  // Service areas
  'Charging Station': { x: -5, y: -3 },
  'Storage': { x: -6, y: 4 },
  'Loading Dock': { x: 8, y: 0 },
  'Elevator': { x: 0, y: -4 },
  
  // Docking points
  'Dock A': { x: -2, y: -2 },
  'Dock B': { x: 2, y: -2 },
  'dock-1': { x: -2, y: -2 }, // alias
  'dock_01': { x: -2, y: -2 }, // alias
};

export function resolveAnchor(name: string): { x: number; y: number } | null {
  const normalized = name.trim();
  
  // Direct lookup
  if (HOSPITAL_ANCHORS[normalized]) {
    return HOSPITAL_ANCHORS[normalized];
  }
  
  // Case-insensitive lookup
  const lowerName = normalized.toLowerCase();
  for (const [key, pos] of Object.entries(HOSPITAL_ANCHORS)) {
    if (key.toLowerCase() === lowerName) {
      return pos;
    }
  }
  
  // Partial match
  for (const [key, pos] of Object.entries(HOSPITAL_ANCHORS)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return pos;
    }
  }
  
  return null;
}

export function getAllAnchors(): Array<{ name: string; position: { x: number; y: number } }> {
  return Object.entries(HOSPITAL_ANCHORS).map(([name, position]) => ({
    name,
    position,
  }));
}