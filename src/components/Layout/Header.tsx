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
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-white">NodeAI</h1>
              <p className="text-sm text-slate-400">Robot Mission Orchestration</p>
            </div>
          </div>

          {isDemoMode && (
            <div className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
              Demo Mode
            </div>
          )}
        </div>

        <div className="flex items-center space-x-6">
          {/* KPI Bar - Always Visible */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">
                Replans: <span className="text-white font-medium">{safeKpi.replans_count}</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-slate-300">
                Interventions Saved: <span className="text-white font-medium">{safeKpi.interventions_avoided}</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-300">
                MTTR: <span className="text-white font-medium">
                  {Math.max(1, Math.round(safeKpi.mttr_ms_avg / 1000))}s
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="text-xs text-slate-400">Mission Control</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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