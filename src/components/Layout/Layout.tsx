import { useEffect, type ReactNode } from 'react';
import Header from './Header';
import { useFleetStore } from '../../store/useFleetStore';
export default function Layout({ children }: { children: ReactNode }) {
  const initialize = useFleetStore((s) => s.initialize),
    tick = useFleetStore((s) => s.tick),
    save = useFleetStore((s) => s.save);
  const warning = useFleetStore((s) => s.storageWarning);
  useEffect(() => {
    initialize();
    const timer = window.setInterval(tick, 100);
    const onHide = () => save();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', onHide);
      save();
    };
  }, [initialize, tick, save]);
  return (
    <div className="app-shell">
      <Header />
      {warning && (
        <div role="status" className="storage-notice">
          {warning}
        </div>
      )}
      <main className="workspace">{children}</main>
    </div>
  );
}
