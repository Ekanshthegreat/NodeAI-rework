import React from 'react';
import { Html } from '@react-three/drei';

const LoadingSpinner: React.FC = () => {
  return (
    <Html center>
      <div className="flex items-center space-x-2 text-gray-400">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
        <span className="text-sm font-mono">Initializing...</span>
      </div>
    </Html>
  );
};

export default LoadingSpinner;