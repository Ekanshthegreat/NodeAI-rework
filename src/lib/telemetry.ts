import { useAppStore } from '../store/useAppStore';
import { useSceneStore } from '../store/useSceneStore';
import { TelemetryMessage } from './schemas';
import { markRobotProgress, evaluatePoliciesOnTick } from './policy';

const TELEM_PERIOD_MS = 2000;
let lastPose = new Map<string, { x: number; y: number; ts: number }>();
let stagnantCounts = new Map<string, number>();
let robotPathProgress = new Map<string, { missionId: string; waypointIndex: number; startTime: number }>();

export function startTelemetry(source: 'mock' | 'rmf' = 'mock') {
  if (source === 'mock') {
    startMockTelemetry();
  }
  // Future: add RMF WebSocket connection
}

function startMockTelemetry() {
  const interval = setInterval(() => {
    const appState = useAppStore.getState();
    const sceneState = useSceneStore.getState();
    
    try {
      if (!appState.telemetryEnabled) return;

      // Generate telemetry for each robot
      appState.robots.forEach(robot => {
        const fault = appState.faultInjected[robot.id];
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
          appState.setFault(robot.id, {});
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
                appState.setFault(robot.id, { ...currentFault, drained: false });
              }
            }, 30000);
          }
        }

        // Path following or idle behavior
        if (status !== 'BLOCKED' && !fault?.blockedUntil) {
          // Check if robot is assigned to a mission with a path
          const assignedMission = appState.missions.find(m => 
            m.status === 'active' && 
            appState.missionPlans[m.id]?.robot_selection.include.includes(robot.id)
          );
          
          if (assignedMission && sceneState.missionPaths[assignedMission.id]) {
            // Follow mission path deterministically
            pose = followMissionPath(robot.id, assignedMission.id, sceneState, now);
            status = 'ACTIVE';
          } else {
            // Idle in place with minor jitter (<0.05m)
            const jitter = 0.02; // 2cm jitter
            const time = now / 10000; // Slow jitter
            pose = {
              x: robot.pose.x + Math.sin(time + robot.id.charCodeAt(0)) * jitter,
              y: robot.pose.y + Math.cos(time + robot.id.charCodeAt(0) * 0.7) * jitter,
              theta: robot.pose.theta + Math.sin(time * 0.5) * 0.05, // Small rotation jitter
            };
            status = 'IDLE';
            
            // Idle battery drain: 0.1% per second
            battery = Math.max(0, battery - (0.001 * TELEM_PERIOD_MS / 1000));
          }
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
    } catch (error) {
      console.error('Telemetry error:', error);
      // Log to event system
      const appState = useAppStore.getState();
      appState.pushEvent({
        ts: Date.now(),
        level: 'WARN',
        msg: `[DEMO] Telemetry error: ${(error as Error).message}`,
        payload: { error }
      });
    }
  }, TELEM_PERIOD_MS);

  return () => clearInterval(interval);
}

function followMissionPath(
  robotId: string,
  missionId: string,
  sceneState: any,
  now: number
): { x: number; y: number; theta: number } {
  const missionPath = sceneState.missionPaths[missionId];
  if (!missionPath || !missionPath.waypoints.length) {
    return { x: 0, y: 0, theta: 0 };
  }
  
  const waypoints = missionPath.waypoints;
  const speed = sceneState.pathSpeed || 0.6; // m/s
  
  // Get or initialize path progress
  let progress = robotPathProgress.get(robotId);
  if (!progress || progress.missionId !== missionId) {
    progress = {
      missionId,
      waypointIndex: 0,
      startTime: now,
    };
    robotPathProgress.set(robotId, progress);
  }
  
  if (progress.waypointIndex >= waypoints.length - 1) {
    // Mission complete
    robotPathProgress.delete(robotId);
    const appState = useAppStore.getState();
    
    // Mark mission as completed
    appState.setMissions(
      appState.missions.map(m => 
        m.id === missionId ? { ...m, status: 'completed' } : m
      )
    );
    
    // Log completion event
    appState.addEvent({
      id: `event-${Date.now()}`,
      mission_id: missionId,
      robot_id: robotId,
      type: 'mission_completed',
      payload: { message: `Mission ${missionId} completed by ${robotId}` },
      ts: new Date().toISOString(),
    });
    
    return waypoints[waypoints.length - 1];
  }
  
  const currentWaypoint = waypoints[progress.waypointIndex];
  const nextWaypoint = waypoints[progress.waypointIndex + 1];
  
  if (!nextWaypoint) {
    return currentWaypoint;
  }
  
  // Calculate progress along current segment
  const segmentDistance = Math.sqrt(
    Math.pow(nextWaypoint.x - currentWaypoint.x, 2) +
    Math.pow(nextWaypoint.y - currentWaypoint.y, 2)
  );
  
  const segmentDuration = (segmentDistance / speed) * 1000; // ms
  const segmentProgress = Math.min(1, (now - progress.startTime) / segmentDuration);
  
  if (segmentProgress >= 1) {
    // Move to next waypoint
    progress.waypointIndex++;
    progress.startTime = now;
    robotPathProgress.set(robotId, progress);
    return nextWaypoint;
  }
  
  // Interpolate between waypoints
  const x = currentWaypoint.x + (nextWaypoint.x - currentWaypoint.x) * segmentProgress;
  const y = currentWaypoint.y + (nextWaypoint.y - currentWaypoint.y) * segmentProgress;
  const theta = Math.atan2(nextWaypoint.y - currentWaypoint.y, nextWaypoint.x - currentWaypoint.x);
  
  return { x, y, theta };
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