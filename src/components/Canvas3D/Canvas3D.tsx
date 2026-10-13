import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import Scene from './Scene';

export const Canvas3D: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-100 rounded-xl overflow-hidden relative shadow-xl border border-gray-300">
      <Canvas
        fallback={
          <p className="empty-state">WebGL is unavailable. Switch to the 2D map to continue.</p>
        }
        camera={{
          position: [10, 10, 10],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        className="bg-white"
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#ffffff', 1);
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />

        {/* Grid */}
        <Grid
          args={[50, 50]}
          position={[0, 0, 0]}
          cellSize={1}
          cellThickness={0.5}
          sectionSize={5}
          sectionThickness={1.5}
          fadeDistance={50}
          fadeStrength={1}
          cellColor="#d1d5db"
          sectionColor="#9ca3af"
        />

        {/* Scene Content */}
        <Scene />

        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};
