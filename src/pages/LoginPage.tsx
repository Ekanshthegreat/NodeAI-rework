import { Link } from 'react-router-dom';
import FleetMap from '../components/FleetMap';
import { createDemoState } from '../simulation/engine';

const reference = createDemoState(0);

export default function LoginPage() {
  return (
    <main className="landing">
      <header className="landing-brand">
        <strong>NodeAI</strong>
        <span>Robot mission workspace</span>
        <a href="https://github.com/Ekanshthegreat/NodeAI-rework">GitHub ↗</a>
      </header>
      <div className="landing-body">
        <div className="landing-intro">
          <p className="eyebrow">Navigation / execution / replay</p>
          <h1>Simulation and ROS navigation</h1>
          <p className="lead">
            A local fleet simulator and a ROS 2 navigation bridge. Choose a workspace to inspect
            routes, send missions and follow execution.
          </p>
        </div>
        <div className="workspace-picker">
          <div className="workspace-options">
            <Link to="/app" className="workspace-option">
              <span className="option-number">01</span>
              <div>
                <h2>
                  Local fleet <span aria-hidden="true">→</span>
                </h2>
                <p>Three robots on a static site. Dispatch, inject a fault, then replay the run.</p>
                <small>Runs in this browser · no setup</small>
              </div>
            </Link>
            <Link to="/app/ros" className="workspace-option">
              <span className="option-number">02</span>
              <div>
                <h2>
                  ROS 2 bridge <span aria-hidden="true">→</span>
                </h2>
                <p>Send Nav2 poses or waypoint routes. Inspect telemetry and action results.</p>
                <small>Requires a running Jazzy bridge and Nav2 server</small>
              </div>
            </Link>
            <div className="session-recipe">
              <h2>A first simulation run</h2>
              <code>Deliver supplies from Pharmacy to Ward A</code>
              <p>
                Dispatch this command, block the assigned robot, and watch the replacement finish.
                Open Replay to inspect the recorded positions and events.
              </p>
            </div>
          </div>
          <figure className="reference-map">
            <figcaption>
              Hospital Alpha <span>Reference layout · metres</span>
            </figcaption>
            <FleetMap site={reference.site} robots={reference.robots} />
          </figure>
        </div>
        <footer className="project-footer">
          <div>
            <a href="https://github.com/Ekanshthegreat/NodeAI-rework/blob/main/docs/DEMO.md">
              Demo guide
            </a>
            <a href="https://github.com/Ekanshthegreat/NodeAI-rework/blob/main/docs/ARCHITECTURE.md">
              Architecture
            </a>
            <a href="https://github.com/Ekanshthegreat/NodeAI-rework/blob/main/docs/ROS2.md">
              ROS setup
            </a>
          </div>
          <p>
            Local robots are point agents. Hardware task handlers and fleet collision avoidance are
            outside this release.
          </p>
        </footer>
      </div>
    </main>
  );
}
