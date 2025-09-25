import React from 'react';
import { Settings, Zap, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const DevPanel: React.FC = () => {
  const { faultInjected, setFaultInjected, telemetryEnabled, setTelemetryEnabled } = useAppStore();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Development Panel</h3>
      </div>
      
      <div className="space-y-4">
        {/* Telemetry Control */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Telemetry</span>
          </div>
          <button
            onClick={() => setTelemetryEnabled(!telemetryEnabled)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              telemetryEnabled
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {telemetryEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Fault Injection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Fault Injection</span>
          </div>
          <button
            onClick={() => setFaultInjected(!faultInjected)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              faultInjected
                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {faultInjected ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevPanel;