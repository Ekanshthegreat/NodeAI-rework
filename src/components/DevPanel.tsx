import React, { useState } from 'react';
import { Settings, Zap, Battery, Square, RotateCcw, AlertTriangle, Shield, ShieldOff, Gauge } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';
import { useSceneStore } from '../store/useSceneStore';

const DevPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    selectedRobot, 
    robots, 
    policy, 
    setPolicy, 
    faultInjected, 
    setFault, 
    pushEvent 
  } = useAppStore();
  const { pathSpeed, setPathSpeed } = useSceneStore();

  // Only show in development with feature flag
  if (import.meta.env.VITE_SHOW_DEV_PANEL !== 'true') {
    return null;
  }

  const selectedRobotData = robots.find(r => r.id === selectedRobot);
  const hasFault = selectedRobot ? faultInjected[selectedRobot] : null;

  const handleInjectBlocked = () => {
    if (!selectedRobot) {
      toast.error('Please select a robot first');
      return;
    }

    const now = Date.now();
    setFault(selectedRobot, { blockedUntil: now + 10000 }); // 10 seconds

    pushEvent({
      ts: now,
      level: 'WARN',
      msg: `Fault injected: BLOCKED on ${selectedRobot} for 10s`,
      payload: { action: 'fault_injected', fault_type: 'BLOCKED', robot_id: selectedRobot, duration: 10 },
    });

    toast.success(`Injected BLOCKED fault on ${selectedRobot} for 10s`);
  };

  const handleDrainBattery = () => {
    if (!selectedRobot) {
      toast.error('Please select a robot first');
      return;
    }

    const now = Date.now();
    setFault(selectedRobot, { drained: true });

    pushEvent({
      ts: now,
      level: 'WARN',
      msg: `Fault injected: LOW_BATTERY on ${selectedRobot} (15%)`,
      payload: { action: 'fault_injected', fault_type: 'LOW_BATTERY', robot_id: selectedRobot, battery: 0.15 },
    });

    toast.success(`Drained battery on ${selectedRobot} to 15%`);
  };

  const handleEmitTestEvent = () => {
    pushEvent({
      ts: Date.now(),
      level: 'INFO',
      msg: 'Test event emitted from Dev Panel',
      payload: { action: 'test_event' },
    });
    toast.success('Test event emitted');
  };

  const handleResetData = async () => {
    try {
      // This would clear and reseed data in a real implementation
      toast.success('Data reset (mock)');
      
      pushEvent({
        ts: Date.now(),
        level: 'INFO',
        msg: 'Data reset completed',
        payload: { action: 'data_reset' },
      });
    } catch (error) {
      toast.error('Failed to reset data');
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors z-50"
        title="Dev Panel"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Panel modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Dev Panel</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 rounded transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Self-healing toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {policy.selfHealEnabled ? (
                    <Shield className="w-4 h-4 text-green-400" />
                  ) : (
                    <ShieldOff className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-slate-300">Self-Healing</span>
                </div>
                <button
                  onClick={() => setPolicy({ selfHealEnabled: !policy.selfHealEnabled })}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    policy.selfHealEnabled
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {policy.selfHealEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Selected robot info */}
              <div className="p-3 bg-slate-800 rounded border border-slate-600">
                <div className="text-sm text-slate-400 mb-1">Selected Robot:</div>
                <div className="text-white font-mono">
                  {selectedRobot || 'None'}
                  {selectedRobotData && (
                    <span className="text-slate-400 ml-2">
                      ({Math.round(selectedRobotData.battery * 100)}%, {selectedRobotData.status})
                    </span>
                  )}
                </div>
                {hasFault && (
                  <div className="text-orange-400 text-sm mt-1 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Fault: {hasFault.blockedUntil ? 'BLOCKED' : hasFault.drained ? 'LOW_BATTERY' : 'None'}
                  </div>
                )}
              </div>

              {/* Fault injection buttons */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Fault Injection</h3>
                
                <button
                  onClick={handleInjectBlocked}
                  disabled={!selectedRobot || !!hasFault?.blockedUntil}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-500 disabled:opacity-50 text-white rounded transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>Inject BLOCKED (10s)</span>
                </button>

                <button
                  onClick={handleDrainBattery}
                  disabled={!selectedRobot || !!hasFault?.drained}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-500 disabled:opacity-50 text-white rounded transition-colors"
                >
                  <Battery className="w-4 h-4" />
                  <span>Drain Battery (15%)</span>
                </button>
              </div>

              {/* Utility buttons */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Utilities</h3>
                
                <button
                  onClick={handleEmitTestEvent}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>Emit Test Event</span>
                </button>

                <button
                  onClick={handleResetData}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Seed Data</span>
                </button>
              </div>
              
              {/* Path Speed Control */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Path Speed</h3>
                
                <div className="space-y-2">
                  <label className="block text-xs text-slate-400">
                    Speed: {pathSpeed.toFixed(1)} m/s
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="1.2"
                    step="0.1"
                    value={pathSpeed}
                    onChange={(e) => setPathSpeed(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Policy Configuration */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Policy Settings</h3>
                
                <div className="space-y-2">
                  <label className="block text-xs text-slate-400">
                    Min Battery Threshold: {Math.round(policy.defaultMinBatteryPct * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.5"
                    step="0.05"
                    value={policy.defaultMinBatteryPct}
                    onChange={(e) => setPolicy({ defaultMinBatteryPct: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs text-slate-400">
                    Blocked Timeout: {policy.defaultBlockedSeconds}s
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={policy.defaultBlockedSeconds}
                    onChange={(e) => setPolicy({ defaultBlockedSeconds: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevPanel;