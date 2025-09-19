import React from 'react';
import { MapPin, Globe, Settings } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import MapSettingsPanel from '../MapSettings/MapSettingsPanel';

const SitePanel: React.FC = () => {
  const { sites, currentSite, setCurrentSite } = useAppStore();
  const [showMapSettings, setShowMapSettings] = React.useState(false);

  return (
    <div className="p-2 border-b border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Globe className="w-3 h-3 text-blue-400" />
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">SITES</h2>
        </div>
        {currentSite && (
          <button
            onClick={() => setShowMapSettings(true)}
            className="p-1 bg-blue-900/50 hover:bg-blue-800/50 rounded transition-colors border border-blue-700/50"
            title="Map Settings"
          >
            <Settings className="w-3 h-3 text-blue-300" />
          </button>
        )}
      </div>
      
      <div className="space-y-1">
        {sites.map((site) => (
          <button
            key={site.id}
            onClick={() => setCurrentSite(site.id)}
            className={`w-full text-left p-2 rounded transition-colors ${
              currentSite === site.id
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3 h-3" />
              <span className="text-sm font-medium">{site.name}</span>
            </div>
            <div className="text-xs opacity-60 mt-0.5 font-mono">
              ID: {site.id}
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