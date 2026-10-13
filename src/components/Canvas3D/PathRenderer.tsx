import { Line } from '@react-three/drei';
import { useFleetStore } from '../../store/useFleetStore';
export default function PathRenderer() {
  const missions = useFleetStore((s) => s.fleet.missions);
  return (
    <group>
      {missions
        .filter((m) => (m.status === 'active' || m.status === 'paused') && m.route.length > 1)
        .map((m) => (
          <Line
            key={m.id}
            points={m.route.map((p) => [p.x, 0.1, p.y] as [number, number, number])}
            color="#617da4"
            lineWidth={2}
          />
        ))}
    </group>
  );
}
