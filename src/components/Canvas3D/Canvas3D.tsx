import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Stats } from '@react-three/drei';
import Scene from './Scene';
import LoadingSpinner from './LoadingSpinner';

export const Canvas3D: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden relative">
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        className="bg-gray-900"
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={<LoadingSpinner />}>
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight 
            position={[10, 10, 10]} 
            intensity={1} 
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          {/* Environment */}
          <Environment preset="warehouse" background={false} />
          
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
            maxPolarAngle={Math.PI / 2.1} // Prevent going below ground
            enableDamping={true}
            dampingFactor={0.05}
          />
          
          {/* Performance Stats (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <Stats showPanel={0} className="stats" />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};