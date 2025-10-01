import React, { useEffect } from 'react';
import { Settings, Zap, AlertTriangle, Radio } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { adapters } from '../adapters';
import type { AdapterType } from '../adapters';
import toast from 'react-hot-toast';

const DevPanel: React.FC = () => {
  const {
    faultInjected,
    setFaultInjected,
    telemetryEnabled,
    setTelemetryEnabled,
    adapterType,
    setAdapter,
    setAdapterConnected,
    addEvent,
    setRobots,
    robots
  } = useAppStore();

  const handleAdapterChange = async (newType: AdapterType) => {
    const oldAdapter = adapters[adapterType];
    const newAdapter = adapters[newType];

    try {
      oldAdapter.disconnect();
      setAdapterConnected(false);

      setAdapter(newType);

      newAdapter.subscribe(
        (telemetry) => {
          setRobots(
            robots.map((r) =>
              r.id === telemetry.robot_id
                ? {
                    ...r,
                    pose: telemetry.pose,
                    battery: telemetry.battery,
                    status: telemetry.status,
                    vendor: telemetry.vendor,
                    updated_at: new Date(telemetry.ts).toISOString()
                  }
                : r
            )
          );
        },
        (event) => {
          addEvent(event);
        }
      );

      await newAdapter.connect();
      setAdapterConnected(true);

      if (newType === 'mock' && robots.length > 0) {
        const mockAdapter = adapters.mock as any;
        if (mockAdapter.startSimulation) {
          mockAdapter.startSimulation(robots.map((r) => r.id));
        }
      }

      toast.success(`Switched to ${newType.toUpperCase()} adapter`);
    } catch (error) {
      toast.error(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
      setAdapterConnected(false);
    }
  };

  useEffect(() => {
    const adapter = adapters[adapterType];
    adapter.subscribe(
      (telemetry) => {
        setRobots(
          robots.map((r) =>
            r.id === telemetry.robot_id
              ? {
                  ...r,
                  pose: telemetry.pose,
                  battery: telemetry.battery,
                  status: telemetry.status,
                  vendor: telemetry.vendor,
                  updated_at: new Date(telemetry.ts).toISOString()
                }
              : r
          )
        );
      },
      (event) => {
        addEvent(event);
      }
    );

    adapter.connect().then(() => setAdapterConnected(true)).catch(() => setAdapterConnected(false));

    return () => {
      adapter.disconnect();
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Development Panel</h3>
      </div>

      <div className="space-y-4">
        {/* Adapter Selection */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Telemetry Adapter</span>
          </div>
          <select
            value={adapterType}
            onChange={(e) => handleAdapterChange(e.target.value as AdapterType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="mock">Mock (Simulation)</option>
            <option value="ros">ROS2 (WebSocket)</option>
            <option value="rmf">Open-RMF</option>
            <option value="vda5050">VDA 5050</option>
          </select>
        </div>

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