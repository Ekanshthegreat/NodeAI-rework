import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, Menu, LogOut, Play } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, toggleSidebar, isRealtimeConnected } = useAppStore();

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

  return (
    <header className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
        >
          <Menu className="w-3 h-3 text-slate-500" />
        </button>
        
        <div className="flex items-center space-x-2">
          <img src="/nodeai-logo.svg" alt="NodeAI" className="w-5 h-5" />
          <h1 className="text-sm font-semibold text-white tracking-tight">NodeAI</h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <div className={`w-1 h-1 rounded-full ${isRealtimeConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-600 font-mono">
            {isRealtimeConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {!isReplayPage && (
          <button
            onClick={() => navigate('/app/replay')}
            className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-500 text-xs transition-colors font-mono"
          >
            <Play className="w-3 h-3" />
            <span>Replay</span>
          </button>
        )}

        {isReplayPage && (
          <button
            onClick={() => navigate('/app')}
            className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-500 text-xs transition-colors font-mono"
          >
            <Bot className="w-3 h-3" />
            <span>Live</span>
          </button>
        )}

        <div className="flex items-center space-x-2 text-slate-500">
          <span className="text-xs font-mono">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title="Logout"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;