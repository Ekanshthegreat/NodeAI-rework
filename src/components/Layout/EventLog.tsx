import React from 'react';
import { ScrollText, Circle, GitBranch, Activity, AlertTriangle, Info, Zap } from 'lucide-react';
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
    <div className="bg-slate-950/95 backdrop-blur-sm border border-slate-800/50 rounded-lg flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between p-3 border-b border-slate-800/50">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-slate-700/50 rounded-lg flex items-center justify-center">
            <Activity className="w-3 h-3 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">Live Events</h3>
          <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
            {recentTelemetry.length + events.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-slate-500">Live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {recentTelemetry.map((telemetry, index) => (
          <div key={`${telemetry.robot_id}-${telemetry.ts}-${index}`} className="flex items-center space-x-3 text-xs p-2 bg-slate-800/20 rounded-lg border border-slate-800/30">
            <span className="text-slate-500 font-mono text-xs min-w-[60px]">
              {formatTime(telemetry.ts)}
            </span>
            
            <div className={`w-2 h-2 rounded-full ${getStatusColor(telemetry.status).replace('text-', 'bg-')}`} />
            
            <span className="text-blue-300 font-mono text-xs font-medium min-w-[60px]">
              {telemetry.robot_id}
            </span>
            
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              telemetry.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
              telemetry.status === 'CHARGING' ? 'bg-yellow-500/20 text-yellow-400' :
              telemetry.status === 'ERROR' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-500/20 text-slate-400'
            }`}>
              {telemetry.status}
            </span>
            
            <span className="text-slate-400 text-xs font-mono">
              ({telemetry.pose.x.toFixed(1)}, {telemetry.pose.y.toFixed(1)})
            </span>
            
            <span className={`text-xs font-mono ${
              telemetry.battery > 0.6 ? 'text-green-400' :
              telemetry.battery > 0.3 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              ⚡{Math.round(telemetry.battery * 100)}%
            </span>
            
            {telemetry.task_id && (
              <span className="text-teal-300 text-xs font-mono bg-teal-500/20 px-2 py-0.5 rounded-full">
                {telemetry.task_id.slice(0, 8)}
              </span>
            )}
          </div>
        ))}
        
        {events.map((event) => (
          <div key={event.id} className="flex items-center space-x-3 text-xs p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <span className="text-slate-500 font-mono text-xs min-w-[60px]">
              {new Date(event.ts).toLocaleTimeString()}
            </span>
            
            {event.type === 'replan_event' ? (
              <GitBranch className="w-3 h-3 text-orange-400" />
            ) : event.type === 'system' ? (
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            ) : (
              <Info className="w-3 h-3 text-blue-400" />
            )}
            
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              event.type === 'replan_event' ? 'bg-orange-500/20 text-orange-400' :
              event.type === 'system' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-purple-500/20 text-purple-400'
            }`}>
              {event.type}
            </span>
            
            {event.mission_id && (
              <span className="text-slate-300 text-xs font-mono">
                #{event.mission_id.slice(-6)}
              </span>
            )}
            
            {event.payload?.reason && (
              <span className="text-yellow-300 text-xs bg-yellow-500/20 px-2 py-0.5 rounded-full">
                {event.payload.reason}
              </span>
            )}
          </div>
        ))}
        
        {recentTelemetry.length === 0 && events.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events yet</p>
            <p className="text-xs opacity-60">Start a mission to see live updates</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventLog;