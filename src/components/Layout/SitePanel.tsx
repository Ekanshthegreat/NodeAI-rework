import React from 'react';
import { MapPin, Globe } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const SitePanel: React.FC = () => {
  const { sites, currentSite, setCurrentSite } = useAppStore();

  return (
    <div className="p-3 border-b border-gray-800">
      <div className="flex items-center space-x-2 mb-2">
        <Globe className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Sites</h2>
      </div>
      
      <div className="space-y-1">
        {sites.map((site) => (
          <button
            key={site.id}
            onClick={() => setCurrentSite(site.id)}
            className={`w-full text-left p-2 rounded transition-colors ${
              currentSite === site.id
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                : 'bg-gray-800 hover:bg-gray-750 text-gray-400'
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
    </div>
  );
};

export default SitePanel;