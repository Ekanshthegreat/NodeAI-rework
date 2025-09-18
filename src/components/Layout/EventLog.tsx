import React from 'react';
import { ScrollText, Circle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const EventLog: React.FC = () => {
  const { telemetryBuffer, events } = useAppStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDLE': return 'text-gray-400';
      case 'ACTIVE': return 'text-green-500';
      case 'ERROR': return 'text-red-500';
      case 'CHARGING': return 'text-yellow-500';
      case 'BLOCKED': return 'text-orange-500';
      default: return 'text-gray-400';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const recentTelemetry = telemetryBuffer.slice(-50).reverse();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded flex flex-col h-full">
      <div className="flex items-center space-x-2 p-3 border-b border-gray-800">
        <ScrollText className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Event Log</h3>
        <span className="text-xs text-gray-500 font-mono">({recentTelemetry.length})</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {recentTelemetry.map((telemetry, index) => (
          <div key={`${telemetry.robot_id}-${telemetry.ts}-${index}`} className="flex items-center space-x-2 text-xs">
            <span className="text-gray-600 font-mono text-xs">
              {formatTime(telemetry.ts)}
            </span>
            
            <Circle className={`w-1.5 h-1.5 ${getStatusColor(telemetry.status)} fill-current`} />
            
            <span className="text-blue-400 font-mono text-xs">
              {telemetry.robot_id}
            </span>
            
            <span className="text-gray-400 text-xs">
              {telemetry.status}
            </span>
            
            <span className="text-gray-500 font-mono text-xs">
              ({telemetry.pose.x.toFixed(1)}, {telemetry.pose.y.toFixed(1)})
            </span>
            
            <span className="text-gray-500 font-mono text-xs">
              {Math.round(telemetry.battery * 100)}%
            </span>
            
            {telemetry.task_id && (
              <span className="text-teal-400 text-xs font-mono">
                Task: {telemetry.task_id.slice(0, 8)}
              </span>
            )}
          </div>
        ))}
        
        {events.map((event) => (
          <div key={event.id} className="flex items-center space-x-2 text-xs">
            <span className="text-gray-600 font-mono text-xs">
              {new Date(event.ts).toLocaleTimeString()}
            </span>
            
            <Circle className="w-1.5 h-1.5 text-purple-400 fill-current" />
            
            <span className="text-purple-400 text-xs">
              {event.type}
            </span>
            
            <span className="text-gray-400 font-mono text-xs">
              Mission: {event.mission_id.slice(0, 8)}
            </span>
          </div>
        ))}
        
        {recentTelemetry.length === 0 && events.length === 0 && (
          <div className="text-center text-gray-600 py-6 text-xs">
            No events yet. Start a mission to see real-time updates.
          </div>
        )}
      </div>
    </div>
  );
};

export default EventLog;