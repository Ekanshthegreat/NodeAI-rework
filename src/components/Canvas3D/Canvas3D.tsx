import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import Scene from './Scene';

const LoadingFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
    <div className="flex flex-col items-center space-y-4 text-slate-400">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent"></div>
      <div className="text-center">
        <div className="text-sm font-medium text-slate-300">Loading 3D Scene</div>
        <div className="text-xs text-slate-500 mt-1">Initializing Three.js...</div>
      </div>
    </div>
  </div>
);

export const Canvas3D: React.FC = () => {
  return (
    <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden relative shadow-2xl border border-slate-800/50">
      <Suspense fallback={<LoadingFallback />}>
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
      </Suspense>
    </div>
  );
};