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
    <header className="bg-white border-b border-gray-200 px-12 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-4 text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-6">
            <Bot className="w-8 h-8 text-black" />
            <div>
              <h1 className="text-xl font-semibold text-black">NodeAI</h1>
              <p className="text-xs text-gray-500 mt-1">Robot Mission Orchestration</p>
            </div>
          </div>

          {isDemoMode && (
            <div className="px-4 py-2 bg-gray-100 text-black text-xs font-medium rounded-full border border-gray-200">
              Demo Mode
            </div>
          )}
        </div>

        <div className="flex items-center space-x-12">
          {/* KPI Bar - Always Visible */}
          <div className="flex items-center space-x-10 text-xs">
            <div className="flex items-center space-x-4">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">
                Replans: <span className="text-black font-medium">{safeKpi.replans_count}</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">
                Interventions Saved: <span className="text-black font-medium">{safeKpi.interventions_avoided}</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">
                MTTR: <span className="text-black font-medium">
                  {Math.max(1, Math.round(safeKpi.mttr_ms_avg / 1000))}s
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className="text-right">
              <p className="text-xs font-medium text-black">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-1">Mission Control</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-4 text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;