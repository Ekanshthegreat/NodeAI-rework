import React, { useState } from 'react';
import { Target, Plus, Clock, CheckCircle, AlertCircle, Play, Pause, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { usePolicyStore } from '../../store/usePolicyStore';
import MissionDialog from '../Mission/MissionDialog';

const MissionPanel: React.FC = () => {
  const { missions, currentSite, selectedMission, setSelectedMission } = useAppStore();
  const { getReplanCount } = usePolicyStore();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'planning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
          <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <Target className="w-3 h-3 text-orange-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-300">Missions</h2>
          <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
            {siteMissions.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs">
            <div className="w-2 h-2 bg-blue-400 rounded-full" />
            <span className="text-slate-400">{siteMissions.filter(m => m.status === 'active').length} active</span>
          </div>
          <button
            onClick={() => setShowDialog(true)}
            className="p-1.5 bg-orange-900/30 hover:bg-orange-800/40 rounded-lg transition-all duration-200 border border-orange-700/30 hover:border-orange-600/50"
            title="New Mission"
          >
            <Plus className="w-3.5 h-3.5 text-orange-300" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
        {siteMissions.map((mission) => (
          <button
            key={mission.id}
            onClick={() => setSelectedMission(mission.id === selectedMission ? null : mission.id)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
              selectedMission === mission.id
                ? 'bg-gradient-to-r from-orange-900/40 to-orange-800/30 text-orange-200 border border-orange-700/50 shadow-lg'
                : 'bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 hover:text-slate-300 border border-transparent hover:border-slate-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(mission.status)}
                <span className="font-medium text-sm font-mono">#{mission.id.slice(-6)}</span>
              </div>
              <span className="text-xs text-slate-500">
                {formatTime(mission.created_at)}
              </span>
            </div>
            <div className="text-sm mb-2 line-clamp-2 leading-relaxed">
              {mission.nl}
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(mission.status)}`}>
                {mission.status.toUpperCase()}
              </span>
              {getReplanCount(mission.id) > 0 && (
                <div className="flex items-center space-x-1 text-xs text-blue-400">
                  <RotateCcw className="w-3 h-3" />
                  <span>{getReplanCount(mission.id)}x</span>
                </div>
              )}
            </div>
          </button>
        ))}
        
        {siteMissions.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active missions</p>
            <p className="text-xs opacity-60">Create your first mission</p>
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