import { CAREER_NAMES } from '../data/careers.js';
/** The sole public action vocabulary. Payload validation is deliberately independent of UI. */
export const ACTION_TYPES = Object.freeze(['NEW_RUN','CHARGEN_ROLL','CHARGEN_PICK','CHARGEN_EXPRESS','CHARGEN_DONE','PORT_ACTION','BUY','SELL','BOOK_FREIGHT','BOOK_PASSENGER','ACCEPT_CONTRACT','RECRUIT','REFUEL','REFIT','REPAIR','STAY','DEPART','QUICK_STOP','SCENE_CHOICE','END_WEEK','PAY','SKIP_PAY','SETTLE_LOAN','OBJECT','MUTINY_VOTE','ABANDON']);
export const PORT_CHOICES = Object.freeze({1:['patron','flightplan','rest'],2:['maintenance','parts','refuel'],3:['guard','train','escort'],4:['heal','hospital','supplies'],5:['market','freight','passengers','bank']});
export const DEFAULT_ROUTINES = Object.freeze({1:'flightplan',2:'maintenance',3:'guard',4:'hospital',5:'market'});
const finite = value => typeof value === 'number' && Number.isFinite(value);
export function validateAction(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action) || !ACTION_TYPES.includes(action.t)) return 'UNKNOWN_ACTION';
  if (action.by != null && !['captain','system',1,2,3,4,5,'1','2','3','4','5'].includes(action.by)) return 'INVALID_ACTOR';
  if (JSON.stringify(action).length > 7500) return 'ACTION_TOO_LARGE';
  switch(action.t) {
    case 'NEW_RUN': if (action.seed != null && (typeof action.seed !== 'string' || action.seed.length > 120)) return 'INVALID_SEED'; break;
    case 'CHARGEN_PICK': case 'CHARGEN_ROLL':
      if (!Number.isInteger(action.index) || action.index < 0 || action.index > 4) return 'INVALID_CREW';
      if(action.t==='CHARGEN_PICK') {
        if(action.career!=null&&!CAREER_NAMES.includes(action.career))return 'INVALID_CAREER';
        if(action.terms!=null&&(!Number.isInteger(action.terms)||action.terms<1||action.terms>5))return 'INVALID_TERMS';
        if(action.table!=null&&!['personal','service','specialist','advanced'].includes(action.table))return 'INVALID_TABLE';
        if(action.name!=null&&(typeof action.name!=='string'||!action.name.trim()||action.name.length>48))return 'INVALID_NAME';
        if(action.gender!=null&&!['male','female','neutral'].includes(action.gender))return 'INVALID_GENDER';
        if(action.homeworld!=null&&(typeof action.homeworld!=='string'||!action.homeworld.trim()||action.homeworld.length>32))return 'INVALID_NAME';
      }
      break;
    case 'PORT_ACTION': if (!PORT_CHOICES[action.station]?.includes(action.choice)) return 'INVALID_CHOICE'; break;
    case 'BUY': if (typeof action.goodId !== 'string' || !finite(action.tons) || action.tons <= 0 || action.tons > 82 || action.tons % 1) return 'INVALID_QUANTITY'; break;
    case 'SELL': if (typeof action.cargoId !== 'string' || (action.tons != null && (!finite(action.tons) || action.tons <= 0 || action.tons % 1))) return 'INVALID_QUANTITY'; break;
    case 'BOOK_FREIGHT': case 'BOOK_PASSENGER': case 'ACCEPT_CONTRACT': if (typeof action.id !== 'string') return 'INVALID_OFFER'; break;
    case 'RECRUIT': case 'SCENE_CHOICE': if (!Number.isInteger(Number(action.station)) || Number(action.station) < 1 || Number(action.station) > 5) return 'INVALID_STATION'; if (action.t === 'SCENE_CHOICE' && typeof action.choice !== 'string') return 'INVALID_CHOICE'; break;
    case 'DEPART': case 'QUICK_STOP': if (typeof action.hex !== 'string' || !/^0[1-8](0[1-9]|10)$/.test(action.hex)) return 'INVALID_DESTINATION'; break;
    case 'REFUEL':
      if (action.type != null && !['refined','raw','skim'].includes(action.type)) return 'INVALID_FUEL';
      if(action.purge!=null&&typeof action.purge!=='boolean')return 'INVALID_FUEL';
      if(action.purge&&action.type!=='refined')return 'INVALID_FUEL';
      if (action.tons != null && (!finite(action.tons) || action.tons <= 0 || action.tons > 50)) return 'INVALID_QUANTITY';
      break;
    case 'REFIT': if(!['reserve','workshop','cabins'].includes(action.id)||action.remove!=null&&typeof action.remove!=='boolean')return 'INVALID_REFIT';break;
    case 'REPAIR': if (action.system != null && !['all','hull','structure','jump','maneuver','power','turret','sensors','sickbay','cargo','quarters'].includes(action.system)) return 'INVALID_SYSTEM'; break;
    case 'PAY': if (action.amount != null && (!finite(action.amount) || action.amount <= 0 || action.amount % 1)) return 'INVALID_QUANTITY'; break;
  }
  return null;
}
