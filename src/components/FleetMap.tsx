import type { Robot, Site } from '../types';
import { HOSPITAL_ANCHORS } from '../lib/anchors';
import type { Execution } from '../simulation/engine';
const x = (n: number) => 40 + (n + 10) * 30,
  y = (n: number) => 40 + (10 - n) * 20;
const visible = ['Pharmacy', 'Ward A', 'Ward B', 'Storage', 'Loading Dock', 'Charging Station'];
export default function FleetMap({
  site,
  robots,
  missions = [],
  selectedRobot,
  onSelect,
}: {
  site: Site;
  robots: Robot[];
  missions?: Execution[];
  selectedRobot?: string | null;
  onSelect?: (id: string) => void;
}) {
  const labels: { x: number; y: number }[] = [];
  for (const robot of robots) {
    const px = x(robot.pose.x),
      py = y(robot.pose.y);
    const offset =
      [23, -17, 40, -34].find((dy) =>
        labels.every((label) => Math.abs(label.x - px) >= 72 || Math.abs(label.y - py - dy) >= 15)
      ) ?? 57;
    labels.push({ x: px, y: py + offset });
  }
  return (
    <svg
      className="fleet-map"
      viewBox="0 0 680 480"
      role="img"
      aria-label="Fleet map with robot positions, named locations, planned routes and restricted areas"
    >
      <rect width="680" height="480" fill="#fafbfc" />
      <g stroke="#e6e9ee" strokeWidth="1">
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i}>
            <path d={`M${x(-10 + i * 2)},40V440`} />
            <path d={`M40,${y(-10 + i * 2)}H640`} />
          </g>
        ))}
      </g>
      <rect x="40" y="40" width="600" height="400" fill="none" stroke="#cbd3df" />
      {site.obstacles?.map((o) => (
        <rect
          key={o.id}
          x={x(o.rect.x)}
          y={y(o.rect.y + o.rect.h)}
          width={o.rect.w * 30}
          height={o.rect.h * 20}
          fill="#cbd3df"
          stroke="#8793a4"
        />
      ))}
      {site.noGo?.map((z) => (
        <polygon
          key={z.id}
          points={z.poly.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')}
          fill="#edf0f4"
          stroke="#8793a4"
          strokeDasharray="4 3"
        />
      ))}
      {missions
        .filter((m) => m.status === 'active' || m.status === 'paused')
        .map((m) => (
          <polyline
            key={m.id}
            points={m.route.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')}
            fill="none"
            stroke="#647da5"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        ))}
      {visible.map((name) => {
        const p = HOSPITAL_ANCHORS[name];
        return (
          <g key={name}>
            <circle cx={x(p.x)} cy={y(p.y)} r="3" fill="#798599" />
            <text x={x(p.x) + 7} y={y(p.y) - 8} fill="#617083" fontSize="11">
              {name}
            </text>
          </g>
        );
      })}
      {robots.map((r, index) => (
        <g
          key={r.id}
          onClick={() => onSelect?.(r.id)}
          style={{ cursor: onSelect ? 'pointer' : 'default' }}
        >
          <title>
            {r.id}: {r.status}, battery {Math.round(r.battery * 100)}%
          </title>
          <circle
            cx={x(r.pose.x)}
            cy={y(r.pose.y)}
            r={selectedRobot === r.id ? 11 : 9}
            fill={
              r.status === 'BLOCKED' || r.status === 'ERROR' || r.status === 'CHARGING'
                ? '#8a5e42'
                : '#245b91'
            }
            stroke="white"
            strokeWidth="3"
          />
          <path
            d={`M${x(r.pose.x)},${y(r.pose.y)}l${Math.cos(r.pose.theta) * 10},${-Math.sin(r.pose.theta) * 7}`}
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={x(r.pose.x)}
            y={labels[index].y}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#172033"
          >
            {r.id}
          </text>
        </g>
      ))}
      <text x="40" y="466" fontSize="11" fill="#788597">
        World coordinates in metres · Solid blocks: obstacles · Dashed area: no-go zone
      </text>
    </svg>
  );
}
