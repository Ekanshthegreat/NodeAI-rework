import type { Adapter } from './types';
import { mockAdapter } from './mock';
import { rosAdapter } from './ros';
import { rmfAdapter } from './rmf';
import { vdaAdapter } from './vda5050';

export const adapters: Record<string, Adapter> = {
  mock: mockAdapter,
  ros: rosAdapter,
  rmf: rmfAdapter,
  vda5050: vdaAdapter,
};

export * from './types';
export { mockAdapter, rosAdapter, rmfAdapter, vdaAdapter };
