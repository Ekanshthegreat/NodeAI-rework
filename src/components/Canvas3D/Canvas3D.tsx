import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import Scene from './Scene';

export const Canvas3D: React.FC = () => {
  return (
    <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden relative shadow-2xl border border-slate-800/50">
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        className="bg-gradient-to-br from-slate-950 to-slate-900"
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0f172a', 1);
        }}
      >
        {/* Simple Lighting */}
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
          materialProps={{
            color: '#4a5568',
            transparent: true,
            opacity: 0.4,
          }}
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