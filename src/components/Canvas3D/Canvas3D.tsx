import { useEffect, useRef, useState, type ElementRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import type { Robot, Site } from '../../types';
import type { Execution } from '../../simulation/engine';
import Scene from './Scene';

type CameraView = 'overview' | 'top' | 'follow';
function CameraRig({
  view,
  robot,
  revision,
}: {
  view: CameraView;
  robot?: Robot;
  revision: number;
}) {
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const target = useRef(new Vector3());
  const movement = useRef(new Vector3());
  useEffect(() => {
    if (view === 'top') camera.position.set(0, 29, 0.01);
    else camera.position.set(15, 17, 19);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camera, view, revision]);
  useFrame((_, delta) => {
    if (view !== 'follow' || !robot || !controls.current) return;
    const current = controls.current.target;
    target.current.set(robot.pose.x, 0, robot.pose.y);
    movement.current
      .copy(target.current)
      .sub(current)
      .multiplyScalar(1 - Math.exp(-5 * delta));
    camera.position.add(movement.current);
    current.add(movement.current);
    controls.current.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      minDistance={4}
      maxDistance={55}
      maxPolarAngle={Math.PI / 2.08}
      enablePan={view !== 'follow'}
      enableRotate={view !== 'top'}
    />
  );
}

export function Canvas3D({
  site,
  robots,
  missions = [],
  selectedRobot,
  onSelect,
}: {
  site: Site;
  robots: Robot[];
  missions?: Execution[];
  selectedRobot?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [view, setView] = useState<CameraView>('overview');
  const [revision, setRevision] = useState(0);
  const [routes, setRoutes] = useState(true);
  const [labels, setLabels] = useState(true);
  const robot = robots.find((r) => r.id === selectedRobot);
  return (
    <div className="fleet-scene">
      <div className="scene-toolbar">
        <div className="segmented" role="group" aria-label="3D camera">
          {(['overview', 'top', 'follow'] as const).map((mode) => (
            <button
              key={mode}
              aria-pressed={view === mode}
              disabled={mode === 'follow' && !robot}
              onClick={() => {
                setView(mode);
                setRevision((n) => n + 1);
              }}
            >
              {mode === 'top' ? 'Top down' : mode === 'follow' ? 'Follow robot' : 'Overview'}
            </button>
          ))}
        </div>
        <div className="scene-layers">
          <label>
            <input type="checkbox" checked={routes} onChange={(e) => setRoutes(e.target.checked)} />
            Routes
          </label>
          <label>
            <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} />
            Labels
          </label>
        </div>
      </div>
      <div className="scene-viewport">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [20, 21, 24], fov: 43, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: false }}
          fallback={
            <p className="empty-state">WebGL is unavailable. Switch to the 2D map to continue.</p>
          }
        >
          <color attach="background" args={['#e9edee']} />
          <ambientLight intensity={1.1} />
          <hemisphereLight args={['#e9f1ff', '#7a8177', 1]} />
          <directionalLight
            castShadow
            position={[8, 18, 10]}
            intensity={2.2}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-17}
            shadow-camera-right={17}
            shadow-camera-top={17}
            shadow-camera-bottom={-17}
            shadow-bias={-0.0005}
          />
          <Scene
            site={site}
            robots={robots}
            missions={missions}
            selectedRobot={selectedRobot}
            onSelect={onSelect}
            showRoutes={routes}
            showLabels={labels}
          />
          <Grid
            args={[20, 20]}
            position={[0, 0.012, 0]}
            cellSize={1}
            sectionSize={5}
            cellThickness={0.4}
            sectionThickness={0.8}
            cellColor="#ccd3d3"
            sectionColor="#aab6b6"
            fadeDistance={55}
            fadeStrength={1}
          />
          <CameraRig view={view} robot={robot} revision={revision} />
        </Canvas>
      </div>
      <div className="scene-footer">
        <span>
          {robot
            ? `${robot.id} · ${robot.status.toLowerCase()} · ${Math.round(robot.battery * 100)}% battery`
            : 'Select a robot to inspect or follow it'}
        </span>
        <span>Drag to orbit · Scroll to zoom · Right-drag to pan</span>
      </div>
    </div>
  );
}
