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
    <div className="bg-gray-800 border border-gray-700 rounded-lg flex flex-col h-full">
      <div className="flex items-center space-x-2 p-4 border-b border-gray-700">
        <ScrollText className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-white">Event Log</h3>
        <span className="text-sm text-gray-400">({recentTelemetry.length} entries)</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {recentTelemetry.map((telemetry, index) => (
          <div key={`${telemetry.robot_id}-${telemetry.ts}-${index}`} className="flex items-center space-x-3 text-sm">
            <span className="text-gray-500 font-mono">
              {formatTime(telemetry.ts)}
            </span>
            
            <Circle className={`w-2 h-2 ${getStatusColor(telemetry.status)} fill-current`} />
            
            <span className="text-blue-400 font-medium">
              {telemetry.robot_id}
            </span>
            
            <span className="text-gray-300">
              {telemetry.status}
            </span>
            
            <span className="text-gray-500">
              ({telemetry.pose.x.toFixed(1)}, {telemetry.pose.y.toFixed(1)})
            </span>
            
            <span className="text-gray-500">
              {Math.round(telemetry.battery * 100)}%
            </span>
            
            {telemetry.task_id && (
              <span className="text-teal-400 text-xs">
                Task: {telemetry.task_id.slice(0, 8)}
              </span>
            )}
          </div>
        ))}
        
        {events.map((event) => (
          <div key={event.id} className="flex items-center space-x-3 text-sm">
            <span className="text-gray-500 font-mono">
              {new Date(event.ts).toLocaleTimeString()}
            </span>
            
            <Circle className="w-2 h-2 text-purple-500 fill-current" />
            
            <span className="text-purple-400 font-medium">
              {event.type}
            </span>
            
            <span className="text-gray-300">
              Mission: {event.mission_id.slice(0, 8)}
            </span>
          </div>
        ))}
        
        {recentTelemetry.length === 0 && events.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No events yet. Start a mission to see real-time updates.
          </div>
        )}
      </div>
    </div>
  );
};

export default EventLog;