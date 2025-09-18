import React from 'react';
import { MapPin, Globe } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const SitePanel: React.FC = () => {
  const { sites, currentSite, setCurrentSite } = useAppStore();

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center space-x-2 mb-3">
        <Globe className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-white">Sites</h2>
      </div>
      
      <div className="space-y-2">
        {sites.map((site) => (
          <button
            key={site.id}
            onClick={() => setCurrentSite(site.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              currentSite === site.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{site.name}</span>
            </div>
            <div className="text-xs opacity-75 mt-1">
              ID: {site.id}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SitePanel;