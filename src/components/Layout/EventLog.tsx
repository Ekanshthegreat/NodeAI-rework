import React from 'react';
import { GitBranch, Activity, AlertTriangle, Info, Eye } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const EventLog: React.FC = () => {
  const { telemetryBuffer, events } = useAppStore();
  const [selectedDiff, setSelectedDiff] = React.useState<any>(null);


  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const recentTelemetry = telemetryBuffer.slice(-50).reverse();

  return (
    <div className="bg-white border border-gray-300 rounded-lg flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-6">
          <div className="w-5 h-5 bg-gray-50 rounded-lg flex items-center justify-center">
            <Activity className="w-3 h-3 text-black" />
          </div>
          <h3 className="text-sm font-medium text-black">Live Events</h3>
          <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
            {recentTelemetry.length + events.length}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 bg-black rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {recentTelemetry.map((telemetry, index) => (
          <div key={`${telemetry.robot_id}-${telemetry.timestamp}-${index}`} className="flex items-center space-x-4 text-sm p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-gray-600 font-mono text-sm min-w-[70px]">
              {formatTime(telemetry.timestamp)}
            </span>
            
            <div className="w-3 h-3 rounded-full bg-black" />
            
            <span className="text-black font-mono text-sm font-semibold min-w-[70px]">
              {telemetry.robot_id}
            </span>
            
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              'bg-gray-200 text-black border border-gray-300'
            }`}>
              {telemetry.status}
            </span>
            
            <span className="text-gray-600 text-sm font-mono">
              ({telemetry.pose.x.toFixed(1)}, {telemetry.pose.y.toFixed(1)})
            </span>
            
            <span className="text-sm font-mono text-black">
              ⚡{Math.round(telemetry.battery * 100)}%
            </span>
            
            {telemetry.task_id && (
              <span className="text-black text-sm font-mono bg-gray-200 px-3 py-1 rounded-full border border-gray-300">
                {telemetry.task_id.slice(0, 8)}
              </span>
            )}
          </div>
        ))}
        
        {events.map((event) => (
          <div key={event.id} className="flex items-center space-x-4 text-sm p-3 bg-gray-100 rounded-lg border border-gray-300">
            <span className="text-gray-600 font-mono text-sm min-w-[70px]">
              {new Date(event.ts).toLocaleTimeString()}
            </span>
            
            {event.payload?.reason ? (
              <GitBranch className="w-4 h-4 text-black" />
            ) : event.type === 'system' ? (
              <AlertTriangle className="w-4 h-4 text-black" />
            ) : (
              <Info className="w-4 h-4 text-black" />
            )}
            
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              'bg-gray-200 text-black border border-gray-300'
            }`}>
              {event.payload?.reason ? 'Auto-replan' : event.type}
            </span>
            
            <div className="flex-1 text-black text-sm">
              {typeof event.payload === 'object' && event.payload?.msg ? 
                String(event.payload.msg) :
                (event as any).msg || 'System event'
              }
            </div>
            
            {Boolean(event.payload?.before && event.payload?.after) && (
              <button
                onClick={() => setSelectedDiff({ before: event.payload.before, after: event.payload.after })}
                className="flex items-center space-x-1 text-sm text-black hover:text-gray-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Diff</span>
              </button>
            )}
          </div>
        ))}
        
        {recentTelemetry.length === 0 && events.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-base">No events yet</p>
            <p className="text-sm opacity-60 mt-1">Start a mission to see live updates</p>
          </div>
        )}
      </div>
      
      {/* Diff Modal */}
      {selectedDiff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Plan Diff</h3>
              <button
                onClick={() => setSelectedDiff(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <AlertTriangle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-red-400 mb-2">Before</h4>
                <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(selectedDiff.before, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-2">After</h4>
                <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(selectedDiff.after, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventLog;