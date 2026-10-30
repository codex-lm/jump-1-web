import { derive } from '../../core/rng.js';
import { rulesAtLeast } from '../../core/state.js';
import { d6,roll,task } from '../../core/dice.js';
import { addLog,actor,check } from './shared.js';
import { damageShip,damagePerson,healCrew,SYSTEMS,systemDM,repairBonus,fuelCapacity } from '../ship.js';
import { spend,earn,reputation } from '../economy.js';
import { recordTrace } from '../collector.js';
import { currentWorld,isIllegal } from '../trade.js';
import { GOODS } from '../../data/goods.js';
import { distance,neighbors } from '../subsector.js';
import { TRAVEL_EVENTS } from '../encounters.js';

export const voyageRules=state=>rulesAtLeast(state,4);
const SOCIAL_EVENTS=['bond','birthday','homesick','rivalry','shared-past','music','good-meal'];
const SIGNAL_EVENTS=['bank-letter','rumor','signals'];
const INCIDENT_EVENTS=['fire','leak','illness'];
export function voyageContext(state,scene=state.scene){
  const event=TRAVEL_EVENTS.includes(scene?.event)?scene.event:'quiet-watch';
  const people=state.crew.filter(p=>p.alive&&p.active!==false);
  const person=people.find(p=>p.id===scene?.subjectId)||people[(state.clock.week-1)%Math.max(1,people.length)];
  const story=state.voyage?.stories?.find(s=>s.id===scene?.followupId&&s.status==='open');
  return {event,person,story};
}
function rememberStory(state,story){
  state.voyage||={stories:[]};state.voyage.stories||=[];
  if(state.voyage.stories.some(s=>s.id===story.id))return;
  if(state.voyage.stories.length>=8){const old=state.voyage.stories.findIndex(s=>s.status!=='open');if(old<0)return;state.voyage.stories.splice(old,1);}
  state.voyage.stories.push({...story,startedWeek:state.clock.week,followupWeek:state.clock.week+1,status:'open'});
}
export function inspectionProcedure(state){
  if(!['patrol','customs'].includes(state.scene?.type))return null;
  return Object.fromEntries([1,2,3,4,5].map(station=>[station,state.scene.choices[station]||(actor(state,station)?({1:'comply',5:'paperwork'}[station]||'hold'):'hold')]));
}
function voyageOptions(scene,state,station){
  const choices=[option('hold')],{event,person,story}=voyageContext(state,scene);
  if(station===1){
    choices.push(option('lead','Leadership'));
    if(SOCIAL_EVENTS.includes(event)&&state.economy.credits>=500)choices.push(option('travel-gather',null,0,500));
    if(event==='birthday'&&person&&!state.voyage?.stories?.some(s=>s.id===`birthday-${person.id}`))choices.push(option('travel-promise'));
    if(INCIDENT_EVENTS.includes(event))choices.push(option('travel-delay'));
    if(event==='illness'&&state.economy.credits>=1000)choices.push(option('travel-medicine',null,0,1000));
    if(SIGNAL_EVENTS.includes(event))choices.push(option('travel-listen','Sensors'));
    if(event==='secret')choices.push(option('reveal','Sensors'));
    if(story?.type==='merchant')choices.push(option('story-credit'),option('story-parts'));
    if(story?.type==='birthday'){
      if(state.economy.credits>=500)choices.push(option('story-celebrate',null,0,500));
      choices.push(option('story-release'));
    }
  }
  if(station===2)choices.push(option(['fire','leak'].includes(event)?'travel-contain':'repair',['fire','leak'].includes(event)?'Mechanics':'Engineering',['fire','leak'].includes(event)?2:-2));
  if(station===3&&event==='cards')choices.push(option('cards','Carousing'));
  if(station===4)choices.push(option(event==='illness'?'travel-treat':'heal','Medicine'));
  if(station===5)choices.push(option('reassure','Steward'));
  return choices;
}

/** Scene resolvers only mutate the reducer's private clone. Random streams are per actor/round. */
export function createScene(type,state,extra={}) {
  const scene={type,round:1,choices:{},flags:{},...extra};
  if(type==='pirate'||type==='repo') scene.enemy={hull:type==='repo'?60:20,structure:type==='repo'?60:20,maxHull:type==='repo'?60:20,weapon:type==='repo'?'laser-missile':'laser',range:'medium',hostile:false,count:extra.level||1};
  if(type==='breakdown') scene.system=extra.system||'jump';
  if(voyageRules(state)&&type==='travel'){
    const {person}=voyageContext(state,scene);scene.subjectId=person?.id||null;
    const followup=state.voyage?.stories?.find(s=>s.status==='open'&&s.followupWeek<=state.clock.week&&(s.type!=='birthday'||state.crew.some(p=>p.id===s.personId&&p.alive&&p.active!==false)));
    if(followup)scene.followupId=followup.id;
  }
  return scene;
}
const option=(id,skill=null,difficulty=0,cost=0)=>({id,skill,difficulty,cost});
export function sceneOptions(scene,state,station) {
  station=Number(station);const choices=[option('hold')];if(!scene||!actor(state,station))return choices;
  const type=scene.type;
  if(voyageRules(state)&&type==='travel')return voyageOptions(scene,state,station);
  if(station===1&&!scene.flags.leadershipUsed&&type!=='travel')choices.push(option('lead','Leadership'));
  if(station===1&&type==='repo'&&state.crew.some(p=>p.alive&&p.active!==false&&p.secret==='informant'&&p.revealed&&!p.turned)){choices.push(option('turn-informant','Leadership',-2));if(currentWorld(state))choices.push(option('dismiss-informant'));}
  if(type==='pirate'||type==='repo') {
    if(station===1) {
      choices.push(option(type==='repo'?'surrender':'yield'));
      if(!scene.enemy.hostile&&type==='repo'&&state.economy.credits>=state.economy.arrears+20000)choices.push(option('pay',null,0,state.economy.arrears+20000));
      if(state.ship.systems.maneuver>0) choices.push(option('evade','Pilot'),option('flee','Pilot'));
      if(type==='repo'&&scene.enemy.hostile)choices.push(option('approach','Pilot'));
    }
    if(station===2)choices.push(option('repair','Engineering',-2),option('overload','Engineering',-2));
    if(station===3&&state.ship.systems.turret>0&&state.ship.systems.power>0)choices.push(option('fire','Gunnery'),option('aim','Gunnery'));
    if(station===4)choices.push(option('heal','Medicine'));
    if(station===5) {
      choices.push(option('reassure','Steward'),option('bluff','Comms'));
      if(!(type==='repo'&&state.collector.bailiff.type==='tired'&&state.collector.negotiated))choices.push(option('negotiate',type==='repo'?'Admin':'Broker',type==='repo'?-2:0));
      const bribe=state.collector.bailiff.type==='tired'?15000:30000;
      if(!scene.enemy.hostile&&type==='repo'&&state.economy.credits>=bribe)choices.push(option('bribe','Streetwise',-4,bribe));
      if(type==='pirate'&&state.crew.some(p=>p.secret==='ex-pirate'&&p.alive&&p.active!==false))choices.push(option('old-friends','Streetwise',2));
    }
  } else if(type==='patrol'||type==='customs') {
    if(station===1)choices.push(option('comply','Comms',2));
    if(station===2)choices.push(option('hide','Engineering',-2));
    if(station===3)choices.push(option('guard','Gun Combat'));
    if(station===4)choices.push(option('examine','Medicine'));
    if(station===5){choices.push(option('paperwork','Admin',2),option('cover','Streetwise'));if((currentWorld(state)?.law??10)<=6&&state.economy.credits>=6000)choices.push(option('bribe','Streetwise',0,6000));}
  } else if(type==='breakdown') {
    if(station===1)choices.push(option('stabilize','Pilot'));
    if(station===2)choices.push(option('repair','Engineering',-2));
    if(station===3)choices.push(option('assist','Mechanics',2));
    if(station===4)choices.push(option('heal','Medicine'));
    if(station===5)choices.push(option('reassure','Steward'));
  } else if(type==='drift') {
    if(station===1)choices.push(option('distress','Comms',0,50000));
    if(station===2)choices.push(option('improvise','Engineering',-2));
    if(station===3)choices.push(option('ration','Survival'));
    if(station===4)choices.push(option('heal','Medicine'));
    if(station===5)choices.push(option('reassure','Steward'));
  } else if(type==='derelict') {
    if(station===1)choices.push(option('leave'),option('scan','Sensors',2));
    if(station===2)choices.push(option('salvage','Mechanics'));
    if(station===3)choices.push(option('board','Vacc Suit'));
    if(station===4)choices.push(option('rescue','Medicine'));
    if(station===5)choices.push(option('reassure','Steward'));
  } else if(type==='trader') {
    if(station===1)choices.push(option('leave'));
    if(station===2)choices.push(option('assist','Engineering'));
    if(station===4)choices.push(option('heal','Medicine'));
    if(station===5)choices.push(option('negotiate','Broker'));
  } else if(type==='patron'||type.startsWith('mission-')) {
    if(station===1)choices.push(option(type==='patron'?'accept':'deliver','Admin'),option('leave'));
    if(station===3&&type==='mission-escort')choices.push(option('guard','Gun Combat'));
    if(station===5)choices.push(option('negotiate','Broker'),option('paperwork','Admin'));
  } else if(type==='travel') {
    if(station===1)choices.push(option('lead','Leadership'),option('reveal','Sensors'));
    if(station===2)choices.push(option('repair','Mechanics',2));
    if(station===3)choices.push(option('cards','Carousing'));
    if(station===4)choices.push(option('heal','Medicine'));
    if(station===5)choices.push(option('reassure','Steward'));
  } else if(type==='repo-sighting') { if(station===1)choices.push(option('scan','Sensors',2)); }
  return choices;
}
function done(state,key='log.sceneResolved',params={}) { if(key)addLog(state,key,{type:state.scene.type,...params});state.scene=null;state.phase='port';return true; }
function reduceEnemy(scene,damage) { const h=Math.min(scene.enemy.hull,damage);scene.enemy.hull-=h;scene.enemy.structure=Math.max(0,scene.enemy.structure-(damage-h)); }
function opposed(state,station,skill,difficulty,rng,enemySkill=1,situation=0,label='opposed') { const result=check(state,station,skill,{difficulty,situation,label});const enemy=task({rng,skill:enemySkill,characteristic:7});return {success:result.effect>enemy.effect,result,enemy}; }
function repairAction(state,station=2,bonus=0) { const checkResult=check(state,station,'Engineering',{difficulty:-2,situation:bonus+(state.ship.partsUntil>=state.clock.week?2:0)+(voyageRules(state)?repairBonus(state):0),label:'repair'});const system=state.scene?.system||SYSTEMS.reduce((a,b)=>state.ship.systems[a]<state.ship.systems[b]?a:b);if(checkResult.success) { state.ship.systems[system]=Math.min(3,state.ship.systems[system]+1);addLog(state,'log.repair',{system,points:1}); }else if(state.scene?.type==='breakdown')state.ship.systems[system]=Math.max(0,state.ship.systems[system]-1);return checkResult.success; }
function doctorAction(state) { const result=check(state,4,'Medicine',{system:'sickbay',situation:state.ship.suppliesUntil>=state.clock.week?1:0,label:'heal'});const amount=healCrew(state,result.success?Math.max(1,result.effect):1);addLog(state,'log.heal',{points:amount});return result.success; }
function confiscate(state,rng) { const world=currentWorld(state);let tons=0;state.cargo=state.cargo.filter(lot=>{if(lot.kind==='speculative'&&isIllegal(GOODS.find(g=>g.id===lot.goodId),world)){tons+=lot.tons;return false;}return true;});const fine=tons?d6(rng)*10000:0;if(fine)spend(state,fine,'fines',true);if(tons)reputation(state,state.ship.hex,-1);addLog(state,voyageRules(state)&&!tons?'log.voyage.inspectionClear':'log.confiscation',{tons,fine}); }
function shiftMorale(state,amount,personId=null){
  for(const p of state.crew.filter(p=>p.alive&&p.active!==false&&(!personId||p.id===personId)))p.mood=Math.max(-1,Math.min(1,p.mood+amount));
}
function voyageAction(state,station,choice){
  const scene=state.scene,{person,story}=voyageContext(state),name=actor(state,station)?.name||'—';
  if(choice==='travel-delay'){scene.flags.safePause=true;addLog(state,'log.voyage.pause');return true;}
  if(choice==='travel-gather'&&spend(state,500,'support')){
    shiftMorale(state,1);scene.flags.gathered=true;addLog(state,'log.voyage.gather',{amount:500});return true;
  }
  if(choice==='travel-promise'&&person){
    rememberStory(state,{id:`birthday-${person.id}`,type:'birthday',personId:person.id,name:person.name,worldHex:state.ship.hex});
    addLog(state,'log.voyage.promise',{name:person.name});return true;
  }
  if(choice==='travel-medicine'&&spend(state,1000,'support')){
    scene.flags.treated=true;addLog(state,'log.voyage.medicine',{amount:1000,points:healCrew(state,1)});return true;
  }
  if(choice==='travel-contain'||choice==='travel-treat'){
    if(scene.flags.safePause||choice==='travel-treat'&&scene.flags.treated)return true;
    const medical=choice==='travel-treat',result=check(state,station,medical?'Medicine':'Mechanics',{difficulty:medical?0:2,label:medical?'travel-treatment':'travel-containment'});
    scene.flags[medical?'treated':'contained']=result.success;
    if(medical&&result.success)addLog(state,'log.heal',{points:healCrew(state,Math.max(1,result.effect))});
    addLog(state,result.success?'log.voyage.controlled':'log.voyage.uncontrolled',{name});return true;
  }
  if(choice==='travel-listen'){
    if(check(state,station,'Sensors',{system:'sensors',label:'travel-signals'}).success){state.collector.lastSeenHex=state.collector.hex;state.collector.lastSeenWeek=state.clock.week;addLog(state,'log.rumor',{hex:state.collector.hex});}
    else addLog(state,'log.voyage.noSignal');return true;
  }
  if(story&&choice.startsWith('story-')){
    if(choice==='story-credit'&&story.type==='merchant'){earn(state,5000,'salvage');addLog(state,'log.voyage.friendCredits',{name:story.name,amount:5000});}
    else if(choice==='story-parts'&&story.type==='merchant'){state.ship.partsUntil=Math.max(state.ship.partsUntil,state.clock.week+4);addLog(state,'log.voyage.friendParts',{name:story.name,week:state.ship.partsUntil});}
    else if(choice==='story-celebrate'&&story.type==='birthday'&&spend(state,500,'support')){shiftMorale(state,1,story.personId);addLog(state,'log.voyage.promiseKept',{name:story.name,amount:500});}
    else if(choice==='story-release'&&story.type==='birthday'){shiftMorale(state,-1,story.personId);addLog(state,'log.voyage.promiseBroken',{name:story.name});}
    else return false;
    story.status='complete';story.outcome=choice;story.completedWeek=state.clock.week;return true;
  }
  return false;
}
function finishVoyage(state,rng){
  const scene=state.scene,{event,person}=voyageContext(state);
  if(!scene.flags.safePause){
    if(['fire','leak'].includes(event)&&!scene.flags.contained){const before=state.ship.hull+state.ship.structure;damageShip(state,d6(rng),rng);addLog(state,'log.voyage.incidentDamage',{damage:before-state.ship.hull-state.ship.structure});}
    if(event==='illness'&&!scene.flags.treated&&person){const points=damagePerson(person,1,rng);addLog(state,'log.voyage.illness',{name:person.name,points});}
  }
  if(event==='homesick'&&!scene.flags.gathered){shiftMorale(state,-1);addLog(state,'log.voyage.homesick');}
  const weeksLost=scene.flags.safePause?1:0;
  addLog(state,`log.voyage.event.${event}`);done(state,null);return {closed:true,weeksLost};
}
export function resolveScene(state) {
  const scene=state.scene; if(!scene)return {closed:true,weeksLost:0};const rng=derive(state.meta.seed,'turn',state.clock.week,scene.round,'adversary',scene.type);
  const chosen=n=>scene.choices[n]||'hold'; let weeksLost=0,closed=false,jumpHex=null;let defense=0,overload=0,bluffed=false,assisted=0,repairSuccess=false,inspectionSuccess=false,boarding=false,reward=0,firedThisRound=false,ceasefire=false;
  const type=scene.type;
  const preparationOrder=voyageRules(state)&&type==='breakdown'?[1,3,2,4,5]:[1,2,3,4,5];
  for(const station of preparationOrder) {
    const choice=chosen(station);if(choice==='hold'||!actor(state,station))continue;
    if(voyageRules(state)&&type==='travel'&&voyageAction(state,station,choice))continue;
    if(choice==='surrender'||choice==='yield') { if(type==='repo'){state.ending={type:'repo',score:0};closed=true;break;}let loss=d6(rng)*10;let lost=0;for(const lot of state.cargo){const n=Math.min(loss,lot.tons);lot.tons-=n;loss-=n;lost+=n;}state.cargo=state.cargo.filter(l=>l.tons>0);done(state,'log.pirateToll',{tons:lost});return {closed:true,weeksLost:0}; }
    if(choice==='pay'&&type==='repo') { const amount=state.economy.arrears+20000;if(spend(state,amount,'mortgage')){state.economy.arrears=0;state.economy.arrearsMonths=0;state.collector.pressure=0;state.collector.mode='docked';state.collector.hex=state.subsector.bankHex;done(state,'log.collectorPaid',{amount});return {closed:true,weeksLost:0};} }
    if(choice==='leave'){done(state,'log.sceneLeft');return {closed:true,weeksLost:0};}
    if(choice==='lead'&&type!=='travel'){const result=check(state,station,'Leadership',{label:'leadership'});scene.flags.leadership=result.success;continue;}
    if(choice==='turn-informant'){const person=state.crew.find(p=>p.alive&&p.active!==false&&p.secret==='informant'&&p.revealed&&!p.turned);if(person&&check(state,station,'Leadership',{difficulty:-2,label:'turn-informant'}).success){person.turned=true;for(let i=0;i<2;i++){const adjacent=neighbors(state.collector.hex);const farthest=Math.max(...adjacent.map(h=>distance(h,state.ship.hex)));state.collector.hex=rng.pick(adjacent.filter(h=>distance(h,state.ship.hex)===farthest));}state.collector.lastKnownHex=state.collector.hex;done(state,'log.informantTurned',{name:person.name});return {closed:true,weeksLost:0};}continue;}
    if(choice==='dismiss-informant'){const person=state.crew.find(p=>p.alive&&p.active!==false&&p.secret==='informant'&&p.revealed&&!p.turned);if(person){person.active=false;person.discharged=true;addLog(state,'log.informantDismissed',{name:person.name,station:person.station});}continue;}
    if(choice==='heal') { doctorAction(state);continue; }
    if(choice==='repair') { repairSuccess=repairAction(state,station,assisted);continue; }
    if(choice==='reassure') {const result=check(state,station,'Steward',{label:'reassure'});if(result.success)for(const p of state.crew.filter(c=>c.alive&&c.active!==false))p.mood=Math.min(1,p.mood+1);continue;}
    if(type==='pirate'||type==='repo') {
      if(choice==='evade') { const result=check(state,station,'Pilot',{system:'maneuver',label:'evade'});defense=Math.max(0,result.effect)+overload; }
      if(choice==='approach'){scene.enemy.range='short';check(state,station,'Pilot',{system:'maneuver',label:'approach'});}
      if(choice==='flee') {
        scene.enemy.hostile=true;scene.flags.badFaith=true;
        const result=opposed(state,station,'Pilot',0,rng,type==='repo'?2:1,systemDM(state,'maneuver')+overload,'flee');
        if(result.success)scene.flags.escape=(scene.flags.escape||0)+1;
        if(scene.flags.escape>=2&&state.ship.systems.jump>0&&state.ship.fuel>=20) { const adjacent=state.subsector.worlds.filter(w=>distance(w.hex,state.ship.hex)===1);if(adjacent.length){jumpHex=rng.pick(adjacent).hex;state.collector.pressure+=type==='repo'?1:0;done(state,'log.escape');return {closed:true,weeksLost:0,jumpHex};} }
      }
      if(choice==='overload') {const result=check(state,station,'Engineering',{difficulty:-2,system:'power',label:'overload'});if(result.success)overload=1;else state.ship.systems.power=Math.max(0,state.ship.systems.power-1);}
      if(choice==='aim')state.ship.aim=2;
      if(choice==='fire') { const p=actor(state,station);if(p?.secret==='pacifist'&&!scene.enemy.hostile){p.revealed=true;addLog(state,'log.refused',{name:p.name});continue;}firedThisRound=true;scene.enemy.hostile=true;scene.flags.badFaith=true;const result=check(state,station,'Gunnery',{system:'turret',situation:overload+state.ship.aim+(scene.enemy.range==='long'?-1:0),label:'fire'});state.ship.aim=0;if(result.success){const damage=roll(rng,result.effect>=3?3:2,6);reduceEnemy(scene,damage);addLog(state,'log.hit',{damage,target:'enemy'});}}
      if(choice==='bluff'&&!scene.flags.bluffUsed){const result=opposed(state,station,'Comms',0,rng,1,0,'bluff');scene.flags.bluffUsed=true;bluffed=result.success;}
      if(choice==='negotiate'||choice==='old-friends') {
        if(firedThisRound){addLog(state,'log.ceasefireRequired');continue;}
        if(type==='repo'&&state.collector.bailiff.type==='tired'&&state.collector.negotiated){addLog(state,'log.negotiationRefused');continue;}
        ceasefire=true;
        const bailiffDM=type==='repo'?{courteous:1,zealous:-1,tired:0}[state.collector.bailiff.type]:0;
        const result=opposed(state,station,type==='repo'?'Admin':'Broker',type==='repo'?-2:0,rng,type==='repo'?2:1,(choice==='old-friends'?2:0)+bailiffDM,'negotiate');
        if(type==='repo')state.collector.negotiated=true;
        if(result.success) { if(type==='repo'){const remaining=12-state.economy.billedMonths;state.economy.monthlyPayment=Math.round(state.economy.monthlyPayment*1.1)+(remaining>0?Math.ceil(state.economy.arrears/remaining):0);if(remaining<=0&&rulesAtLeast(state,5))state.economy.deferredBalance+=state.economy.arrears;state.economy.arrears=0;state.economy.arrearsMonths=0;state.collector.pressure=0;state.collector.mode='docked';state.collector.hex=state.subsector.bankHex;}else spend(state,Math.min(state.economy.credits,5000),'other');done(state,'log.negotiated');return {closed:true,weeksLost:0}; }if(type==='repo')state.collector.pressure++;
      }
      if(choice==='bribe'&&type==='repo'){const cost=state.collector.bailiff.type==='tired'?15000:30000;const result=check(state,station,'Streetwise',{difficulty:-4,label:'bribe'});spend(state,cost,'fines');if(result.success){state.collector.hiddenUntil=state.clock.week+8;done(state,'log.bribed',{amount:cost});return {closed:true,weeksLost:0};}scene.enemy.hostile=true;scene.flags.badFaith=true;}
    } else if(type==='patrol'||type==='customs') {
      if(choice==='examine'){const deserter=state.crew.find(p=>p.alive&&p.active!==false&&p.secret==='deserter');if(deserter&&check(state,station,'Medicine',{label:'examine'}).success){deserter.revealed=true;addLog(state,'log.secret',{name:deserter.name,secret:deserter.secret});}}
      if(choice==='hide'){assisted=check(state,station,'Engineering',{difficulty:-2,label:'hide'}).success?2:0;}
      if(['comply','paperwork','cover'].includes(choice)) {const deserter=state.crew.find(p=>p.alive&&p.active!==false&&p.secret==='deserter');const dm=deserter&&currentWorld(state)?.naval?-2:0;if(deserter&&dm)deserter.revealed=true;const result=opposed(state,station,choice==='comply'?'Comms':choice==='cover'?'Streetwise':'Admin',choice==='cover'?0:2,rng,type==='customs'?Math.floor((currentWorld(state)?.law||0)/2):1,assisted+dm,choice==='cover'?'cover':'inspection');inspectionSuccess=inspectionSuccess||result.success;}
      if(choice==='bribe'){const cost=d6(rng)*1000;spend(state,cost,'fines');inspectionSuccess=check(state,station,'Streetwise',{label:'inspection-bribe'}).success;}
    } else if(type==='breakdown') {
      if(choice==='stabilize'){assisted=check(state,station,'Pilot',{label:'stabilize'}).success?1:0;if(voyageRules(state)&&assisted&&chosen(2)==='repair'&&actor(state,2))addLog(state,'log.voyage.assist',{name:actor(state,station).name,recipient:actor(state,2).name,modifier:1});}
      if(choice==='assist'){if(check(state,station,'Mechanics',{difficulty:2,label:'assist'}).success){assisted++;if(voyageRules(state)&&chosen(2)==='repair'&&actor(state,2))addLog(state,'log.voyage.assist',{name:actor(state,station).name,recipient:actor(state,2).name,modifier:1});}}
    } else if(type==='drift') {
      if(choice==='distress'){const result=check(state,station,'Comms',{label:'distress'});spend(state,50000,'other',true);const nearest=[...state.subsector.worlds].sort((a,b)=>distance(state.ship.hex,a.hex)-distance(state.ship.hex,b.hex)||a.hex.localeCompare(b.hex))[0];state.ship.hex=nearest.hex;state.ship.fuel=voyageRules(state)?fuelCapacity(state):30;state.ship.fuelType='raw';weeksLost=result.success?1:d6(rng);done(state,'log.towed',{weeks:weeksLost,amount:50000});return {closed:true,weeksLost};}
      if(choice==='improvise'){const result=check(state,station,'Engineering',{difficulty:-2,label:'improvise'});if(result.success){state.ship.fuel=voyageRules(state)?fuelCapacity(state):30;state.ship.fuelType='raw';state.ship.systems.jump=Math.max(1,state.ship.systems.jump);done(state,'log.improvised');return {closed:true,weeksLost:1};}}
      if(choice==='ration'){if(check(state,station,'Survival',{label:'ration'}).success)scene.flags.rationed=true;}
    } else if(type==='derelict') {
      if(choice==='scan'){assisted=check(state,station,'Sensors',{difficulty:2,system:'sensors',label:'scan'}).success?1:0;}
      if(choice==='salvage'){const result=check(state,station,'Mechanics',{situation:assisted,label:'salvage'});if(result.success){reward+=d6(rng)*5000;state.ship.partsUntil=state.clock.week+4;}else damagePerson(actor(state,station),d6(rng),rng);}
      if(choice==='board'){const result=check(state,station,'Vacc Suit',{situation:assisted+(actor(state,station)?.skills['Zero-G']||0),label:'board'});boarding=result.success;if(boarding)reward+=d6(rng)*10000;else damagePerson(actor(state,station),d6(rng),rng);}
      if(choice==='rescue'){if(check(state,station,'Medicine',{label:'rescue'}).success)reward+=5000;}
    } else if(type==='trader') {if(choice==='assist'){if(check(state,station,'Engineering',{label:'assist-trader'}).success){reward+=10000;if(voyageRules(state)){const fresh=!state.voyage?.stories?.some(s=>s.id==='merchant-contact');rememberStory(state,{id:'merchant-contact',type:'merchant',name:currentWorld(state)?.name||state.ship.hex,worldHex:state.ship.hex});if(fresh)addLog(state,'log.voyage.friend',{name:currentWorld(state)?.name||state.ship.hex});}}}if(choice==='negotiate'){if(check(state,station,'Broker',{label:'trader-broker'}).success)reward+=d6(rng)*5000;}}
    else if(type==='patron'||type.startsWith('mission-')) {
      if(choice==='deliver'||choice==='paperwork'||choice==='negotiate'||choice==='guard'){const result=check(state,station,choice==='guard'?'Gun Combat':choice==='negotiate'?'Broker':'Admin',{situation:type==='mission-smuggle'?-2:0,label:'mission'});if(result.success)scene.flags.delivered=true;}
      if(choice==='accept')scene.flags.delivered=true;
    } else if(type==='travel') {
      if(choice==='lead'){const result=check(state,station,'Leadership',{label:'lead'});if(result.success)for(const p of state.crew.filter(c=>c.alive&&c.active!==false))p.mood=Math.min(1,p.mood+1);}
      if(choice==='cards'){const result=check(state,station,'Carousing',{label:'cards'});if(result.success)earn(state,500,'salvage');else spend(state,500,'other',true);}
      if(choice==='reveal'){const candidate=state.crew.find(p=>p.alive&&p.active!==false&&!p.revealed&&p.secret!=='none');if(candidate&&check(state,station,'Sensors',{situation:state.economy.arrearsMonths,label:'secret'}).success){candidate.revealed=true;addLog(state,'log.secret',{name:candidate.name,secret:candidate.secret});}}
    } else if(type==='repo-sighting'&&choice==='scan')check(state,station,'Sensors',{difficulty:2,label:'sighting'});
  }
  if(type==='pirate'||type==='repo') {
    if(scene.enemy.structure===0||(type==='pirate'&&scene.enemy.hull<scene.enemy.maxHull*.5)) {if(type==='repo'){state.collector.pressure=0;state.collector.mode='docked';state.collector.replacementWeek=state.clock.week+12;state.collector.hex=state.subsector.bankHex;}else earn(state,5000,'salvage');done(state,'log.enemyDefeated');return {closed:true,weeksLost:0};}
    if(scene.enemy.hostile&&!bluffed&&!ceasefire) {const enemy=task({rng,skill:type==='repo'?2:1,characteristic:7,situation:-defense});addLog(state,'log.enemyTask',{effect:enemy.effect},enemy);if(enemy.success){const damage=roll(rng,type==='repo'?2:1,6)*Math.min(2,scene.enemy.count||1);damageShip(state,damage,rng);addLog(state,'log.hit',{damage,target:'ship'});}}
    // The original six-round scene cap made a 60/60 cruiser mathematically
    // indestructible (even 6 × 18 damage cannot reach its 120 points). Hostile repo
    // combat gets twelve rounds; ordinary negotiations and pirates keep six.
    const roundLimit=type==='repo'&&scene.enemy.hostile?12:6;
    if(scene.round>=roundLimit&&!closed) {if(type==='repo'){if(state.ship.structure>0&&state.crew.some(p=>p.alive&&p.active!==false&&!p.unconscious))state.ending={type:'repo',score:0};}else {damageShip(state,d6(rng),rng);done(state,'log.enemyLost');return {closed:true,weeksLost:1};}closed=true;}
  } else if(type==='patrol'||type==='customs') {if(!inspectionSuccess)confiscate(state,rng);else {recordTrace(state);addLog(state,'log.inspectionPassed');}done(state,null);return {closed:true,weeksLost:0};}
  else if(type==='breakdown') {if(repairSuccess||scene.round>=3){if(!repairSuccess){state.ship.systems[scene.system]=Math.max(1,state.ship.systems[scene.system]);spend(state,5000,'repairs',true);weeksLost=1;}done(state,'log.breakdownResolved',{weeks:weeksLost});return {closed:true,weeksLost};}}
  else if(type==='drift') {if(scene.round>=3){spend(state,50000,'other',true);state.ship.fuel=voyageRules(state)?fuelCapacity(state):30;state.ship.systems.jump=Math.max(1,state.ship.systems.jump);const near=[...state.subsector.worlds].sort((a,b)=>distance(state.ship.hex,a.hex)-distance(state.ship.hex,b.hex))[0];state.ship.hex=near.hex;weeksLost=d6(rng);done(state,'log.towed',{weeks:weeksLost,amount:50000});return {closed:true,weeksLost};}}
  else if(type==='derelict'||type==='trader'){earn(state,reward,'salvage');if(boarding&&d6(rng)===6){const p=actor(state,3);damagePerson(p,Math.max(1,roll(rng,2,6)-3),rng);addLog(state,'log.boardingFight',{name:p?.name||'—'});}done(state,'log.salvage',{amount:reward});return {closed:true,weeksLost:0};}
  else if(type.startsWith('mission-')){const contract=state.contracts.find(c=>c.id===scene.contractId);if(contract){if(scene.flags.delivered&&state.clock.week<=contract.deadline){earn(state,contract.pay,'patrons');state.stats.contractsCompleted++;reputation(state,state.ship.hex,1);addLog(state,'log.contractDelivered',{amount:contract.pay});}else {reputation(state,state.ship.hex,-1);addLog(state,'log.contractFailed');}state.contracts=state.contracts.filter(c=>c.id!==contract.id);state.cargo=state.cargo.filter(c=>c.contractId!==contract.id);}done(state,null);return {closed:true,weeksLost:0};}
  else if(type==='travel') {if(voyageRules(state))return finishVoyage(state,rng);const event=scene.event||'quiet-watch';if(event==='fire'||event==='leak'){const result=check(state,2,'Mechanics',{difficulty:2,label:'travel-fire'});if(!result.success)damageShip(state,d6(rng),rng);}if(event==='illness'){doctorAction(state);}if(event==='birthday'||event==='good-meal')for(const p of state.crew.filter(c=>c.alive&&c.active!==false))p.mood=Math.min(1,p.mood+1);if(event==='homesick')for(const p of state.crew.filter(c=>c.alive&&c.active!==false))p.mood=Math.max(-1,p.mood-1);if(event==='rumor'||event==='dream'){state.collector.lastSeenHex=state.collector.hex;state.collector.lastSeenWeek=state.clock.week;addLog(state,'log.rumor',{hex:state.collector.hex});}if(event==='debt'){const bond=state.bonds.find(b=>b.type==='debt'&&b.amount>0);if(bond)addLog(state,'log.bondDebt',{a:state.crew.find(p=>p.id===bond.a)?.name||'',b:state.crew.find(p=>p.id===bond.b)?.name||'',amount:bond.amount});}addLog(state,`log.travel.${event}`);done(state,null);return {closed:true,weeksLost:0};}
  else if(type==='repo-sighting'){state.collector.lastSeenHex=state.collector.hex;state.collector.lastSeenWeek=state.clock.week;done(state,'log.rumor',{hex:state.collector.hex});return {closed:true,weeksLost:0};}
  else if(type==='patron'){done(state);return {closed:true,weeksLost:0};}
  if(closed)return {closed:true,weeksLost};
  scene.round++;scene.choices={};state.stats.rounds++;return {closed:false,weeksLost:0};
}
export const options=sceneOptions;
