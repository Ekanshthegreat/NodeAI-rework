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
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center space-x-2 mb-3">
        <Bot className="w-5 h-5 text-teal-500" />
        <h2 className="text-lg font-semibold text-white">
          Robots ({siteRobots.length})
        </h2>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {siteRobots.map((robot) => (
          <button
            key={robot.id}
            onClick={() => setSelectedRobot(robot.id === selectedRobot ? null : robot.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedRobot === robot.id
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Circle className={`w-3 h-3 ${getStatusColor(robot.status)} fill-current`} />
                <span className="font-medium">{robot.id}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Battery className={`w-4 h-4 ${getBatteryColor(robot.battery)}`} />
                <span className="text-xs">{Math.round(robot.battery * 100)}%</span>
              </div>
            </div>
            <div className="text-xs opacity-75 mt-1">
              {robot.vendor} • {robot.status}
            </div>
            <div className="text-xs opacity-75">
              ({robot.pose.x.toFixed(1)}, {robot.pose.y.toFixed(1)})
            </div>
          </button>
        ))}
        
        {siteRobots.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No robots in this site
          </div>
        )}
      </div>
    </div>
  );
};

export default RobotPanel;