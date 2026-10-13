import { Link } from 'react-router-dom';
import { ArrowRight, Bot, MapPin, Activity, RotateCcw } from 'lucide-react';
export default function LoginPage() {
  return (
    <main className="landing">
      <div className="landing-brand">
        <Bot size={28} />
        <strong>NodeAI</strong>
        <span>Fleet orchestration</span>
      </div>
      <div className="landing-body">
        <p className="eyebrow">A working local simulation</p>
        <h1>
          Give the fleet a mission.
          <br />
          See every decision.
        </h1>
        <p className="lead">
          Plan a route, dispatch a robot and observe its progress. Inject a fault to test recovery,
          then replay the recorded run.
        </p>
        <Link className="primary-button" to="/app">
          Open mission control <ArrowRight size={18} />
        </Link>
        <p className="landing-note">
          No account, credentials or robot hardware required. Your runs stay in this browser.
        </p>
        <div className="landing-features">
          {[
            [MapPin, 'Plan', 'Typed commands and obstacle-aware grid routing.'],
            [Activity, 'Execute', 'Fixed-step robot motion, telemetry and mission events.'],
            [
              RotateCcw,
              'Recover & replay',
              'Bounded reassignment, saved runs and playback controls.',
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
        <p className="scope-note">
          This is a fleet-simulation MVP. Vendor transport adapters are experimental; the demo does
          not control physical robots.
        </p>
      </div>
    </main>
  );
}
