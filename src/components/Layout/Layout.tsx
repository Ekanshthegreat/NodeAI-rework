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
    <div className="h-screen flex flex-col bg-slate-950">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-0'}`}>
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col p-3 space-y-3">
          <main className="flex-1">
            {children}
          </main>
          
          <div className="h-48">
            <EventLog />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;