import {t,esc,money,portrait} from './common.js';
import {assetMarkup} from './assets.js';
import {sceneOptions} from '../core/reducer.js';
import {characterStatus} from './character.js';

export function sceneDefaults(state){
  const type=state.scene?.type;
  const preferred={pirate:['evade','repair','aim','heal','negotiate'],repo:['hold','repair','aim','heal','negotiate'],patrol:['comply','hold','hold','examine','paperwork'],customs:['comply','hide','guard','examine','paperwork'],breakdown:['stabilize','repair','assist','heal','reassure'],drift:['hold','improvise','ration','heal','reassure'],derelict:['scan','salvage','board','rescue','hold'],trader:['hold','assist','hold','heal','negotiate'],travel:['lead','repair','cards','heal','reassure'],patron:['accept','hold','hold','hold','negotiate']};
  return Object.fromEntries(state.crew.map(person=>{
    const options=sceneOptions(state.scene,state,person.station);
    const candidate=preferred[type]?.[person.station-1]||(type?.startsWith('mission-')?(person.station===1?'deliver':person.station===5?'paperwork':'hold'):'hold');
    return [person.station,options.some(option=>option.id===candidate)?candidate:'hold'];
  }));
}

function stationChoices(state,person,index,choices){
  const inactive=!person.alive||person.active===false;
  return `<div class="scene-station">
    <button class="scene-person ${inactive?'scene-person--inactive':''}" data-action="crew" data-index="${index}">
      ${portrait(person)}<span><strong>${esc(person.name)}</strong><small class="muted">${esc(t(`station.${person.station}`))}</small>${inactive?`<small class="red">${esc(characterStatus(person))}</small>`:''}</span>
    </button>
    <div class="choices">${sceneOptions(state.scene,state,person.station).map(option=>`<button class="${choices[person.station]===option.id?'active':''}" aria-pressed="${choices[person.station]===option.id}" data-action="scene-choice" data-station="${person.station}" data-choice="${option.id}" ${state.scene.choices[person.station]?'disabled':''}>${esc(t(`choice.${option.id}`))}${option.skill?`<small>${esc(t(`skill.${option.skill}`))} · ${esc(t(`difficulty.${option.difficulty}`))}</small>`:''}${option.cost?`<small>${money(option.cost)} Cr</small>`:''}</button>`).join('')}</div>
  </div>`;
}

export function renderScene(state,choices){
  const scene=state.scene;
  const art={travel:'jumpspace',patron:'bar',breakdown:'sickbay',trader:'port-c','repo-sighting':'repo'}[scene.type]||(scene.type.startsWith('mission-')?'customs':scene.type);
  return `<div class="scene-banner" data-scene="${esc(art)}">${assetMarkup(`scenes/${art}`,t(`scene.${scene.type}`))}<div class="scene-label"><div class="eyebrow">${esc(t('common.week'))} ${state.clock.week} / ${esc(t('common.round'))} ${scene.round}</div><h2>${esc(t(`scene.${scene.type}`))}</h2></div></div>
    <p class="scene-copy">${esc(t(`scene.${scene.type}.text`))}</p>
    ${scene.enemy?`<div class="row between">${assetMarkup(`ships/${scene.type==='repo'?'diligence':'corsair'}`,t(`scene.${scene.type}`),'enemy-ship')}<span class="section-label">${esc(t('scene.enemy'))}</span><span class="mono brass">${scene.enemy.hull} / ${scene.enemy.maxHull}</span></div>`:''}
    <section class="scene-choices">${state.crew.map((person,index)=>stationChoices(state,person,index,choices)).join('')}</section>
    <button class="primary scene-resolve" data-action="resolve">${esc(t('scene.resolve'))} →</button>`;
}
