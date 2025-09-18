export const generateMissionId = (): string => {
  return `mission-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
};

export const generateRobotId = (prefix: string = 'AGV'): string => {
  const num = Math.floor(Math.random() * 999) + 1;
  return `${prefix}-${num.toString().padStart(3, '0')}`;
};

export const generateEventId = (): string => {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
};