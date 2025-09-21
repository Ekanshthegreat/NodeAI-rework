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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-80' : 'w-0'}`}>
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col p-4 space-y-4">
          <main className="flex-1">
            {children}
          </main>
          
          <div className="h-56">
            <EventLog />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;