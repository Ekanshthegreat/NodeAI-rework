import React from 'react';
import { MapPin, Globe, Settings, Building2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import MapSettingsPanel from '../MapSettings/MapSettingsPanel';

const SitePanel: React.FC = () => {
  const { sites, currentSite, setCurrentSite } = useAppStore();
  const [showMapSettings, setShowMapSettings] = React.useState(false);

  return (
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-6">
          <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-3 h-3 text-black" />
          </div>
          <h2 className="text-sm font-medium text-black">Sites</h2>
          <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
            {sites.length}
          </span>
        </div>
        {currentSite && (
          <button
            onClick={() => setShowMapSettings(true)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 border border-gray-300"
            title="Map Settings"
          >
            <Settings className="w-4 h-4 text-black" />
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {sites.map((site) => (
          <button
            key={site.id}
            onClick={() => setCurrentSite(site.id)}
            className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
              currentSite === site.id
                ? 'bg-black text-white border border-black shadow-lg'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-2 h-2 rounded-full ${
                currentSite === site.id ? 'bg-white' : 'bg-gray-400'
              }`} />
              <div className="flex-1">
                <div className="font-semibold text-base">{site.name}</div>
                <div className="text-sm opacity-60 font-mono mt-1">
                  {site.id}
                </div>
              </div>
              <MapPin className="w-5 h-5 opacity-40" />
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