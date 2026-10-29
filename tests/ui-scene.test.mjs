import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../src/core/state.js';
import {createScene,sceneOptions,resolveScene} from '../src/rules/scenes/index.js';
import {renderScene,sceneDefaults,sceneChoiceDetails,sceneWarnings} from '../src/ui/scene.js';
import {catalog} from '../src/i18n/catalog.js';
const sceneGuideCatalog=Object.fromEntries(Object.entries(catalog).filter(([key])=>key.startsWith('sceneGuide.')));
import {t,setLanguage} from '../src/ui/i18n.js';
import {esc} from '../src/ui/html.js';

const TYPES=['pirate','repo','patrol','customs','breakdown','drift','derelict','trader','patron','travel','repo-sighting','mission-courier','mission-escort','mission-smuggle'];
function fixture(type){
  const state=createInitialState(`scene-guide-${type}`);
  state.phase='scene';state.scene=createScene(type,state);
  return state;
}

test('scene guidance remains read-only, keeps all legal choices, and has complete bilingual copy',()=>{
  for(const pair of Object.values(sceneGuideCatalog)){
    assert.equal(pair.length,2);assert.ok(pair[0]&&pair[1]);
    const variables=text=>[...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
    assert.deepEqual(variables(pair[0]),variables(pair[1]));
  }
  for(const type of TYPES){
    const state=fixture(type),before=JSON.stringify(state),choices=sceneDefaults(state);
    const html=renderScene(state,choices);
    assert.equal(JSON.stringify(state),before,type);
    assert.doesNotMatch(html,/>undefined</);
    for(const person of state.crew){
      const options=sceneOptions(state.scene,state,person.station);
      assert.ok(options.some(option=>option.id===choices[person.station]),type);
      for(const option of options){
        assert.ok(html.includes(`data-station="${person.station}" data-choice="${option.id}"`));
        const details=sceneChoiceDetails(state,person,option);
        assert.ok(sceneGuideCatalog[details.descriptionKey],`${type}/${option.id}: ${details.descriptionKey}`);
        if(details.reasonKey)assert.ok(sceneGuideCatalog[details.reasonKey]);
      }
    }
  }
});

test('displayed scene skills follow the actual resolver, including legacy metadata differences',()=>{
  for(const [type,station,id] of [['travel',2,'repair'],['pirate',5,'old-friends'],['repo',5,'negotiate']]){
    const state=fixture(type);state.crew[0].secret='ex-pirate';state.ship.systems.jump=2;
    state.scene.choices={1:'hold',2:'hold',3:'hold',4:'hold',5:'hold',[station]:id};
    const person=state.crew.find(person=>person.station===station);
    const option=sceneOptions(state.scene,state,station).find(option=>option.id===id);
    assert.ok(option,`${type}/${id}`);
    const details=sceneChoiceDetails(state,person,option),next=structuredClone(state);
    resolveScene(next);
    const actual=next.log.find(entry=>entry.key==='log.task'&&entry.params.station===station);
    assert.ok(actual,`${type}/${id}`);
    assert.equal(details.skill,actual.params.skill);
    assert.equal(details.difficulty,actual.params.difficulty);
  }
  for(const [type,station,id] of [['pirate',3,'aim'],['patron',1,'accept']]){
    const state=fixture(type),person=state.crew[station-1];
    state.scene.choices={1:'hold',2:'hold',3:'hold',4:'hold',5:'hold',[station]:id};
    const option=sceneOptions(state.scene,state,station).find(option=>option.id===id);
    assert.equal(sceneChoiceDetails(state,person,option).skill,null);
    resolveScene(state);
    assert.ok(!state.log.some(entry=>entry.key==='log.task'&&entry.params.station===station));
  }
});

test('default orders avoid currently unnecessary care without removing useful treatment',()=>{
  const state=fixture('travel');
  for(const person of state.crew){person.mood=1;person.characteristics={...person.maxCharacteristics};}
  assert.deepEqual(sceneDefaults(state),{1:'hold',2:'hold',3:'cards',4:'hold',5:'hold'});
  state.crew[0].characteristics.END--;
  state.crew[1].mood=0;state.ship.systems.jump=2;
  const choices=sceneDefaults(state);
  assert.equal(choices[2],'repair');assert.equal(choices[4],'heal');assert.equal(choices[5],'reassure');
  for(const type of ['customs','breakdown','drift'])assert.equal(sceneDefaults(fixture(type))[3],'hold');
});

test('committed orders override draft selections and unconscious crew are explicitly inactive',()=>{
  setLanguage('fr');
  const state=fixture('pirate'),choices=sceneDefaults(state);
  state.scene.choices[3]='fire';choices[3]='aim';
  state.crew[1].unconscious=true;
  const html=renderScene(state,choices);
  const buttons=[...html.matchAll(/<button[^>]*data-action="scene-choice"[^>]*>/g)].map(match=>match[0]);
  const committed=buttons.find(button=>button.includes('data-station="3" data-choice="fire"'));
  assert.match(committed,/aria-pressed="true"/);assert.match(committed,/disabled/);
  const inactive=buttons.filter(button=>button.includes('data-station="2"'));
  assert.equal(inactive.length,1);assert.match(inactive[0],/data-choice="hold"/);assert.match(inactive[0],/disabled/);
  assert.ok(html.includes(esc(t('sceneGuide.unconscious'))));
  assert.ok(html.includes(esc(t('sceneGuide.inactive'))));
  setLanguage('en');
});

test('scene warnings explain contradictory or terminating orders without forecasting rolls or exposing secrets',()=>{
  const state=fixture('pirate');
  assert.ok(sceneWarnings(state,{1:'flee',3:'fire',5:'negotiate'}).includes('sceneGuide.fireTalk'));
  assert.ok(sceneWarnings(state,{1:'flee'}).includes('sceneGuide.fleeRequirements'));
  assert.ok(sceneWarnings(state,{1:'yield'}).includes('sceneGuide.criticalChoice'));
  assert.ok(!sceneWarnings(state,{3:'aim',5:'negotiate'}).includes('sceneGuide.fireTalk'));
  const visible=fixture('patrol');visible.crew[0].secret='none';
  const first=renderScene(visible,sceneDefaults(visible));visible.crew[0].secret='noble';
  assert.equal(renderScene(visible,sceneDefaults(visible)),first,'a hidden noble modifier must not leak through the aptitude preview');
});
