import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../src/core/state.js';
import {createScene} from '../src/rules/scenes/index.js';
import {sceneOptions} from '../src/core/reducer.js';
import {chargenScreen} from '../src/ui/chargen.js';
import {characterSheet,rankedSkills} from '../src/ui/character.js';
import {renderScene,sceneDefaults} from '../src/ui/scene.js';
import {t,setLanguage} from '../src/ui/i18n.js';
import {esc} from '../src/ui/html.js';

test('compact dossiers retain every skill and characteristic without revealing a private history or mutating a save',()=>{
  setLanguage('en');
  const state=createInitialState('character-dossier');
  const person=state.crew[0];
  person.skills={Comms:1,Pilot:1,Survival:2,Engineering:0,Medicine:0,Leadership:1};
  person.revealed=false;
  const before=JSON.stringify(person);
  const html=characterSheet(person);
  assert.equal(JSON.stringify(person),before);
  assert.match(html,/crew-dossier/);
  assert.ok(html.includes(esc(t('crew.hidden'))));
  assert.ok(!html.includes(esc(t(`secret.${person.secret}`))));
  for(const [skill,value]of Object.entries(person.skills)){
    assert.ok(html.includes(`<span>${esc(t(`skill.${skill}`))}</span><strong>${value}</strong>`));
  }
  for(const [key,value]of Object.entries(person.characteristics))assert.ok(html.includes(`<dt>${key}</dt><dd>${value}</dd>`));
  assert.ok(characterSheet(person,{showSecrets:true}).includes(esc(t(`secret.${person.secret}`))));
  person.revealed=true;
  assert.ok(characterSheet(person).includes(esc(t(`secret.${person.secret}`))));
  assert.deepEqual(rankedSkills(person).map(([name])=>name),['Survival','Comms','Leadership','Pilot','Engineering','Medicine']);
});

test('crew creation keeps onboarding, all five career editors, and the once-per-voyage reroll restriction',()=>{
  setLanguage('fr');
  const state=createInitialState('character-editors');
  state.crew[0].name='<capitaine & co>';
  const express=chargenScreen(state);
  assert.ok(express.includes(esc(t('chargen.next'))));
  assert.ok(express.includes(esc(t('chargen.upp'))));
  assert.ok(express.includes('&lt;capitaine &amp; co&gt;'));
  assert.equal((express.match(/data-action="reroll"/g)||[]).length,5);
  assert.doesNotMatch(express,/id="crew-career-/);
  const detailed=chargenScreen(state,true);
  for(let i=0;i<5;i++){
    for(const field of ['name','career','terms','table'])assert.ok(detailed.includes(`id="crew-${field}-${i}"`));
    assert.ok(detailed.includes(`data-action="career" data-index="${i}"`));
  }
  assert.equal((detailed.match(/class="character-record" open/g)||[]).length,5);
  state.meta.rerollUsed=true;
  assert.doesNotMatch(chargenScreen(state),/data-action="reroll"/);
  state.meta.rerollUsed=false;state.meta.config.daily=true;
  assert.doesNotMatch(chargenScreen(state),/data-action="reroll"/);
  setLanguage('en');
});

test('portrait-led scene choices preserve every legal action, selected order and committed station lock',()=>{
  const state=createInitialState('portrait-choices');
  state.scene=createScene('patrol',state);
  const choices=sceneDefaults(state);
  state.scene.choices[2]='hold';
  const html=renderScene(state,choices);
  const actionButtons=[...html.matchAll(/<button[^>]*data-action="scene-choice"[^>]*>/g)].map(match=>match[0]);
  assert.equal((html.match(/data-action="crew"/g)||[]).length,5);
  for(let station=1;station<=5;station++){
    assert.ok(html.includes(`data-action="crew" data-index="${station-1}"`));
    const buttons=actionButtons.filter(button=>button.includes(`data-station="${station}"`));
    const expected=sceneOptions(state.scene,state,station);
    assert.equal(buttons.length,expected.length);
    for(const option of expected){
      const button=buttons.find(button=>button.includes(`data-choice="${option.id}"`));
      assert.ok(button);
      assert.equal(button.includes(' disabled'),station===2);
      assert.equal(button.includes('aria-pressed="true"'),choices[station]===option.id);
    }
  }
  assert.match(html,/data-action="resolve"/);
});
