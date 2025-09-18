import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import Scene from './Scene';
import LoadingSpinner from './LoadingSpinner';

export const Canvas3D: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 50,
        }}
        className="bg-gray-900"
      >
        <Suspense fallback={<LoadingSpinner />}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          {/* Environment */}
          <Environment preset="warehouse" />
          
          {/* Grid */}
          <Grid
            args={[20, 20]}
            position={[0, 0, 0]}
            cellSize={1}
            cellThickness={0.5}
            sectionSize={5}
            sectionThickness={1}
            fadeDistance={25}
            fadeStrength={1}
            materialProps={{
              color: '#4a5568',
              transparent: true,
              opacity: 0.3,
            }}
          />
          
          {/* Scene Content */}
          <Scene />
          
          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={50}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};