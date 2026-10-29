import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createInitialState} from '../src/core/state.js';
import {TRAVEL_EVENTS} from '../src/rules/encounters.js';
import {createScene,resolveScene,sceneOptions,inspectionProcedure,voyageContext} from '../src/rules/scenes/index.js';
import {renderScene,sceneDefaults,sceneChoiceDetails} from '../src/ui/scene.js';
import {setLanguage,hasTranslation,t} from '../src/ui/i18n.js';
import {serialize,deserialize} from '../src/core/state.js';
import {reduce} from '../src/core/reducer.js';
import {renderPort} from '../src/ui/port.js';
import {distance} from '../src/rules/subsector.js';
import {esc} from '../src/ui/html.js';

const hold={1:'hold',2:'hold',3:'hold',4:'hold',5:'hold'};
function fixture(type='travel',event='quiet-watch'){
 const state=createInitialState('voyage-v4',{rulesEdition:4});
 state.meta.config.rulesEdition=4;state.phase='scene';state.bonds=[];state.economy.credits=20000;
 for(const p of state.crew){p.mood=0;p.characteristics={...p.maxCharacteristics};}
 state.scene=createScene(type,state,{event,system:'jump'});state.scene.choices={...hold};
 return state;
}

test('twenty legacy travel resolutions and breakdown retain the frozen v0.3 results',()=>{
 const rows=[];
 for(const event of [...TRAVEL_EVENTS,'breakdown']){
  const state=createInitialState('v04-legacy-'+event);state.meta.config.rulesEdition=3;state.phase='scene';
  state.scene=createScene(event==='breakdown'?'breakdown':'travel',state,{event,system:'jump'});state.ship.systems.jump=1;
  state.scene.choices=event==='breakdown'?{1:'stabilize',2:'repair',3:'assist',4:'heal',5:'reassure'}:{1:'lead',2:'repair',3:'cards',4:'heal',5:'reassure'};
  const choices=state.crew.map(p=>sceneOptions(state.scene,state,p.station)),result=resolveScene(state);
  rows.push({choices,result,crew:state.crew,ship:state.ship,economy:state.economy,log:state.log,scene:state.scene});
 }
 assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),'223169b7b9cdb376da7df1fe3f89ca87b25538ad2480185206ad206a734ad124');
});

test('breakdown preparation precedes repair once and its real bonus is attributed to the helper',()=>{
 const state=fixture('breakdown');state.ship.systems.jump=1;state.crew[2].skills.Mechanics=20;
 state.scene.choices={...hold,2:'repair',3:'assist'};
 const unassisted=structuredClone(state);unassisted.scene.choices[3]='hold';
 resolveScene(unassisted);resolveScene(state);
 const tasks=state.log.filter(e=>e.key==='log.task');
 assert.deepEqual(tasks.map(e=>e.params.station),[3,2]);
 const repair=tasks.find(e=>e.params.station===2),baseline=unassisted.log.find(e=>e.key==='log.task'&&e.params.station===2);
 assert.deepEqual(repair.roll.dice,baseline.roll.dice);
 assert.equal(repair.roll.situation,baseline.roll.situation+1);assert.equal(repair.roll.total,baseline.roll.total+1);
 const attributed=state.log.find(e=>e.key==='log.voyage.assist');
 assert.equal(attributed.params.name,state.crew[2].name);assert.equal(attributed.params.recipient,state.crew[1].name);
});

test('all twenty v4 events are shown before decisions with translated legal contextual choices and no state changes',()=>{
 for(const event of TRAVEL_EVENTS){
  const state=fixture('travel',event);state.scene.choices={};
  const snapshot=JSON.stringify(state),choices=sceneDefaults(state);
  assert.ok(!Object.values(choices).some(id=>['cards','travel-gather','travel-delay','travel-medicine','travel-promise'].includes(id)));
  for(const language of ['en','fr']){
   setLanguage(language);const html=renderScene(state,choices);
   assert.ok(hasTranslation(`voyage.title.${event}`));assert.ok(hasTranslation(`voyage.event.${event}`));
   assert.ok(html.includes(t(`voyage.title.${event}`)));
   assert.ok(html.indexOf('class="voyage-event"')<html.indexOf('class="scene-choices"'));
   assert.ok(!html.includes('undefined'));
   for(const p of state.crew)for(const option of sceneOptions(state.scene,state,p.station)){
    assert.ok(hasTranslation(`choice.${option.id}`),option.id);
    assert.ok(hasTranslation(sceneChoiceDetails(state,p,option).descriptionKey),option.id);
   }
  }
  assert.equal(JSON.stringify(state),snapshot);
 }
 setLanguage('en');
});

test('incident containment rolls once, while a safe pause avoids damage and costs exactly one week',()=>{
 const success=fixture('travel','fire');success.crew[1].skills.Mechanics=20;success.scene.choices[2]='travel-contain';
 const before=success.ship.hull;assert.equal(resolveScene(success).weeksLost,0);
 assert.equal(success.ship.hull,before);assert.equal(success.log.filter(e=>e.key==='log.task').length,1);
 const failure=fixture('travel','leak');failure.crew[1].skills.Mechanics=-20;failure.scene.choices[2]='travel-contain';
 resolveScene(failure);assert.ok(failure.ship.hull>=34&&failure.ship.hull<=39);
 assert.equal(failure.log.filter(e=>e.key==='log.task').length,1);
 const safe=fixture('travel','fire');safe.scene.choices={...hold,1:'travel-delay',2:'travel-contain'};
 assert.deepEqual(resolveScene(safe),{closed:true,weeksLost:1});assert.equal(safe.ship.hull,40);
 assert.equal(safe.log.filter(e=>e.key==='log.task').length,0);
});

test('illness responds to actual care and safe supplies without duplicate treatment checks',()=>{
 const untreated=fixture('travel','illness'),patient=voyageContext(untreated).person,before=patient.characteristics.END;
 resolveScene(untreated);assert.equal(patient.characteristics.END,before-1);
 const supplied=fixture('travel','illness'),cash=supplied.economy.credits;
 supplied.scene.choices={...hold,1:'travel-medicine',4:'travel-treat'};
 resolveScene(supplied);assert.equal(supplied.economy.credits,cash-1000);
 assert.equal(supplied.log.filter(e=>e.key==='log.task').length,0);
 const poor=fixture('travel','illness');poor.economy.credits=999;
 assert.ok(!sceneOptions(poor.scene,poor,1).some(o=>o.id==='travel-medicine'));
});

test('a birthday promise survives serialization and has a one-time concrete follow-up',()=>{
 let state=fixture('travel','birthday');const person=voyageContext(state).person;person.mood=-1;
 const cash=state.economy.credits;state.scene.choices[1]='travel-promise';resolveScene(state);
 assert.equal(state.economy.credits,cash);assert.equal(person.mood,-1);assert.equal(state.voyage.stories[0].status,'open');
 state=deserialize(serialize(state));state.clock.week++;state.phase='scene';state.scene=createScene('travel',state,{event:'quiet-watch'});
 assert.equal(state.scene.followupId,`birthday-${person.id}`);
 state.scene.choices={...hold,1:'story-celebrate'};resolveScene(state);
 assert.equal(state.economy.credits,cash-500);assert.equal(state.crew.find(p=>p.id===person.id).mood,0);
 assert.equal(state.voyage.stories[0].status,'complete');
 state.scene=createScene('travel',state,{event:'birthday'});
 assert.equal(state.scene.followupId,undefined);
 assert.ok(!sceneOptions(state.scene,state,1).some(o=>o.id==='story-celebrate'));
});

test('helping a trader creates one favour, offering cash or parts once rather than a repeatable reward',()=>{
 const state=fixture('trader');state.crew[1].skills.Engineering=20;state.scene.choices[2]='assist';
 const cash=state.economy.credits;resolveScene(state);
 assert.equal(state.economy.credits,cash+10000);assert.equal(state.voyage.stories.length,1);
 state.clock.week++;state.scene=createScene('travel',state,{event:'quiet-watch'});
 assert.deepEqual(sceneOptions(state.scene,state,1).filter(o=>o.id.startsWith('story-')).map(o=>o.id),['story-credit','story-parts']);
 state.scene.choices={...hold,1:'story-credit'};resolveScene(state);
 assert.equal(state.economy.credits,cash+15000);assert.equal(state.voyage.stories[0].status,'complete');
 state.scene=createScene('travel',state,{event:'quiet-watch'});assert.equal(state.scene.followupId,undefined);
 state.scene=createScene('trader',state);state.scene.choices={...hold,2:'assist'};resolveScene(state);
 assert.equal(state.voyage.stories.length,1);assert.equal(state.voyage.stories[0].status,'complete');
});

test('compact inspections are optional, show their risk, and never recommend hiding or bribery',()=>{
 const state=fixture('customs');state.scene.choices={};const snapshot=JSON.stringify(state);
 const procedure=inspectionProcedure(state);assert.deepEqual(procedure,{1:'comply',2:'hold',3:'hold',4:'hold',5:'paperwork'});
 const compact=renderScene(state,sceneDefaults(state));
 assert.ok(compact.includes('data-action="inspection-procedure"'));assert.ok(!compact.includes('class="scene-choices"'));
 assert.ok(compact.includes(t('voyage.inspection.risk')));
 const detailed=renderScene(state,sceneDefaults(state),{inspectionDetailed:true});
 assert.ok(detailed.includes('class="scene-choices"'));assert.ok(detailed.includes('data-choice="bribe"')||state.subsector.worlds.find(w=>w.hex===state.ship.hex).law>6);
 assert.equal(JSON.stringify(state),snapshot);
 state.crew[0].unconscious=true;assert.equal(inspectionProcedure(state)[1],'hold');
 state.scene.choices[2]='hide';
 assert.ok(renderScene(state,sceneDefaults(state)).includes('class="scene-choices"'),'a committed risky order keeps its explicit detail view');
});

test('alternative story endings apply parts or disappointment exactly once',()=>{
 const parts=fixture();parts.voyage={stories:[{id:'merchant-contact',type:'merchant',name:'Oster',status:'open',followupWeek:1}]};
 parts.scene=createScene('travel',parts,{event:'quiet-watch'});parts.scene.choices={...hold,1:'story-parts'};
 const cash=parts.economy.credits;resolveScene(parts);
 assert.equal(parts.economy.credits,cash);assert.equal(parts.ship.partsUntil,parts.clock.week+4);
 assert.equal(parts.voyage.stories[0].outcome,'story-parts');
 const broken=fixture('travel','birthday'),person=voyageContext(broken).person;
 broken.scene.choices[1]='travel-promise';resolveScene(broken);broken.clock.week++;
 broken.scene=createScene('travel',broken,{event:'quiet-watch'});broken.scene.choices={...hold,1:'story-release'};resolveScene(broken);
 assert.equal(person.mood,-1);assert.equal(broken.economy.credits,20000);
 assert.equal(broken.voyage.stories[0].status,'complete');
});

function openSpaceFixture(){
 const state=reduce(createInitialState('open-space-ui',{rulesEdition:4}),{t:'CHARGEN_DONE'});
 const occupied=new Set(state.subsector.worlds.map(w=>w.hex));
 const coordinates=Array.from({length:80},(_,i)=>`${String(Math.floor(i/10)+1).padStart(2,'0')}${String(i%10+1).padStart(2,'0')}`);
 state.ship.hex=coordinates.find(hex=>!occupied.has(hex)&&state.subsector.worlds.some(w=>distance(hex,w.hex)===1));
 assert.ok(state.ship.hex);state.portWeekComplete=true;
 return state;
}

test('open-space port view describes the real ship and links only existing adjacent worlds without mutating state',()=>{
 const state=openSpaceFixture(),snapshot=JSON.stringify(state);
 const expected=state.subsector.worlds.filter(w=>distance(state.ship.hex,w.hex)===1).map(w=>w.hex).sort();
 for(const language of ['en','fr']){
  setLanguage(language);const html=renderPort(state);
  assert.ok(hasTranslation('openSpace.title'));assert.ok(html.includes(t('openSpace.title')));
  assert.ok(html.includes(state.ship.hex));assert.ok(html.includes('30 / 30 t'));
  const linked=[...html.matchAll(/data-action="destination" data-hex="(\d{4})"/g)].map(m=>m[1]).sort();
  assert.deepEqual(linked,expected);
  for(const action of ['fuel-options','repair','refuel','market','recruit','standard'])assert.ok(!html.includes(`data-action="${action}"`),action);
  assert.ok(html.includes('data-action="map"'));assert.ok(html.includes('data-action="stay"'));
 }
 assert.equal(JSON.stringify(state),snapshot);
 const departed=reduce(state,{t:'DEPART',hex:expected[0]});assert.equal(departed.lastError,null);
 setLanguage('en');
});

test('open-space recovery offers maintenance only when valid and explains lack of fuel or nearby worlds',()=>{
 const state=openSpaceFixture();state.ship.systems.jump=0;
 let html=renderPort(state);assert.ok(html.includes(t('openSpace.needRepair')));assert.ok(html.includes('id="order-2"'));
 assert.equal(reduce(state,{t:'PORT_ACTION',station:2,choice:'maintenance'}).lastError,null);
 state.crew[1].unconscious=true;assert.ok(!renderPort(state).includes('id="order-2"'));
 state.crew[1].unconscious=false;state.portActions[2]='maintenance';assert.ok(!renderPort(state).includes('id="order-2"'));
 state.ship.systems.jump=3;state.ship.fuel=1;
 html=renderPort(state);assert.ok(html.includes(t('openSpace.needFuel',{fuel:20})));
 state.ship.fuel=30;state.subsector.worlds=state.subsector.worlds.filter(w=>distance(state.ship.hex,w.hex)>1);
 html=renderPort(state);assert.ok(html.includes(t('openSpace.noWorld')));assert.ok(!html.includes('data-action="destination"'));
 assert.equal(reduce(state,{t:'STAY'}).lastError,null);
});

test('port story reminders name only open commitments and expose no invented claim action',()=>{
 const state=reduce(createInitialState('port-promises',{rulesEdition:4}),{t:'CHARGEN_DONE'});
 state.crew[0].name='<Ari>';state.voyage.stories=[
  {id:'birthday',type:'birthday',personId:state.crew[0].id,name:'Old name',status:'open'},
  {id:'merchant',type:'merchant',name:'Oster',status:'open'},
  {id:'settled',type:'merchant',name:'Settled favour',status:'complete'}
 ];
 const before=JSON.stringify(state),html=renderPort(state);
 assert.ok(html.includes('&lt;Ari&gt;'));assert.ok(html.includes('Oster'));
 assert.ok(!html.includes('Settled favour'));assert.ok(!html.includes('Old name'));
 assert.ok(!html.includes('data-action="story-'));assert.equal(JSON.stringify(state),before);
 state.crew[0].alive=false;assert.ok(!renderPort(state).includes(esc(t('openSpace.birthdayReminder',{name:'<Ari>'}))));
 state.meta.config.rulesEdition=3;assert.ok(!renderPort(state).includes(t('openSpace.memories')));
});
