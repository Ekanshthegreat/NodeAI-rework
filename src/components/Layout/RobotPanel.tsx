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
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-6">
          <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center">
            <Bot className="w-3 h-3 text-black" />
          </div>
          <h2 className="text-sm font-medium text-black">Fleet</h2>
          <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
            {siteRobots.length}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="w-3 h-3 bg-black rounded-full" />
          <span className="text-gray-500">{siteRobots.filter(r => r.status === 'ACTIVE').length} active</span>
        </div>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
        {siteRobots.map((robot) => (
          <button
            key={robot.id}
            onClick={() => setSelectedRobot(robot.id === selectedRobot ? null : robot.id)}
            className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
              selectedRobot === robot.id
                ? 'bg-black text-white border border-black shadow-lg'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(robot.status)}
                <span className="font-semibold font-mono text-base">{robot.id}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-mono ${
                  robot.battery > 0.6 ? 'bg-gray-100 text-black' :
                  robot.battery > 0.3 ? 'bg-gray-200 text-black' :
                  'bg-gray-300 text-black'
                }`}>
                  <Battery className="w-4 h-4" />
                  <span>{Math.round(robot.battery * 100)}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full font-semibold border ${
                  selectedRobot === robot.id ? 'bg-white text-black border-white' : 'bg-gray-100 text-black border-gray-200'
                }`}>
                  {robot.status}
                </span>
                <span className="opacity-60">{robot.vendor}</span>
              </div>
              <span className="opacity-60 font-mono">
                ({robot.pose.x.toFixed(1)}, {robot.pose.y.toFixed(1)})
              </span>
            </div>
            
            {/* Battery level bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    selectedRobot === robot.id ? 'bg-white' : 'bg-black'
                  }`}
                  style={{ width: `${robot.battery * 100}%` }}
                />
              </div>
            </div>
          </button>
        ))}
        
        {siteRobots.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-base">No robots deployed</p>
            <p className="text-sm opacity-60 mt-1">Add robots to this site</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RobotPanel;