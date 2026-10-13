import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
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
};

export default LoadingSpinner;
