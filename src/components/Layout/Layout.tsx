import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EventLog from './EventLog';
import { useAppStore } from '../../store/useAppStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`transition-all duration-300 ${sidebarOpen ? 'w-80' : 'w-0'}`}>
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col p-4 space-y-4">
          <main className="flex-1">
            {children}
          </main>
          
          <div className="h-64">
            <EventLog />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;