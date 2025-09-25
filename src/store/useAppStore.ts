import { create } from 'zustand';
import type { Event, EventMessage } from '../types';

interface AppState {
  events: Event[];
  sidebarOpen: boolean;
  pushEvent: (event: EventMessage) => void;
  setSidebarOpen: (open: boolean) => void;
  clearEvents: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  events: [],
  sidebarOpen: true,
  
  pushEvent: (eventMessage: EventMessage) => {
    const event: Event = {
      id: crypto.randomUUID(),
      type: 'SYSTEM',
      payload: {
        msg: eventMessage.msg,
        level: eventMessage.level,
        ...eventMessage.payload
      },
      ts: new Date(eventMessage.ts).toISOString()
    };
    
    set((state) => ({
      events: [event, ...state.events].slice(0, 1000) // Keep last 1000 events
    }));
  },
  
  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },
  
  clearEvents: () => {
    set({ events: [] });
  }
}));