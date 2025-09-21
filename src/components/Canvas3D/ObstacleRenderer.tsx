import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const ObstacleRenderer: React.FC = () => {
  const { sites, currentSite } = useAppStore();
  
  const site = sites.find(s => s.id === currentSite);
  if (!site) return null;
  
  const obstacles = site.obstacles || [];
  const noGoZones = site.noGo || [];
  
  return (
    <group>
      {/* Render obstacles as red boxes */}
      {obstacles.map((obstacle) => (
        <mesh
          key={obstacle.id}
          position={[
            obstacle.rect.x + obstacle.rect.w / 2,
            0.5,
            obstacle.rect.y + obstacle.rect.h / 2
          ]}
        >
          <boxGeometry args={[obstacle.rect.w, 1, obstacle.rect.h]} />
          <meshStandardMaterial
            color="#ef4444"
            transparent
            opacity={0.6}
            emissive="#ef4444"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
      
      {/* Render no-go zones as yellow polygons */}
      {noGoZones.map((zone) => {
        if (zone.poly.length < 3) return null;
        
        // Simple polygon rendering (assuming convex for now)
        const centerX = zone.poly.reduce((sum, p) => sum + p.x, 0) / zone.poly.length;
        const centerY = zone.poly.reduce((sum, p) => sum + p.y, 0) / zone.poly.length;
        
        return (
          <mesh
            key={zone.id}
            position={[centerX, 0.1, centerY]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[2, 8]} />
            <meshStandardMaterial
              color="#f59e0b"
              transparent
              opacity={0.4}
              emissive="#f59e0b"
              emissiveIntensity={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default ObstacleRenderer;