import React from 'react';
import { Html } from '@react-three/drei';

const LoadingSpinner: React.FC = () => {
  return (
    <Html center>
      <div className="flex items-center space-x-2 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span>Loading 3D scene...</span>
      </div>
    </Html>
  );
};

export default LoadingSpinner;