import { Link } from 'react-router-dom';
import { ArrowRight, Bot, MapPin, Activity, RotateCcw } from 'lucide-react';
export default function LoginPage() {
  const hostedDemo = import.meta.env.VITE_ROUTER === 'hash';
  return (
    <main className="landing">
      <div className="landing-brand">
        <Bot size={28} />
        <strong>NodeAI</strong>
        <span>Fleet orchestration</span>
      </div>
      <div className="landing-body">
        <p className="eyebrow">ROS 2 navigation and a local test workspace</p>
        <h1>
          Coordinate the fleet.
          <br />
          Inspect every outcome.
        </h1>
        <p className="lead">
          Connect ROS 2 robots, send Nav2 goals and inspect action results. Use the local simulator
          to explore mission execution, recovery and recorded replay without hardware.
        </p>
        <Link className="primary-button" to={hostedDemo ? '/app' : '/app/ros'}>
          {hostedDemo ? 'Try the local simulation' : 'Open ROS mission control'}{' '}
          <ArrowRight size={18} />
        </Link>
        <Link className="secondary-button" to={hostedDemo ? '/app/ros' : '/app'}>
          {hostedDemo ? 'Open ROS mission control' : 'Try the local simulation'}
        </Link>
        <p className="landing-note">
          ROS mode needs a running bridge and Nav2 stack. The local simulator requires no account or
          hardware.
        </p>
        <div className="landing-features">
          {[
            [MapPin, 'ROS telemetry', 'Namespace-specific localization and battery subscriptions.'],
            [
              Activity,
              'Nav2 actions',
              'Explicit goal acceptance, feedback, cancellation and terminal results.',
            ],
            [
              RotateCcw,
              'Local experiments',
              'Simulated task execution, bounded recovery and recorded replay.',
            ],
          ].map(([Icon, title, description]) => {
            const Component = Icon as typeof MapPin;
            return (
              <section key={String(title)}>
                <Component size={22} />
                <h2>{String(title)}</h2>
                <p>{String(description)}</p>
              </section>
            );
          })}
        </div>
        <p className="landing-note">
          <a href="https://github.com/Ekanshthegreat/NodeAI-rework">Source and architecture</a>
          {' · '}
          <a href="https://github.com/Ekanshthegreat/NodeAI-rework/blob/main/docs/DEMO.md">
            Guided demo scenarios
          </a>
        </p>
        <p className="scope-note">
          ROS mode covers navigation goals. Compound robot tasks and automatic reassignment
          currently belong to the local simulator. The ROS test fixture uses synthetic telemetry and
          no hardware.
        </p>
      </div>
    </main>
  );
}
