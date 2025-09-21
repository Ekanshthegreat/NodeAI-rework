import React from 'react';
import { Bot, Battery, Circle, Zap, AlertTriangle, Plug } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const RobotPanel: React.FC = () => {
  const { robots, currentSite, selectedRobot, setSelectedRobot } = useAppStore();

  const siteRobots = robots.filter((robot) => robot.site_id === currentSite);

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

  const getBatteryColor = (battery: number) => {
    if (battery > 0.6) return 'text-green-500';
    if (battery > 0.3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Zap className="w-3 h-3 text-green-500" />;
      case 'CHARGING': return <Plug className="w-3 h-3 text-yellow-500" />;
      case 'ERROR': return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'BLOCKED': return <AlertTriangle className="w-3 h-3 text-orange-500" />;
      default: return <Circle className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="p-4 border-b border-slate-800/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-teal-500/20 rounded-lg flex items-center justify-center">
            <Bot className="w-3 h-3 text-teal-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-300">Fleet</h2>
          <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
            {siteRobots.length}
          </span>
        </div>
        <div className="flex items-center space-x-1 text-xs">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-slate-400">{siteRobots.filter(r => r.status === 'ACTIVE').length} active</span>
        </div>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
        {siteRobots.map((robot) => (
          <button
            key={robot.id}
            onClick={() => setSelectedRobot(robot.id === selectedRobot ? null : robot.id)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
              selectedRobot === robot.id
                ? 'bg-gradient-to-r from-teal-900/40 to-teal-800/30 text-teal-200 border border-teal-700/50 shadow-lg'
                : 'bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 hover:text-slate-300 border border-transparent hover:border-slate-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(robot.status)}
                <span className="font-medium font-mono text-sm">{robot.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-mono ${
                  robot.battery > 0.6 ? 'bg-green-500/20 text-green-400' :
                  robot.battery > 0.3 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  <Battery className="w-3 h-3" />
                  <span>{Math.round(robot.battery * 100)}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(robot.status)} bg-current bg-opacity-20`}>
                  {robot.status}
                </span>
                <span className="text-slate-500">{robot.vendor}</span>
              </div>
              <span className="text-slate-500 font-mono">
                ({robot.pose.x.toFixed(1)}, {robot.pose.y.toFixed(1)})
              </span>
            </div>
            
            {/* Battery level bar */}
            <div className="mt-2">
              <div className="w-full bg-slate-700/50 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    robot.battery > 0.6 ? 'bg-green-400' :
                    robot.battery > 0.3 ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}
                  style={{ width: `${robot.battery * 100}%` }}
                />
              </div>
            </div>
          </button>
        ))}
        
        {siteRobots.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No robots deployed</p>
            <p className="text-xs opacity-60">Add robots to this site</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RobotPanel;