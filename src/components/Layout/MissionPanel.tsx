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
    <div className="p-2 flex flex-col min-h-0 border-b border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-orange-400" />
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Missions ({siteMissions.length})
          </h2>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="p-1 bg-orange-900/50 hover:bg-orange-800/50 rounded transition-colors border border-orange-700/50"
          title="New Mission"
        >
          <Plus className="w-3 h-3 text-orange-300" />
        </button>
      </div>
      
      <div className="space-y-1 flex-1 overflow-y-auto">
        {siteMissions.map((mission) => (
          <button
            key={mission.id}
            onClick={() => setSelectedMission(mission.id === selectedMission ? null : mission.id)}
            className={`w-full text-left p-2 rounded transition-colors ${
              selectedMission === mission.id
                ? 'bg-orange-900/50 text-orange-300 border border-orange-700/50'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                {getStatusIcon(mission.status)}
                <span className="font-medium text-xs font-mono">Mission {mission.id.slice(0, 8)}</span>
              </div>
              <span className="text-xs opacity-60">
                {formatTime(mission.created_at)}
              </span>
            </div>
            <div className="text-xs opacity-75 mt-0.5 line-clamp-2">
              {mission.nl}
            </div>
            <div className="text-xs opacity-60 mt-0.5 capitalize">
              Status: {mission.status}
            </div>
          </button>
        ))}
        
        {siteMissions.length === 0 && (
          <div className="text-center text-slate-600 py-4 text-xs">
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