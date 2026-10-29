import {t,esc,money,portrait} from './common.js';
import {assetMarkup} from './assets.js';
import {sceneOptions} from '../core/reducer.js';
import {characterStatus} from './character.js';
import {characteristicDM} from '../rules/characteristics.js';
import {voyageRules,voyageContext,inspectionProcedure} from '../rules/scenes/index.js';
import {fuelCapacity,repairBonus} from '../rules/ship.js';

const conscious=person=>person.alive&&person.active!==false&&!person.unconscious;
const combat=type=>type==='pirate'||type==='repo';
const inspection=type=>type==='patrol'||type==='customs';
const injuredCrew=state=>state.crew.some(person=>person.alive&&person.active!==false&&['END','STR','DEX'].some(key=>person.characteristics[key]<(person.maxCharacteristics?.[key]??8)));
const damagedSystems=state=>Object.values(state.ship.systems).some(value=>value<3);
const lowMorale=state=>state.crew.some(person=>person.alive&&person.active!==false&&person.mood<1);
const signed=value=>value>=0?`+${value}`:String(value);
const TASK_CHARACTERISTICS={Pilot:'DEX',Engineering:'INT',Mechanics:'INT',Gunnery:'DEX',Medicine:'EDU',Steward:'SOC',Broker:'INT',Admin:'EDU',Streetwise:'INT',Comms:'EDU',Leadership:'SOC',Sensors:'INT',Survival:'END','Vacc Suit':'DEX','Gun Combat':'DEX',Carousing:'SOC'};

// Read-only descriptions mirror the resolver, including its few legacy option
// metadata mismatches. Never call check(), task() or a random generator here.
export function sceneChoiceDetails(state,person,option){
  const type=state.scene?.type||'',id=option.id;
  let skill=option.skill,difficulty=option.difficulty,description=id,opposed=false,reason=null,bonus=0;
  if(voyageRules(state)&&(id.startsWith('travel-')||id.startsWith('story-')))return {skill,difficulty,descriptionKey:`sceneGuide.choice.${id}`,reasonKey:null,opposed:false,bonus:0};
  if(['hold','leave','pay','surrender','yield','aim','accept','dismiss-informant'].includes(id))skill=null;
  if(id==='repair'){bonus=repairBonus(state)+(state.ship.partsUntil>=state.clock.week?2:0);skill='Engineering';difficulty=-2;reason=(type==='breakdown'?state.ship.systems[state.scene.system]>=3:!damagedSystems(state))?'intact':null;}
  if(id==='heal')reason=!injuredCrew(state)?'healthy':null;
  if(id==='reassure')reason=!lowMorale(state)?'highMorale':null;
  if(id==='lead'&&type==='travel'){description='travelLead';reason=!lowMorale(state)?'highMorale':null;}
  if(id==='turn-informant')description='turnInformant';
  if(id==='dismiss-informant')description='dismissInformant';
  if(combat(type)){
    if(id==='aim')reason=state.ship.aim>=2?'aimReady':null;
    if(id==='bluff')reason=state.scene.flags.bluffUsed?'bluffUsed':null;
    if(id==='negotiate'||id==='old-friends'){
      skill=type==='repo'?'Admin':'Broker';difficulty=type==='repo'?-2:0;
      description=type==='repo'?'repoTalk':'pirateTalk';opposed=true;bonus=id==='old-friends'?2:0;
    }
    if(id==='flee'||id==='bluff')opposed=true;
    if(id==='bribe')description='repoBribe';
  }
  if(inspection(type)){
    if(['comply','paperwork','cover'].includes(id)){description='inspection';opposed=true;}
    if(id==='guard'){skill=null;description='guardInspection';reason='guardInspection';}
    if(id==='bribe')description='inspectBribe';
  }
  if(type==='breakdown'&&id==='assist'){description=voyageRules(state)?'earlyAssist':'lateAssist';reason=voyageRules(state)?null:'lateAssist';}
  if(type==='drift'&&id==='ration')reason='ration';
  if(type==='drift'&&voyageRules(state)&&id==='distress')description='v4Distress';
  if(type==='drift'&&voyageRules(state)&&id==='improvise')description='v4Improvise';
  if(type==='trader'&&id==='assist')description='traderAssist';
  if(type==='trader'&&id==='negotiate')description='traderTalk';
  if(type==='patron'&&['accept','paperwork','negotiate'].includes(id))description='patron';
  if(type.startsWith('mission-')&&['deliver','paperwork','negotiate','guard'].includes(id)){description='mission';bonus=type==='mission-smuggle'?-2:0;}
  if(type==='repo-sighting'&&id==='scan'){description='sightingScan';reason='sightingScan';}
  return {skill,difficulty,descriptionKey:`sceneGuide.choice.${description}`,reasonKey:reason?`sceneGuide.choice.${reason}`:null,opposed,bonus};
}

export function sceneDefaults(state){
  const type=state.scene?.type;
  const preferred={pirate:['evade','repair','aim','heal','negotiate'],repo:['hold','repair','aim','heal','negotiate'],patrol:['comply','hold','hold','hold','paperwork'],customs:['comply','hide','hold','hold','paperwork'],breakdown:['stabilize','repair','hold','heal','reassure'],drift:['hold','improvise','hold','heal','reassure'],derelict:['scan','salvage','board','rescue','hold'],trader:['hold','assist','hold','heal','negotiate'],travel:['lead','repair','cards','heal','reassure'],patron:['accept','hold','hold','hold','hold']};
  if(voyageRules(state)){
    preferred.breakdown[2]='assist';
    preferred.customs[1]='hold';
    const {event}=voyageContext(state);
    preferred.travel=['hold',['fire','leak'].includes(event)?'travel-contain':'repair','hold',event==='illness'?'travel-treat':'heal','reassure'];
  }
  return Object.fromEntries(state.crew.map(person=>{
    const options=sceneOptions(state.scene,state,person.station);
    const candidate=preferred[type]?.[person.station-1]||(type?.startsWith('mission-')?(person.station===1?'deliver':person.station===5?'paperwork':'hold'):'hold');
    const option=options.find(option=>option.id===candidate);
    return [person.station,option&&!sceneChoiceDetails(state,person,option).reasonKey?candidate:'hold'];
  }));
}

function aptitude(person,details){
  if(!details.skill)return t('sceneGuide.noRoll');
  const level=person.skills?.[details.skill];
  return Number.isFinite(level)?t('sceneGuide.skill',{skill:t(`skill.${details.skill}`),level}):
    t('sceneGuide.untrained',{skill:t(`skill.${details.skill}`),modifier:signed(Math.min(0,-3+Math.max(0,person.skills?.['Jack-of-all-Trades']||0)))});
}

function choiceCost(state,option){
  if(!option.cost)return '';
  return inspection(state.scene.type)&&option.id==='bribe'?t('sceneGuide.costRange'):t('sceneGuide.costAlways',{amount:money(option.cost)});
}

function selectedDetails(state,person,option){
  const details=sceneChoiceDetails(state,person,option);
  const attribute=TASK_CHARACTERISTICS[details.skill]||'INT';
  const value=person.characteristics?.[attribute]??7;
  return `<div class="scene-order-detail" id="scene-order-${person.station}">
    <p class="${details.reasonKey?'scene-order-caution':''}">${esc(t(details.reasonKey||details.descriptionKey,{fuel:fuelCapacity(state)}))}</p>
    ${details.skill?`<details class="scene-roll-detail"><summary>${esc(aptitude(person,details))} · ${esc(t(`difficulty.${details.difficulty}`))}${details.opposed?` · ${esc(t('sceneGuide.opposed'))}`:''}${details.bonus?` · ${esc(t('sceneGuide.situation',{modifier:signed(details.bonus)}))}`:''}</summary><p>${esc(t('sceneGuide.rollDetail',{attribute,value,modifier:signed(characteristicDM(value))}))}</p>${person.wounded?`<p class="red">${esc(t('sceneGuide.wounded'))}</p>`:''}${person.mood<0?`<p class="red">${esc(t('crew.moodbad'))}</p>`:''}</details>`:''}
  </div>`;
}

function stationChoices(state,person,index,choices){
  const inactive=!conscious(person),locked=Boolean(state.scene.choices[person.station]);
  const options=sceneOptions(state.scene,state,person.station);
  const selected=options.find(option=>option.id===(state.scene.choices[person.station]||choices[person.station]))||options[0];
  const status=!person.alive||person.active===false?characterStatus(person):person.unconscious?t('sceneGuide.unconscious'):person.wounded?t('sceneGuide.wounded'):t('sceneGuide.ready');
  return `<div class="scene-station ${inactive?'scene-station--inactive':''}">
    <button class="scene-person ${inactive?'scene-person--inactive':''}" data-action="crew" data-index="${index}">
      ${portrait(person)}<span><strong>${esc(person.name)}</strong><small class="muted">${esc(t(`station.${person.station}`))}</small><small class="${inactive||person.wounded?'red':'muted'}">${esc(status)}</small>${locked&&!inactive?`<small class="teal">${esc(t('sceneGuide.locked'))}</small>`:''}</span>
    </button>
    <div class="scene-orders"><div class="choices">${options.map(option=>{
      const details=sceneChoiceDetails(state,person,option),active=selected.id===option.id;
      return `<button class="${active?'active':''}" aria-pressed="${active}" ${active?`aria-describedby="scene-order-${person.station}"`:''} data-action="scene-choice" data-station="${person.station}" data-choice="${option.id}" ${locked||inactive?'disabled':''}><span class="scene-option-title">${esc(t(`choice.${option.id}`))}${active?`<span class="scene-selected-label">${esc(t('sceneGuide.selected'))}</span>`:''}</span><small>${esc(aptitude(person,details))}${details.skill?` · ${esc(t(`difficulty.${details.difficulty}`))}`:''}</small>${option.cost?`<small>${esc(choiceCost(state,option))}</small>`:''}</button>`;
    }).join('')}</div>${inactive?`<p id="scene-order-${person.station}" class="scene-order-detail muted">${esc(t('sceneGuide.inactive'))}</p>`:selectedDetails(state,person,selected)}</div>
  </div>`;
}

export function sceneWarnings(state,choices){
  const selected=station=>state.scene.choices[station]||choices[station]||'hold';
  const available=station=>conscious(state.crew.find(person=>person.station===station)||{});
  const messages=[];
  if(available(1)&&['leave','surrender','yield','pay'].includes(selected(1)))messages.push('sceneGuide.criticalChoice');
  if(combat(state.scene.type)&&available(3)&&available(5)&&selected(3)==='fire'&&['negotiate','old-friends'].includes(selected(5)))messages.push('sceneGuide.fireTalk');
  if(available(1)&&selected(1)==='flee')messages.push('sceneGuide.fleeRequirements');
  return messages;
}

function objective(state){
  const scene=state.scene,type=scene.type;
  const event=voyageRules(state)&&type==='travel'?voyageContext(state).event:null;
  const key=event&&['fire','leak'].includes(event)?'travelHazard':event==='illness'?'travelIllness':inspection(type)?'inspection':type.startsWith('mission-')?'mission':type==='repo-sighting'?'sighting':type;
  const contract=type.startsWith('mission-')?state.contracts.find(contract=>contract.id===scene.contractId):null;
  return `<section class="scene-objective"><h3>${esc(t('sceneGuide.objective'))}</h3><p>${esc(t(`sceneGuide.goal.${key}`,{system:t(`system.${scene.system||'jump'}`)}))}</p>${contract?`<p class="scene-contract">${esc(t('sceneGuide.contract',{amount:money(contract.pay),week:contract.deadline}))}</p>${state.clock.week>contract.deadline?`<p class="red">${esc(t('sceneGuide.contractLate'))}</p>`:''}`:''}</section>`;
}

function inspectionCompact(state){
  const orders=inspectionProcedure(state);
  return `<section class="inspection-compact"><h3>${esc(t('voyage.inspection.title'))}</h3><p>${esc(t('voyage.inspection.explain'))}</p><ul>${state.crew.filter(p=>orders[p.station]!=='hold').map(p=>`<li><strong>${esc(p.name)}</strong> · ${esc(t(`choice.${orders[p.station]}`))}</li>`).join('')}</ul><p class="scene-order-caution">${esc(t('voyage.inspection.risk'))}</p><div class="actions"><button class="primary" data-action="inspection-procedure">${esc(t('voyage.inspection.proceed'))}</button><button data-action="inspection-details">${esc(t('voyage.inspection.details'))}</button></div></section>`;
}

function voyageIntroduction(state){
  const {event,person,story}=voyageContext(state),name=person?.name||'—';
  return `<section class="voyage-event"><span class="eyebrow">${esc(t('voyage.eventLabel'))}</span><h3>${esc(t(`voyage.title.${event}`))}</h3><p>${esc(t(`voyage.event.${event}`,{name}))}</p>${story?`<aside class="voyage-followup"><strong>${esc(t(`voyage.story.${story.type}.title`))}</strong><p>${esc(t(`voyage.story.${story.type}.text`,{name:story.name}))}</p></aside>`:''}</section>`;
}

export function renderScene(state,choices,{inspectionDetailed=false}={}){
  const scene=state.scene;
  const ordinaryOrders={1:'comply',2:'hold',3:'hold',4:'hold',5:'paperwork'};
  const compactAvailable=voyageRules(state)&&inspection(scene.type)&&Object.entries(scene.choices).every(([station,choice])=>choice==='hold'||choice===ordinaryOrders[station]);
  const art={travel:'jumpspace',patron:'bar',breakdown:'sickbay',trader:'port-c','repo-sighting':'repo'}[scene.type]||(scene.type.startsWith('mission-')?'customs':scene.type);
  const intro=`<div class="scene-banner" data-scene="${esc(art)}">${assetMarkup(`scenes/${art}`,t(`scene.${scene.type}`))}<div class="scene-label"><div class="eyebrow">${esc(t('common.week'))} ${state.clock.week} / ${esc(t('common.round'))} ${scene.round}</div><h2>${esc(t(`scene.${scene.type}`))}</h2></div></div>
    ${voyageRules(state)&&scene.type==='travel'?voyageIntroduction(state):`<p class="scene-copy">${esc(t(`scene.${scene.type}.text`))}</p>`}`;
  if(compactAvailable&&!inspectionDetailed)return intro+inspectionCompact(state);
  return `${intro}
    ${compactAvailable?`<button class="quiet small" data-action="inspection-summary">${esc(t('voyage.inspection.summary'))}</button>`:''}
    ${objective(state)}
    ${scene.enemy?`<div class="row between scene-enemy-status">${assetMarkup(`ships/${scene.type==='repo'?'diligence':'corsair'}`,t(`scene.${scene.type}`),'enemy-ship')}<div><span>${esc(t('scene.enemy'))}: <strong class="mono brass">${scene.enemy.hull} / ${scene.enemy.maxHull}</strong></span><small>${esc(t('sceneGuide.enemyStructure',{points:scene.enemy.structure}))}</small></div><div><span>${esc(t('sceneGuide.combatLimit',{round:scene.round,limit:scene.type==='repo'&&scene.enemy.hostile?12:6}))}</span>${scene.flags.escape?`<small>${esc(t('sceneGuide.fleeProgress',{count:Math.min(2,scene.flags.escape)}))}</small>`:''}</div></div>`:''}
    <div class="scene-plan-intro"><h3>${esc(t('sceneGuide.plan'))}</h3><p>${esc(t('sceneGuide.planHint'))}</p></div>
    <section class="scene-choices">${state.crew.map((person,index)=>stationChoices(state,person,index,choices)).join('')}</section>
    <div class="scene-resolution">${sceneWarnings(state,choices).map(key=>`<p class="scene-plan-warning">${esc(t(key))}</p>`).join('')}<p>${esc(t(voyageRules(state)&&scene.type==='breakdown'?'sceneGuide.resolvePrepared':'sceneGuide.resolveHint'))}</p><button class="primary scene-resolve" data-action="resolve">${esc(t('sceneGuide.resolve'))} →</button></div>`;
}
