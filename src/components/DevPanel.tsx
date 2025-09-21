import React, { useState } from 'react';
import { Settings, Zap, Battery, Square, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';
import { usePolicyStore } from '../store/usePolicyStore';

const DevPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedRobot, robots, setRobots, addEvent } = useAppStore();
  const { 
    selfHealingEnabled, 
    setSelfHealingEnabled, 
    injectFault, 
    clearFault,
    getFault 
  } = usePolicyStore();

  // Only show in development with feature flag
  if (import.meta.env.VITE_SHOW_DEV_PANEL !== 'true') {
    return null;
  }

  const selectedRobotData = robots.find(r => r.id === selectedRobot);
  const hasFault = selectedRobot ? getFault(selectedRobot) : null;

  const handleInjectBlocked = () => {
    if (!selectedRobot) {
      toast.error('Please select a robot first');
      return;
    }

    injectFault(selectedRobot, 'BLOCKED', 10000); // 10 seconds
    
    // Update robot status
    setRobots(robots.map(robot => 
      robot.id === selectedRobot 
        ? { ...robot, status: 'BLOCKED' }
        : robot
    ));

    addEvent({
      id: `event-${Date.now()}`,
      mission_id: null,
      robot_id: selectedRobot,
      type: 'system',
      payload: { action: 'fault_injected', fault_type: 'BLOCKED', duration: 10 },
      ts: new Date().toISOString(),
    });

    toast.success(`Injected BLOCKED fault on ${selectedRobot} for 10s`);

    // Auto-clear after duration
    setTimeout(() => {
      clearFault(selectedRobot);
      setRobots(robots.map(robot => 
        robot.id === selectedRobot 
          ? { ...robot, status: 'IDLE' }
          : robot
      ));
    }, 10000);
  };

  const handleDrainBattery = () => {
    if (!selectedRobot) {
      toast.error('Please select a robot first');
      return;
    }

    injectFault(selectedRobot, 'LOW_BATTERY', 30000); // 30 seconds
    
    // Update robot battery
    setRobots(robots.map(robot => 
      robot.id === selectedRobot 
        ? { ...robot, battery: 0.15 }
        : robot
    ));

    addEvent({
      id: `event-${Date.now()}`,
      mission_id: null,
      robot_id: selectedRobot,
      type: 'system',
      payload: { action: 'fault_injected', fault_type: 'LOW_BATTERY', battery: 0.15 },
      ts: new Date().toISOString(),
    });

    toast.success(`Drained battery on ${selectedRobot} to 15%`);

    // Auto-restore after duration
    setTimeout(() => {
      clearFault(selectedRobot);
      setRobots(robots.map(robot => 
        robot.id === selectedRobot 
          ? { ...robot, battery: 0.9 }
          : robot
      ));
    }, 30000);
  };

  const handleEmitTestEvent = () => {
    addEvent({
      id: `event-${Date.now()}`,
      mission_id: null,
      robot_id: null,
      type: 'system',
      payload: { action: 'test_event' },
      ts: new Date().toISOString(),
    });
    toast.success('Test event emitted');
  };

  const handleResetData = async () => {
    try {
      // This would clear and reseed data in a real implementation
      toast.success('Data reset (mock)');
      
      addEvent({
        id: `event-${Date.now()}`,
        mission_id: null,
        robot_id: null,
        type: 'system',
        payload: { action: 'data_reset' },
        ts: new Date().toISOString(),
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
                <span className="text-slate-300">Self-Healing</span>
                <button
                  onClick={() => setSelfHealingEnabled(!selfHealingEnabled)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selfHealingEnabled
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {selfHealingEnabled ? 'ON' : 'OFF'}
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
                    Fault: {hasFault.type}
                  </div>
                )}
              </div>

              {/* Fault injection buttons */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Fault Injection</h3>
                
                <button
                  onClick={handleInjectBlocked}
                  disabled={!selectedRobot || hasFault?.type === 'BLOCKED'}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-500 disabled:opacity-50 text-white rounded transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>Inject BLOCKED (10s)</span>
                </button>

                <button
                  onClick={handleDrainBattery}
                  disabled={!selectedRobot || hasFault?.type === 'LOW_BATTERY'}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-500 disabled:opacity-50 text-white rounded transition-colors"
                >
                  <Battery className="w-4 h-4" />
                  <span>Drain Battery to 15%</span>
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevPanel;