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
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-gray-800 rounded transition-colors"
        >
          <Menu className="w-4 h-4 text-gray-400" />
        </button>
        
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-blue-400" />
          <h1 className="text-lg font-semibold text-white tracking-tight">NodeAI</h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500 font-mono">
            {isRealtimeConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {!isReplayPage && (
          <button
            onClick={() => navigate('/app/replay')}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 text-xs transition-colors"
          >
            <Play className="w-3 h-3" />
            <span>Replay</span>
          </button>
        )}

        {isReplayPage && (
          <button
            onClick={() => navigate('/app')}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 text-xs transition-colors"
          >
            <Bot className="w-3 h-3" />
            <span>Live</span>
          </button>
        )}

        <div className="flex items-center space-x-2 text-gray-400">
          <span className="text-xs font-mono">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors"
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