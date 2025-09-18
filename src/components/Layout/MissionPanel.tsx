import React, { useState } from 'react';
import { Target, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import MissionDialog from '../Mission/MissionDialog';

const MissionPanel: React.FC = () => {
  const { missions, currentSite, selectedMission, setSelectedMission } = useAppStore();
  const [showDialog, setShowDialog] = useState(false);

  const siteMissions = missions.filter((mission) => mission.site_id === currentSite);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'active': return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="p-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-white">
            Missions ({siteMissions.length})
          </h2>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="p-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
          title="New Mission"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>
      
      <div className="space-y-2 flex-1 overflow-y-auto">
        {siteMissions.map((mission) => (
          <button
            key={mission.id}
            onClick={() => setSelectedMission(mission.id === selectedMission ? null : mission.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedMission === mission.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(mission.status)}
                <span className="font-medium text-sm">Mission {mission.id.slice(0, 8)}</span>
              </div>
              <span className="text-xs opacity-75">
                {formatTime(mission.created_at)}
              </span>
            </div>
            <div className="text-xs opacity-75 mt-1 line-clamp-2">
              {mission.nl}
            </div>
            <div className="text-xs opacity-75 mt-1 capitalize">
              Status: {mission.status}
            </div>
          </button>
        ))}
        
        {siteMissions.length === 0 && (
          <div className="text-center text-gray-500 py-8 text-sm">
            No missions yet
          </div>
        )}
      </div>

      <MissionDialog 
        isOpen={showDialog} 
        onClose={() => setShowDialog(false)} 
      />
    </div>
  );
};

export default MissionPanel;