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
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-300" />
        </button>
        
        <div className="flex items-center space-x-2">
          <Bot className="w-8 h-8 text-blue-500" />
          <h1 className="text-xl font-bold text-white">NodeAI</h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {isRealtimeConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {!isReplayPage && (
          <button
            onClick={() => navigate('/app/replay')}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Replay</span>
          </button>
        )}

        {isReplayPage && (
          <button
            onClick={() => navigate('/app')}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span>Live</span>
          </button>
        )}

        <div className="flex items-center space-x-2 text-gray-300">
          <span className="text-sm">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;