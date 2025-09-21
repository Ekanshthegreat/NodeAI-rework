import React from 'react';
import { MapPin, Globe, Settings, Building2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import MapSettingsPanel from '../MapSettings/MapSettingsPanel';

const SitePanel: React.FC = () => {
  const { sites, currentSite, setCurrentSite } = useAppStore();
  const [showMapSettings, setShowMapSettings] = React.useState(false);

  return (
    <div className="p-4 border-b border-slate-800/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Building2 className="w-3 h-3 text-blue-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-300">Sites</h2>
          <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
            {sites.length}
          </span>
        </div>
        {currentSite && (
          <button
            onClick={() => setShowMapSettings(true)}
            className="p-1.5 bg-blue-900/30 hover:bg-blue-800/40 rounded-lg transition-all duration-200 border border-blue-700/30 hover:border-blue-600/50"
            title="Map Settings"
          >
            <Settings className="w-3.5 h-3.5 text-blue-300" />
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {sites.map((site) => (
          <button
            key={site.id}
            onClick={() => setCurrentSite(site.id)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
              currentSite === site.id
                ? 'bg-gradient-to-r from-blue-900/40 to-blue-800/30 text-blue-200 border border-blue-700/50 shadow-lg'
                : 'bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 hover:text-slate-300 border border-transparent hover:border-slate-700/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                currentSite === site.id ? 'bg-blue-400' : 'bg-slate-600'
              }`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{site.name}</div>
                <div className="text-xs opacity-60 font-mono mt-0.5">
                  {site.id}
                </div>
              </div>
              <MapPin className="w-4 h-4 opacity-40" />
            </div>
          </button>
        ))}
      </div>
      
      <MapSettingsPanel 
        isOpen={showMapSettings} 
        onClose={() => setShowMapSettings(false)} 
      />
    </div>
  );
};

export default SitePanel;