import React from 'react';
import { PlayCircle, SkipBack, SkipForward, Pause } from 'lucide-react';

const ReplayPage: React.FC = () => {
  return (
    <div className="flex-1 p-6">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Mission Replay</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-300">Replay Controls</h2>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors">
                <SkipBack className="w-4 h-4" />
                <span>Start</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors">
                <PlayCircle className="w-4 h-4" />
                <span>Play</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white transition-colors">
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors">
                <SkipForward className="w-4 h-4" />
                <span>End</span>
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Playback Speed</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value="0.5">0.5x</option>
                <option value="1" defaultValue="1">1x</option>
                <option value="2">2x</option>
                <option value="5">5x</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-300">Mission Selection</h2>
            <div className="space-y-2">
              <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-white">Warehouse Delivery #001</span>
                  <span className="text-xs text-gray-400">2 hours ago</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">Duration: 15:32</div>
              </div>
              <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-white">Inspection Route A</span>
                  <span className="text-xs text-gray-400">1 day ago</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">Duration: 8:45</div>
              </div>
              <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-white">Multi-Robot Pickup</span>
                  <span className="text-xs text-gray-400">3 days ago</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">Duration: 22:18</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Timeline</h2>
          <div className="h-64 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
            <span className="text-gray-400">Timeline visualization will appear here</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplayPage;