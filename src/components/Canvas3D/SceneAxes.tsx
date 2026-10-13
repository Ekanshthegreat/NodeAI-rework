import React from 'react';
import { Line } from '@react-three/drei';

const SceneAxes: React.FC = () => {
  const axisLength = 5;

  return (
    <group>
      {/* X-axis (Red) */}
      <Line
        points={[
          [0, 0, 0],
          [axisLength, 0, 0],
        ]}
        color="red"
        lineWidth={3}
      />
      <mesh position={[axisLength + 0.5, 0, 0]}>
        <coneGeometry args={[0.1, 0.3]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {/* Y-axis (Green) */}
      <Line
        points={[
          [0, 0, 0],
          [0, axisLength, 0],
        ]}
        color="green"
        lineWidth={3}
      />
      <mesh position={[0, axisLength + 0.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.3]} />
        <meshBasicMaterial color="green" />
      </mesh>

      {/* Z-axis (Blue) */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, axisLength],
        ]}
        color="blue"
        lineWidth={3}
      />
      <mesh position={[0, 0, axisLength + 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.3]} />
        <meshBasicMaterial color="blue" />
      </mesh>

      {/* Origin marker */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
};

export default SceneAxes;
