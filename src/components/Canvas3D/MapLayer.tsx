import type { Site } from '../../types';
/** The demo uses a schematic floor, not an unrelated photograph or remote texture. */
export default function MapLayer({ site, visible = true }: { site: Site; visible?: boolean }) {
  if (!visible) return null;
  return (
    <mesh
      position={[site.origin.x, -0.04, site.origin.y]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#eef2f6" />
    </mesh>
  );
}
