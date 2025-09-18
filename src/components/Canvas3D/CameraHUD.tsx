import React from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useSceneStore } from '../../store/useSceneStore';

const CameraHUD: React.FC = () => {
  const { camera } = useThree();
  const { fps, cameraPosition, setFPS, setCameraPosition } = useSceneStore();
  
  useFrame((state, delta) => {
    // Update FPS (smoothed)
    const currentFPS = 1 / delta;
    setFPS(Math.round(currentFPS * 0.1 + fps * 0.9));
    
    // Update camera position
    const pos = camera.position;
    setCameraPosition([
      Math.round(pos.x * 100) / 100,
      Math.round(pos.y * 100) / 100,
      Math.round(pos.z * 100) / 100
    ]);
  });
  
  return (
    <Html
      position={[0, 0, 0]}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <div className="bg-gray-900/90 text-gray-300 text-xs font-mono p-2 rounded border border-gray-700 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">FPS:</span>
            <span className={`font-bold ${fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
              {fps}
            </span>
          </div>
          <div className="border-t border-gray-700 pt-1">
            <div className="text-gray-500 text-xs mb-1">Position:</div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div>
                <span className="text-red-400">X:</span>
                <span className="ml-1">{cameraPosition[0]}</span>
              </div>
              <div>
                <span className="text-green-400">Y:</span>
                <span className="ml-1">{cameraPosition[1]}</span>
              </div>
              <div>
                <span className="text-blue-400">Z:</span>
                <span className="ml-1">{cameraPosition[2]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Html>
  );
};

export default CameraHUD;