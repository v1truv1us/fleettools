import type { HarnessAvailability, HarnessId, HarnessLaunchRequest, HarnessRunResult } from '../orchestration/types.js';

export interface HarnessAdapter {
  id: HarnessId;
  probeAvailability(): Promise<HarnessAvailability>;
  run(request: HarnessLaunchRequest): Promise<HarnessRunResult>;
}
