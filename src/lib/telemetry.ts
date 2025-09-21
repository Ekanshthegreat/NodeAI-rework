import { useAppStore } from '../store/useAppStore';
import { TelemetryMessage } from './schemas';
import { markRobotProgress, evaluatePoliciesOnTick } from './policy';

const TELEM_PERIOD_MS = 2000;
let lastPose = new Map<string, { x: number; y: number; ts: number }>();
let stagnantCounts = new Map<string, number>();

export function startTelemetry(source: 'mock' | 'rmf' = 'mock') {
  if (source === 'mock') {
    startMockTelemetry();
  }
  // Future: add RMF WebSocket connection
}

function startMockTelemetry() {
  const interval = setInterval(() => {
    const s = useAppStore.getState();
    if (!s.telemetryEnabled) return;

    // Generate telemetry for each robot
    s.robots.forEach(robot => {
      const fault = s.faultInjected[robot.id];
      const now = Date.now();
      
      // Apply fault injection
      let pose = robot.pose;
      let battery = robot.battery;
      let status = robot.status;

      // Blocked fault: freeze pose
      if (fault?.blockedUntil && now < fault.blockedUntil) {
        // Keep pose constant, but mark as BLOCKED
        status = 'BLOCKED';
      } else if (fault?.blockedUntil && now >= fault.blockedUntil) {
        // Clear expired blocked fault
        s.setFault(robot.id, {});
        status = 'IDLE';
      }

      // Battery drain fault
      if (fault?.drained) {
        battery = Math.min(0.15, battery);
        // Auto-clear after 30 seconds
        if (!fault.blockedUntil || now > (fault.blockedUntil || 0)) {
          setTimeout(() => {
            const currentFault = useAppStore.getState().faultInjected[robot.id];
            if (currentFault?.drained) {
              s.setFault(robot.id, { ...currentFault, drained: false });
            }
          }, 30000);
        }
      }

      // Normal movement simulation (if not blocked)
      if (status !== 'BLOCKED' && !fault?.blockedUntil) {
        const time = now / 5000;
        pose = {
          x: Math.sin(time + robot.id.charCodeAt(0)) * 3,
          y: Math.cos(time + robot.id.charCodeAt(0) * 0.7) * 2,
          theta: (time + robot.id.charCodeAt(0)) % (Math.PI * 2),
        };
      }

      const telemetry: TelemetryMessage = {
        type: 'telemetry',
        ts: now,
        robot_id: robot.id,
        vendor: (robot.vendor as any) || 'mock',
        pose,
        vel: status === 'ACTIVE' ? Math.random() * 2 : 0,
        battery,
        status: status as any,
        task_id: status === 'ACTIVE' ? `task-${robot.id}` : null,
      };

      onTelemetry(telemetry);
    });
  }, TELEM_PERIOD_MS);

  return () => clearInterval(interval);
}

function onTelemetry(msg: TelemetryMessage) {
  const s = useAppStore.getState();
  s.addTelemetry(msg);

  // Update robot state in store
  s.setRobots(
    s.robots.map(robot =>
      robot.id === msg.robot_id
        ? {
            ...robot,
            pose: msg.pose,
            battery: msg.battery,
            status: msg.status,
            updated_at: new Date(msg.ts).toISOString(),
          }
        : robot
    )
  );

  // Progress detection for ACTIVE robots
  if (msg.status === 'ACTIVE') {
    const prev = lastPose.get(msg.robot_id);
    const dist = prev ? Math.hypot(msg.pose.x - prev.x, msg.pose.y - prev.y) : 999;
    const epsilon = 0.02; // 2 cm
    const count = stagnantCounts.get(msg.robot_id) ?? 0;
    
    if (prev && dist < epsilon) {
      stagnantCounts.set(msg.robot_id, count + 1);
    } else {
      stagnantCounts.set(msg.robot_id, 0);
    }

    const stagnantForMs = (stagnantCounts.get(msg.robot_id)! * TELEM_PERIOD_MS);
    const isStuck = stagnantForMs > 3000; // 3s pre-flag; policy uses 10s threshold
    markRobotProgress(msg.robot_id, !isStuck, msg.ts);
  }
  
  lastPose.set(msg.robot_id, { x: msg.pose.x, y: msg.pose.y, ts: msg.ts });

  // Run policy evaluation
  evaluatePoliciesOnTick(msg.ts);
}