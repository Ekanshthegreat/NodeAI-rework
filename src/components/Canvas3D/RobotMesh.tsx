import { Html } from '@react-three/drei';
import type { Robot } from '../../types';
export default function RobotMesh({
  robot,
  position,
  rotation,
}: {
  robot: Robot;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const color = robot.status === 'BLOCKED' || robot.status === 'CHARGING' ? '#8a5e42' : '#245b91';
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.65, 0.4, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.3, 0.25]}>
        <cylinderGeometry args={[0.12, 0.12, 0.25]} />
        <meshStandardMaterial color="#172033" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[robot.battery * 0.65, 0.05, 0.08]} />
        <meshStandardMaterial color="#617083" />
      </mesh>
      <Html position={[0, 0.9, 0]} center style={{ pointerEvents: 'none' }}>
        <span className="scene-label">{robot.id}</span>
      </Html>
    </group>
  );
}
