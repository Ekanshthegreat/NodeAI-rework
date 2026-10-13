import { NavLink, Link } from 'react-router-dom';
import { Bot, Pause, Play } from 'lucide-react';
import { useFleetStore } from '../../store/useFleetStore';
export default function Header() {
  const running = useFleetStore((s) => s.fleet.running),
    setRunning = useFleetStore((s) => s.setRunning);
  return (
    <header className="app-header">
      <Link to="/" className="brand">
        <Bot size={25} />
        <strong>NodeAI</strong>
      </Link>
      <span className="mode-badge">Local simulation</span>
      <nav aria-label="Main navigation">
        <NavLink to="/app" end>
          Mission control
        </NavLink>
        <NavLink to="/app/replay">Replay</NavLink>
      </nav>
      <button className="secondary-button" onClick={() => setRunning(!running)}>
        {running ? <Pause size={16} /> : <Play size={16} />}{' '}
        {running ? 'Pause simulation' : 'Resume simulation'}
      </button>
    </header>
  );
}
