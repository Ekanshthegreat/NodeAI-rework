import React from 'react';
import { LogOut, Settings, Bot, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import { supabase, isUsingMockClient } from '../../lib/supabase';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, kpi, sidebarOpen, setSidebarOpen } = useAppStore();

  const handleLogout = async () => {
    try {
      if (!isUsingMockClient) {
        await supabase.auth.signOut();
      }
      setUser(null);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const isDemoMode = user?.email === 'demo@nodeai.com' || user?.email === 'exchawla@gmail.com' || isUsingMockClient;

  // Safe KPI defaults
  const safeKpi = {
    replans_count: kpi?.replans_count ?? 0,
    interventions_avoided: kpi?.interventions_avoided ?? 0,
    mttr_ms_avg: kpi?.mttr_ms_avg ?? 5000,
  };

  return (
    <header className="bg-black border-b border-gray-300 px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-4">
            <Bot className="w-10 h-10 text-black" />
            <div>
              <h1 className="text-2xl font-bold text-black">NodeAI</h1>
              <p className="text-sm text-gray-600">Robot Mission Orchestration</p>
            </div>
          </div>

          {isDemoMode && (
            <div className="px-4 py-2 bg-black text-white text-sm font-medium rounded-full">
              Demo Mode
            </div>
          )}
        </div>

        <div className="flex items-center space-x-8">
          {/* KPI Bar - Always Visible */}
          <div className="flex items-center space-x-8 text-sm">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">
                Replans: <span className="text-black font-semibold">{safeKpi.replans_count}</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">
                Interventions Saved: <span className="text-black font-semibold">{safeKpi.interventions_avoided}</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">
                MTTR: <span className="text-black font-semibold">
                  {Math.max(1, Math.round(safeKpi.mttr_ms_avg / 1000))}s
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-black">{user?.email}</p>
              <p className="text-xs text-gray-600">Mission Control</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-3 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;