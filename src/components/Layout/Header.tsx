import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, Menu, LogOut, Play, Wifi, WifiOff, Activity, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, toggleSidebar, isRealtimeConnected, robots, missions, kpi } = useAppStore();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const isReplayPage = location.pathname === '/app/replay';
  const activeRobots = robots.filter(r => r.status === 'ACTIVE').length;
  const activeMissions = missions.filter(m => m.status === 'active').length;
  const errorRobots = robots.filter(r => r.status === 'ERROR').length;

  return (
    <header className="bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/50 px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-800/50 rounded-lg transition-all duration-200 hover:scale-105"
        >
          <Menu className="w-4 h-4 text-slate-400" />
        </button>
        
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">NodeAI</h1>
            <p className="text-xs text-slate-400 -mt-1">Mission Control</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* KPI Strip */}
        <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-400">
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Replans:</span>
            <span className="text-slate-300 font-mono">{kpi.replans_count}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Interventions:</span>
            <span className="text-green-400 font-mono">{kpi.interventions_avoided}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">MTTR:</span>
            <span className="text-blue-400 font-mono">{Math.round(kpi.mttr_ms_avg / 1000)}s</span>
          </div>
        </div>
        
        {/* System Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
            {isRealtimeConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs font-medium text-slate-300">
              {isRealtimeConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1">
              <Activity className="w-3 h-3 text-green-400" />
              <span className="text-slate-300 font-mono">{activeRobots}</span>
              <span className="text-slate-500">active</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <span className="text-slate-300 font-mono">{activeMissions}</span>
              <span className="text-slate-500">missions</span>
            </div>
            {errorRobots > 0 && (
              <div className="flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-red-300 font-mono">{errorRobots}</span>
                <span className="text-slate-500">errors</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {!isReplayPage && (
          <button
            onClick={() => navigate('/app/replay')}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-300 text-sm transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50"
          >
            <Play className="w-4 h-4" />
            <span>Replay</span>
          </button>
        )}

        {isReplayPage && (
          <button
            onClick={() => navigate('/app')}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-300 text-sm transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50"
          >
            <Bot className="w-4 h-4" />
            <span>Live</span>
          </button>
        )}

        {/* User Menu */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-300">{user?.email?.split('@')[0]}</div>
            <div className="text-xs text-slate-500">Administrator</div>
          </div>
          <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all duration-200 hover:scale-105"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-slate-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;