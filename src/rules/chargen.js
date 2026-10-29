import { derive } from '../core/rng.js';
import { roll, d6 } from '../core/dice.js';
import { CHARACTERISTICS, characteristicDM, clampCharacteristic, upp } from './characteristics.js';
import { CAREERS, DEFAULT_CAREERS, careerCheck, applyTraining, basicTraining, rankBenefit } from './careers.js';
import { SKILLS, skillName } from './skills.js';
import { generatePersonName, generateName } from '../data/names.js';

export const SECRET_TYPES=['informant','deserter','smuggler','noble','hypochondriac','gambler','ex-pirate','devout','pacifist','none'];
export const STATION_SKILLS=['Pilot','Engineering','Gunnery','Medicine','Broker'];
const tableNames=['personal','service','specialist','advanced'];

function chooseTable(career,crew,index,rng,preferred) {
  const allowed=tableNames.filter(name=>name!=='advanced'||crew.characteristics.EDU>=8);
  if(allowed.includes(preferred)) return preferred;
  const wanted=STATION_SKILLS[index];
  const suitable=allowed.map(name=>({name,n:career.tables[name].filter(s=>skillName(s)===wanted).length})).sort((a,b)=>b.n-a.n);
  return suitable[0].n ? suitable[0].name : rng.pick(allowed);
}

function age(crew,term,rng) {
  if(term<4) return null;
  const total=roll(rng)-term;
  const physical=['STR','DEX','END'];
  // SRD Aging Table. The five-term Jump-1 cap means the lowest result is -3.
  let losses=total<=-5?[2,2,2]:total===-4?[2,2,1]:total===-3?[2,1,1]:total===-2?[1,1,1]:total===-1?[1,1,0]:total===0?[1,0,0]:[0,0,0];
  const offset=rng.int(0,2);
  for(let i=0;i<3;i++) crew.characteristics[physical[(i+offset)%3]]=clampCharacteristic(crew.characteristics[physical[(i+offset)%3]]-losses[i]);
  if(total<=-6) crew.characteristics.INT=clampCharacteristic(crew.characteristics.INT-1);
  return {total,losses};
}

function applyMaterial(crew,benefit,rng) {
  if(/^\+1 /.test(benefit)){applyTraining(crew,benefit);return;}
  const prices={'Low Passage':1000,'Mid Passage':6000,'High Passage':8000};
  if(prices[benefit]) {crew.cash+=prices[benefit];return;}
  // Jump-1 adapts a ship/share benefit to one 50,000 Cr balloon reduction.
  if(/Ship Shares|Courier Vessel/.test(benefit)){crew.shipBenefit+=50000;return;}
  if(benefit==='Weapon') {crew.inventory.push(crew.skills['Gun Combat']!==undefined?'pistol':'knife');return;}
  if(benefit==='Explorers\' Society') {crew.inventory.push('society-membership');return;}
}

/** Deterministic complete lifepath. Choices affect only their labelled streams;
 * six initial characteristics do not change when a career/table is selected.
 * SPEC adaptations: no death in chargen, failed qualification -> Drifter for
 * that term, at most five terms, closed skill list, ship benefit -> balloon.
 */
export function generateCharacter(seed,index=0,options={}) {
  index=Math.max(0,Math.min(4,Math.floor(index)));
  const revision=Number.isInteger(options.reroll)?Math.max(0,Math.min(1,options.reroll)):0;
  const base=derive(seed,'chargen',index,'base',revision);
  const characteristics=Object.fromEntries(CHARACTERISTICS.map(key=>[key,roll(base)]));
  const crew={rerollRevision:revision,id:`crew-${index+1}`,station:index+1,name:generatePersonName(base),gender:base.pick(['female','male','neutral']),age:18,characteristics, maxCharacteristics:{},skills:{},career:DEFAULT_CAREERS[index],rank:0,rankTitle:'',terms:[],careers:[],cash:0,shipBenefit:0,inventory:['jack'],mood:0,secret:derive(seed,'chargen',index,'secret').pick(SECRET_TYPES),revealed:false,alive:true,portrait:base.int(1,16),homeworld:generateName(base),benefits:[]};
  if(typeof options.name==='string'&&options.name.trim()) crew.name=options.name.trim().slice(0,48);
  if(['male','female','neutral'].includes(options.gender)) crew.gender=options.gender;
  if(typeof options.homeworld==='string'&&options.homeworld.trim()) crew.homeworld=options.homeworld.trim().slice(0,32);
  // SRD Background Skills: 3 + Education DM at level zero, before careers.
  // Auto choices are legal primary education skills, plus one origin skill
  // (Low Law -> Gun Combat; Industrial origin -> Broker). They keep express
  // crew capable of their jobs even after a failed career qualification.
  const backgroundChoices=[['Comms','Engineering','Computer','Admin','Mechanics'],['Engineering','Mechanics','Computer','Comms','Admin'],['Gun Combat','Mechanics','Comms','Computer','Engineering'],['Medicine','Computer','Admin','Engineering','Comms'],['Broker','Admin','Comms','Computer','Carousing']][index];
  crew.homeworldCode=index===4?'In':null;
  crew.homeworldLaw=index===2?4:null;
  crew.backgroundSkills=backgroundChoices.slice(0,Math.max(1,Math.min(5,3+characteristicDM(characteristics.EDU))));
  for(const skill of crew.backgroundSkills) crew.skills[skill]=0;
  const requestedTerms=Number.isInteger(options.terms)?options.terms:5;
  const maxTerms=Math.max(1,Math.min(5,requestedTerms));
  let current=CAREERS[options.career]?.id??DEFAULT_CAREERS[index];
  let currentRank=0,trained=new Set(),completed={},ranks={};
  for(let k=0;k<maxTerms;k++) {
    const rng=derive(seed,'chargen',index,'term',k,revision);
    const requested=CAREERS[options.careers?.[k]]?.id??current;
    let career=CAREERS[requested];
    const qualification=trained.has(requested)||requested==='Drifter'?null:careerCheck(rng,career.qualification,characteristics,-trained.size);
    if(qualification&&!qualification.success) career=CAREERS.Drifter;
    if(!trained.has(career.id)) {
      currentRank=0;basicTraining(crew,career,trained.size===0,rng);rankBenefit(crew,career,0);trained.add(career.id);
    }
    const survival=careerCheck(rng,career.survival,characteristics);
    // Career survival has the source's special natural-two failure rule;
    // ordinary task checks deliberately have no automatic 2/12 result.
    if(survival.roll===2) survival.success=false;
    const term={index:k+1,age:22+k*4,career:career.id,requestedCareer:requested,qualification,survival,commission:null,advancement:null,skills:[],events:[],reenlistment:null,injury:null,aging:null,table:null};
    if(qualification) term.events.push(qualification.success?'qualified':'qualificationFailed');
    if(!survival.success) {
      const stat=rng.pick(['STR','DEX','END']);characteristics[stat]=clampCharacteristic(characteristics[stat]-1);term.injury=stat;term.events.push('injured');
    }
    if(survival.success&&career.commission&&currentRank===0) {
      term.commission=careerCheck(rng,career.commission,characteristics);
      if(term.commission.success){currentRank=1;rankBenefit(crew,career,1);term.events.push('commissioned');}
    }
    if(survival.success&&career.advancement&&currentRank>=1&&currentRank<6) {
      term.advancement=careerCheck(rng,career.advancement,characteristics);
      if(term.advancement.success){currentRank++;rankBenefit(crew,career,currentRank);term.events.push('advanced');}
    }
    const rolls=(k===0?2:career.commission?1:2)+(term.commission?.success?1:0)+(term.advancement?.success?1:0);
    for(let j=0;j<rolls;j++) {
      const preferred=options.tables?.[k]??options.table;
      const table=chooseTable(career,crew,index,rng,preferred);
      const die=d6(rng),entry=career.tables[table][die-1];
      term.skills.push({table,die,skill:applyTraining(crew,entry)});term.table=table;
    }
    term.aging=age(crew,k+1,rng);
    if(term.aging?.losses.some(Boolean)) term.events.push('aging');
    if(survival.success) completed[career.id]=(completed[career.id]??0)+1;
    const reenlistment=roll(rng);term.reenlistment={roll:reenlistment,target:career.reenlistment,success:reenlistment>=career.reenlistment,forced:reenlistment===12};
    term.events.push(!survival.success?'discharged':term.reenlistment.success?'reenlisted':'retired');
    term.event=term.events[term.events.length-1];
    crew.terms.push(term);crew.age=term.age;crew.career=career.id;crew.rank=currentRank;crew.rankTitle=career.ranks[currentRank]?.title??'';current=career.id;
    ranks[career.id]=currentRank;
    if(!survival.success || !term.reenlistment.success) break;
  }
  let cashRolls=0,benefitIndex=0;
  for(const careerId of Object.keys(completed)) {
    const career=CAREERS[careerId];
    const careerRank=ranks[careerId]??0;
    const count=completed[careerId]+(careerRank>=6?3:careerRank>=5?2:careerRank>=4?1:0);
    for(let n=0;n<count;n++) {
      const rng=derive(seed,'chargen',index,'benefit',careerId,n,revision);
      const choice=options.benefitChoices?.[benefitIndex++];
      const cash=cashRolls<3&&choice!=='material';
      const die=Math.min(7,d6(rng)+(cash?(crew.age>=38?1:0):(careerRank>=5?1:0)));
      if(cash){cashRolls++;const amount=career.cash[die-1]??0;crew.cash+=amount;crew.benefits.push({type:'cash',die,amount});}
      else {const benefit=career.benefits[die-1]??'—';applyMaterial(crew,benefit,rng);crew.benefits.push({type:'material',die,benefit});}
    }
  }
  crew.careers=[...trained];
  crew.maxCharacteristics={...characteristics};
  crew.upp=upp(characteristics);
  // Defensive assertion guarantees the closed skill list at data boundaries.
  for(const key of Object.keys(crew.skills)) if(!(key in SKILLS)) delete crew.skills[key];
  return crew;
}

export function generateCrew(seed,config={}) {
  return Array.from({length:5},(_,index)=>generateCharacter(seed,index,{...config.crewOptions?.[index],career:config.careers?.[index]??config.crewOptions?.[index]?.career}));
}
