import { describe,it,expect } from 'vitest';
import { createDemoState,submitMission,tickFleet,cancelMission } from './engine';
import { replayFrame,recordingDuration } from './replay';
describe('recording playback',()=>{
 it('selects the first, middle and terminal snapshots without changing the live state',()=>{let s=submitMission(createDemoState(0),'Go to Pharmacy');for(let i=0;i<30;i++)s=tickFleet(s);s=cancelMission(s,'M001');const before=structuredClone(s),r=s.recordings.M001;expect(replayFrame(r,-100)?.at).toBe(r.frames[0].at);expect(replayFrame(r,750)?.at).toBe(500);expect(replayFrame(r,Infinity)?.at).toBe(r.frames[0].at);expect(replayFrame(r,100000)?.status).toBe('cancelled');expect(recordingDuration(r)).toBe(3000);expect(s).toEqual(before);});
 it('retains mission events in its own recording',()=>{const s=cancelMission(submitMission(createDemoState(0),'Go to Pharmacy'),'M001');expect(s.recordings.M001.events.map(e=>e.type)).toEqual(['mission_started','mission_cancelled']);});
 it('handles empty recordings',()=>{const r={missionId:'empty',frames:[],events:[]};expect(replayFrame(r,0)).toBeNull();expect(recordingDuration(r)).toBe(0);});
});
