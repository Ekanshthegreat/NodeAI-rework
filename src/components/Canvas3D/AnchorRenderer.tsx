import { Html } from '@react-three/drei';
import { HOSPITAL_ANCHORS } from '../../lib/anchors';
export default function AnchorRenderer() {
  return (
    <group>
      {['Pharmacy', 'Ward A', 'Ward B', 'Storage', 'Loading Dock', 'Charging Station'].map(
        (name) => {
          const p = HOSPITAL_ANCHORS[name];
          return (
            <group key={name} position={[p.x, 0, p.y]}>
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.1]} />
                <meshStandardMaterial color="#71859e" />
              </mesh>
              <Html position={[0, 0.4, 0]} center style={{ pointerEvents: 'none' }}>
                <span className="scene-label anchor-label">{name}</span>
              </Html>
            </group>
          );
        }
      )}
    </group>
  );
}
