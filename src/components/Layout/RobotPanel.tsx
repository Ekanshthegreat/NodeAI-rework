import React from 'react';
import { Bot, Battery, Circle } from 'lucide-react';
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

  return (
    <div className="p-2 border-b border-slate-800">
      <div className="flex items-center space-x-2 mb-2">
        <Bot className="w-4 h-4 text-teal-400" />
        <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Robots ({siteRobots.length})
        </h2>
      </div>
      
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {siteRobots.map((robot) => (
          <button
            key={robot.id}
            onClick={() => setSelectedRobot(robot.id === selectedRobot ? null : robot.id)}
            className={`w-full text-left p-2 rounded transition-colors ${
              selectedRobot === robot.id
                ? 'bg-teal-900/50 text-teal-300 border border-teal-700/50'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Circle className={`w-2 h-2 ${getStatusColor(robot.status)} fill-current`} />
                <span className="text-sm font-medium font-mono">{robot.id}</span>
              </div>
              <div className="flex items-center space-x-0.5">
                <Battery className={`w-3 h-3 ${getBatteryColor(robot.battery)}`} />
                <span className="text-xs font-mono">{Math.round(robot.battery * 100)}%</span>
              </div>
            </div>
            <div className="text-xs opacity-60 mt-0.5">
              {robot.vendor} • {robot.status}
            </div>
            <div className="text-xs opacity-60 font-mono">
              ({robot.pose.x.toFixed(1)}, {robot.pose.y.toFixed(1)})
            </div>
          </button>
        ))}
        
        {siteRobots.length === 0 && (
          <div className="text-center text-slate-600 py-4 text-xs">
            No robots in this site
          </div>
        )}
      </div>
    </div>
  );
};

export default RobotPanel;