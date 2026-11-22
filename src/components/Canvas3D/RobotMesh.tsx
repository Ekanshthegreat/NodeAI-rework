import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, MathUtils } from 'three';
import type { Robot } from '../../types';
import { ROBOT_RADIUS } from '../../simulation/traffic';
export default function RobotMesh({
  robot,
  position,
  rotation,
  selected = false,
  showLabel = true,
  showClearance = false,
  waitingFor,
  onSelect,
}: {
  robot: Robot;
  position: [number, number, number];
  rotation: [number, number, number];
  selected?: boolean;
  showLabel?: boolean;
  showClearance?: boolean;
  waitingFor?: string | null;
  onSelect?: (id: string) => void;
}) {
  const body = useRef<Group>(null);
  const initial = useRef({ position, rotation });
  useFrame((_, delta) => {
    if (!body.current) return;
    const blend = 1 - Math.exp(-14 * delta);
    body.current.position.x = MathUtils.lerp(body.current.position.x, position[0], blend);
    body.current.position.z = MathUtils.lerp(body.current.position.z, position[2], blend);
    const angle = rotation[1] - body.current.rotation.y;
    body.current.rotation.y += Math.atan2(Math.sin(angle), Math.cos(angle)) * blend;
  });
  const color =
    robot.status === 'BLOCKED' || robot.status === 'ERROR' || waitingFor
      ? '#a26545'
      : robot.status === 'CHARGING'
        ? '#6b8464'
        : '#42667a';
  return (
    <group
      ref={body}
      position={initial.current.position}
      rotation={initial.current.rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(robot.id);
      }}
    >
      <mesh castShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[0.95, 0.4, 0.68]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[0.72, 0.09, 0.5]} />
        <meshStandardMaterial color="#dae0dc" roughness={0.7} />
      </mesh>
      {[-0.25, 0.25].flatMap((x) =>
        [-0.36, 0.36].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.17, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.09, 16]} />
            <meshStandardMaterial color="#303a40" roughness={0.9} />
          </mesh>
        ))
      )}
      <mesh position={[0.36, 0.67, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.16, 24]} />
        <meshStandardMaterial color="#283d47" />
      </mesh>
      <mesh position={[0.481, 0.34, 0]}>
        <boxGeometry args={[0.02, 0.07, 0.34]} />
        <meshStandardMaterial color="#d9eee9" emissive="#95c1b8" emissiveIntensity={0.6} />
      </mesh>
      {(selected || showClearance || waitingFor) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[ROBOT_RADIUS, ROBOT_RADIUS + 0.04, 48]} />
          <meshBasicMaterial color={waitingFor ? '#a26545' : selected ? '#245b91' : '#829a97'} />
        </mesh>
      )}
      {showLabel && (
        <Html position={[0, 1.15, 0]} center occlude>
          <button
            className={`scene-robot-label${selected ? ' selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onSelect?.(robot.id)}
          >
            {robot.id}
            {waitingFor ? ' · yielding' : ''}
          </button>
        </Html>
      )}
    </group>
  );
}
