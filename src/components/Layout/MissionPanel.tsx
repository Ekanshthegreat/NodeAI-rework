import React, { useState } from 'react';
import { Target, Plus, Clock, CheckCircle, AlertCircle, Play, Pause, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import MissionDialog from '../Mission/MissionDialog';

const MissionPanel: React.FC = () => {
  const { missions, currentSite, selectedMission, setSelectedMission, kpi } = useAppStore();
  const [showDialog, setShowDialog] = useState(false);

  const siteMissions = missions.filter((mission) => mission.site_id === currentSite);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'active': return <Play className="w-3 h-3 text-blue-500" />;
      case 'planning': return <Clock className="w-3 h-3 text-yellow-500" />;
      default: return <Pause className="w-3 h-3 text-gray-400" />;
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
    <div className="p-6 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-6">
          <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center">
            <Target className="w-3 h-3 text-black" />
          </div>
          <h2 className="text-sm font-medium text-black">Missions</h2>
          <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
            {siteMissions.length}
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 text-xs">
            <div className="w-3 h-3 bg-black rounded-full" />
            <span className="text-gray-500">{siteMissions.filter(m => m.status === 'active').length} active</span>
          </div>
          <button
            onClick={() => setShowDialog(true)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 border border-gray-300"
            title="New Mission"
          >
            <Plus className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        {siteMissions.map((mission) => (
          <button
            key={mission.id}
            onClick={() => setSelectedMission(mission.id === selectedMission ? null : mission.id)}
            className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
              selectedMission === mission.id
                ? 'bg-black text-white border border-black shadow-lg'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(mission.status)}
                <span className="font-semibold text-base font-mono">#{mission.id.slice(-6)}</span>
              </div>
              <span className="text-sm opacity-60">
                {formatTime(mission.created_at)}
              </span>
            </div>
            <div className="text-base mb-3 line-clamp-2 leading-relaxed">
              {mission.nl}
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                selectedMission === mission.id ? 'bg-white text-black border-white' : 'bg-gray-100 text-black border-gray-200'
              }`}>
                {mission.status.toUpperCase()}
              </span>
              {kpi.replans_count > 0 && (
                <div className={`flex items-center space-x-2 text-sm ${
                  selectedMission === mission.id ? 'text-white' : 'text-black'
                }`}>
                  <RotateCcw className="w-4 h-4" />
                  <span>Replanned</span>
                </div>
              )}
            </div>
          </button>
        ))}
        
        {siteMissions.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-base">No active missions</p>
            <p className="text-sm opacity-60 mt-1">Create your first mission</p>
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