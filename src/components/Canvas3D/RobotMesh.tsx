import React, { useRef, useEffect } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import type { Robot } from '../../types';

interface RobotMeshProps {
  robot: Robot;
  position: [number, number, number];
  rotation: [number, number, number];
}

const RobotMesh: React.FC<RobotMeshProps> = ({ robot, position, rotation }) => {
  const meshRef = useRef<Mesh>(null);
  const pulseRef = useRef<Mesh>(null);
  const selectedRobot = useAppStore((state) => state.selectedRobot);
  const isSelected = selectedRobot === robot.id;
  
  // Track if this robot was recently reassigned for pulse effect
  const [showPulse, setShowPulse] = React.useState(false);
  
  React.useEffect(() => {
    // Listen for replan events that assign to this robot
    const checkForReassignment = () => {
      // This would be triggered by policy engine reassignments
      // For now, we'll simulate it when robot status changes to ACTIVE
      if (robot.status === 'ACTIVE') {
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1500);
      }
    };
    
    checkForReassignment();
  }, [robot.status]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDLE': return '#9ca3af';
      case 'ACTIVE': return '#10b981';
      case 'ERROR': return '#ef4444';
      case 'CHARGING': return '#f59e0b';
      case 'BLOCKED': return '#f97316';
      default: return '#6b7280';
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 0.6) return '#10b981';
    if (battery > 0.3) return '#f59e0b';
    return '#ef4444';
  };

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      // Gentle floating animation for selected robot
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
    
    if (pulseRef.current && showPulse) {
      // Pulsing ring animation for reassigned robots
      const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.3;
      pulseRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Pulse ring for reassigned robots */}
      {showPulse && (
        <mesh ref={pulseRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.0, 16]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
        </mesh>
      )}
      
      {/* Main robot body */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.6, 1.2]} />
        <meshStandardMaterial 
          color={getStatusColor(robot.status)}
          metalness={0.3}
          roughness={0.4}
          emissive={isSelected ? '#3b82f6' : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>
      
      {/* Robot "head" */}
      <mesh position={[0, 0.5, 0.2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.3]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      
      {/* Direction indicator */}
      <mesh position={[0, 0.3, 0.7]}>
        <coneGeometry args={[0.1, 0.3]} />
        <meshStandardMaterial color={getStatusColor(robot.status)} />
      </mesh>
      
      {/* Battery indicator */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[robot.battery * 0.6, 0.05, 0.1]} />
        <meshStandardMaterial 
          color={getBatteryColor(robot.battery)}
          emissive={getBatteryColor(robot.battery)}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Robot ID label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.2}
        color={isSelected ? '#60a5fa' : '#d1d5db'}
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-regular.woff"
      >
        {robot.id}
      </Text>
      
      {/* Status label */}
      <Text
        position={[0, 1.0, 0]}
        fontSize={0.12}
        color={getStatusColor(robot.status)}
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-regular.woff"
      >
        {robot.status}
      </Text>
    </group>
  );
};

export default RobotMesh;