import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { DoubleSide, Shape } from 'three';
import type { Robot, Site } from '../../types';
import type { Execution } from '../../simulation/engine';
import { HOSPITAL_ANCHORS } from '../../lib/anchors';
import RobotMesh from './RobotMesh';

const locations = ['Pharmacy', 'Ward A', 'Ward B', 'Storage', 'Loading Dock', 'Charging Station'];
function RestrictedArea({ polygon }: { polygon: { x: number; y: number }[] }) {
  const shape = useMemo(() => {
    const result = new Shape();
    if (polygon.length) {
      result.moveTo(polygon[0].x, -polygon[0].y);
      polygon.slice(1).forEach((p) => result.lineTo(p.x, -p.y));
      result.closePath();
    }
    return result;
  }, [polygon]);
  if (polygon.length < 3) return null;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color="#b47645"
          transparent
          opacity={0.2}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={[...polygon, polygon[0]].map((p) => [p.x, 0.045, p.y])}
        color="#a16e46"
        lineWidth={1.5}
        dashed
        dashSize={0.22}
        gapSize={0.14}
      />
    </group>
  );
}

export default function Scene({
  site,
  robots,
  missions,
  selectedRobot,
  onSelect,
  showRoutes,
  showLabels,
}: {
  site: Site;
  robots: Robot[];
  missions: Execution[];
  selectedRobot?: string | null;
  onSelect?: (id: string) => void;
  showRoutes: boolean;
  showLabels: boolean;
}) {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.13, 0]}>
        <boxGeometry args={[20, 0.25, 20]} />
        <meshStandardMaterial color="#f4f5f2" roughness={0.95} />
      </mesh>
      {site.obstacles?.map(({ id, rect }) => (
        <group key={id} position={[rect.x + rect.w / 2, 0, rect.y + rect.h / 2]}>
          <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
            <boxGeometry args={[rect.w, 1.2, rect.h]} />
            <meshStandardMaterial color="#8e9c9e" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.22, 0]}>
            <boxGeometry args={[rect.w + 0.04, 0.04, rect.h + 0.04]} />
            <meshStandardMaterial color="#c2cdcd" />
          </mesh>
        </group>
      ))}
      {site.noGo?.map((zone) => (
        <RestrictedArea key={zone.id} polygon={zone.poly} />
      ))}
      {locations.map((name) => {
        const p = HOSPITAL_ANCHORS[name];
        return (
          <group key={name} position={[p.x, 0.025, p.y]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.22, 0.3, 32]} />
              <meshBasicMaterial color="#718685" />
            </mesh>
            {showLabels && (
              <Html position={[0, 0.13, 0]} center occlude style={{ pointerEvents: 'none' }}>
                <span
                  className="scene-location"
                  style={{
                    transform:
                      name === 'Loading Dock'
                        ? 'translate(24px, 8px)'
                        : name === 'Pharmacy'
                          ? 'translate(-14px, -18px)'
                          : 'translateY(-14px)',
                  }}
                >
                  {name}
                </span>
              </Html>
            )}
          </group>
        );
      })}
      {showRoutes &&
        missions
          .filter((m) => (m.status === 'active' || m.status === 'paused') && m.route.length > 1)
          .map((m) => (
            <Line
              key={m.id}
              points={m.route.map((p) => [p.x, 0.07, p.y])}
              color={m.robotId === selectedRobot ? '#245b91' : '#6a8d89'}
              lineWidth={m.robotId === selectedRobot ? 3 : 1.8}
              dashed={m.status === 'paused'}
            />
          ))}
      {robots.map((robot) => (
        <RobotMesh
          key={robot.id}
          robot={robot}
          position={[robot.pose.x, 0, robot.pose.y]}
          rotation={[0, -robot.pose.theta, 0]}
          selected={robot.id === selectedRobot}
          showLabel={showLabels}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
