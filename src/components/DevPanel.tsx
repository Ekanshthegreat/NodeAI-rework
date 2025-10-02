import React, { useEffect } from 'react';
import { Settings, Zap, AlertTriangle, Radio, Activity } from 'lucide-react';
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
    adapterConnectionStatus,
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

  const handlePing = async () => {
    addEvent({
      ts: Date.now(),
      level: 'INFO',
      msg: `[PING] Testing ${adapterType.toUpperCase()} adapter...`,
      payload: { adapter: adapterType }
    });

    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (adapterConnectionStatus[adapterType]) {
            resolve('Adapter is connected');
          } else {
            reject(new Error('Adapter not connected'));
          }
        }, 500);
      }),
      {
        loading: 'Pinging adapter...',
        success: `${adapterType.toUpperCase()} adapter is alive`,
        error: `${adapterType.toUpperCase()} adapter not responding`
      }
    );
  };

  const handlePublishSampleOrder = async () => {
    if (adapterType !== 'vda5050') {
      toast.error('Sample order only available for VDA-5050 adapter');
      return;
    }

    const sampleMission = {
      mission_id: 'test-' + Date.now(),
      site_id: 'test-site',
      natural_language: 'Test navigation mission',
      constraints: {
        priority: 'normal' as const,
        no_go: [],
        time_window_start: null,
        time_window_end: null,
        min_battery_pct: 0.2
      },
      subtasks: [{
        id: 'nav-1',
        verb: 'navigate' as const,
        args: {
          from: null,
          to: 'test-location',
          item: null,
          room: null,
          zone: null,
          dock: null
        },
        policy: {
          reassign_on_blocked_s: 30,
          retry_limit: 3
        }
      }],
      robot_selection: {
        strategy: 'auto' as const,
        allow_vendors: ['vda5050'],
        include: [],
        exclude: []
      }
    };

    try {
      const adapter = adapters.vda5050;
      await adapter.sendMission(sampleMission);
      toast.success('Sample VDA-5050 order published');
    } catch (error) {
      toast.error(`Failed to publish: ${error instanceof Error ? error.message : String(error)}`);
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

  const adapterOptions: Array<{ value: AdapterType; label: string }> = [
    { value: 'mock', label: 'Mock' },
    { value: 'ros', label: 'ROS2' },
    { value: 'rmf', label: 'RMF' },
    { value: 'vda5050', label: 'VDA-5050' }
  ];

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
            {adapterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {adapterConnectionStatus[opt.value] ? '•' : '○'}
              </option>
            ))}
          </select>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-50 rounded p-3 space-y-2">
          <div className="text-xs font-medium text-gray-600 mb-2">Connection Status</div>
          {adapterOptions.map(opt => (
            <div key={opt.value} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{opt.label}</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${adapterConnectionStatus[opt.value] ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={adapterConnectionStatus[opt.value] ? 'text-green-600' : 'text-gray-400'}>
                  {adapterConnectionStatus[opt.value] ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Adapter Actions */}
        <div className="flex gap-2">
          <button
            onClick={handlePing}
            className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Activity className="w-3 h-3" />
            Ping Adapter
          </button>
          {adapterType === 'vda5050' && (
            <button
              onClick={handlePublishSampleOrder}
              className="flex-1 px-3 py-2 text-xs font-medium text-green-600 border border-green-300 rounded hover:bg-green-50 transition-colors"
            >
              Sample Order
            </button>
          )}
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
