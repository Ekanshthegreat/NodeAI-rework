import React from 'react';
import SitePanel from './SitePanel';
import RobotPanel from './RobotPanel';
import MissionPanel from './MissionPanel';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-96 bg-white border-r border-gray-300 flex flex-col h-full shadow-lg">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1">
          <SitePanel />
        </div>
        <div className="flex-1">
          <RobotPanel />
        </div>
        <div className="flex-1">
          <MissionPanel />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
