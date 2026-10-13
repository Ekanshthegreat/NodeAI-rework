import { nanoid } from 'nanoid';
import { MissionPlan } from './schemas';
import { HOSPITAL_ANCHORS } from './anchors';

type CompileOpts={defaultMinBattery?:number;defaultPolicy?:{reassign_on_blocked_s:number;retry_limit:number}};
type RobotInfo={id:string;pose:{x:number;y:number};status:string;battery:number};

export function canonicalLocation(name:string):string {
  const key=Object.keys(HOSPITAL_ANCHORS).find(k=>k.toLowerCase()===name.trim().toLowerCase());
  if(!key) throw new Error(`Unknown location "${name.trim()}". Choose a named location on the map.`);
  return key;
}

/** Constrained command grammar, not a learned natural-language planner. */
export function compileNLToPlan(nl:string,site_id:string,robots:RobotInfo[],opts:CompileOpts={}):MissionPlan {
  const input=nl.trim();
  if(!input || input.length>300) throw new Error('Mission text must contain 1–300 characters');
  const minBattery=opts.defaultMinBattery??.2;
  const chosen=robots.filter(r=>r.status==='IDLE' && r.battery>=minBattery).sort((a,b)=>b.battery-a.battery || a.id.localeCompare(b.id))[0];
  if(!chosen) throw new Error('No idle robot with sufficient battery is available');
  const policy=opts.defaultPolicy??{reassign_on_blocked_s:3,retry_limit:1};
  const tasks:MissionPlan['subtasks']=[];
  const add=(verb:MissionPlan['subtasks'][number]['verb'],name:string,item:string|null=null)=>{
    const location=canonicalLocation(name);
    tasks.push({id:nanoid(),verb,args:{from:verb==='pickup'?location:null,to:verb==='pickup'?null:location,item,room:null,zone:null,dock:null},policy});
  };
  for(const command of input.split(/\s*(?:,?\s+then\s+|;)\s*/i)) {
    const delivery=command.match(/^(?:deliver|transport)\s+(.+?)\s+from\s+(.+?)\s+to\s+(.+)$/i);
    const navigate=command.match(/^(?:go|navigate|move)\s+to\s+(.+)$/i);
    const inspect=command.match(/^(?:inspect|patrol)\s+(.+)$/i);
    const charge=command.match(/^(?:charge|dock)(?:\s+(?:at|to)\s+(.+))?$/i);
    if(delivery){add('navigate',delivery[2]);add('pickup',delivery[2],delivery[1]);add('deliver',delivery[3],delivery[1]);}
    else if(navigate)add('navigate',navigate[1]);
    else if(inspect)add('inspect',inspect[1]);
    else if(charge)add(command.toLowerCase().startsWith('charge')?'charge':'dock',charge[1]??'Charging Station');
    else throw new Error('Use "Deliver supplies from Pharmacy to Ward A", "Go to Loading Dock", "Inspect Ward B" or "Charge".');
  }
  return MissionPlan.parse({mission_id:nanoid(),site_id,natural_language:input,constraints:{priority:'normal',no_go:[],time_window_start:null,time_window_end:null,min_battery_pct:minBattery},subtasks:tasks,robot_selection:{strategy:'auto',allow_vendors:[],include:[chosen.id],exclude:[]}});
}
