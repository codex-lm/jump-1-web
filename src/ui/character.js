import {t,esc,portrait} from './common.js';
import {CHARACTERISTICS,upp} from '../rules/characteristics.js';

const STATION_SKILLS={
  1:['Pilot','Navigation','Comms','Leadership','Sensors'],
  2:['Engineering','Mechanics','Computer'],
  3:['Gunnery','Gun Combat','Tactics','Zero-G'],
  4:['Medicine','Sensors','Computer'],
  5:['Broker','Steward','Admin','Streetwise','Comms'],
};

// Presentation only: values and the saved character are never changed.
export function rankedSkills(person){
  const relevant=STATION_SKILLS[person.station]||[];
  return Object.entries(person.skills||{}).sort(([a,av],[b,bv])=>
    bv-av || Number(relevant.includes(b))-Number(relevant.includes(a)) || a.localeCompare(b));
}

export function skillList(skills,classes=''){
  return `<ul class="crew-skills ${esc(classes)}">${skills.map(([skill,level])=>
    `<li><span>${esc(t(`skill.${skill}`))}</span><strong>${level}</strong></li>`).join('')}</ul>`;
}

export function careerHistory(person){
  return `<ol class="career-history">${person.terms.map(term=>`<li><span class="career-age">${term.age}</span><div><strong>${esc(t(`career.${term.career}`))}</strong>${term.skills?.length?`<span>${term.skills.map(({skill})=>esc(t(`skill.${skill}`)===`skill.${skill}`?skill:t(`skill.${skill}`))).join(' · ')}</span>`:''}</div></li>`).join('')}</ol>`;
}

export function characterStatus(person){
  return t(!person.alive?'crew.dead':person.active===false?'crew.discharged':person.mood<0?'crew.moodbad':person.mood>0?'crew.moodgood':'crew.moodneutral');
}

export function characterSheet(person,config={}){
  const skills=rankedSkills(person);
  const secret=person.revealed||config.showSecrets?t(`secret.${person.secret}`):t('crew.hidden');
  return `<div class="crew-sheet">
    <header class="character-modal">
      ${portrait(person)}
      <div class="crew-identity"><div class="eyebrow">${esc(t(`station.${person.station}`))}</div>
        <p>${esc(t(`career.${person.career}`))} · ${esc(t('chargen.age',{age:person.age,terms:person.terms.length}))}</p>
        <span class="crew-mood ${person.mood<0||!person.alive||person.active===false?'red':'teal'}">${esc(characterStatus(person))}</span>
      </div>
    </header>
    <section class="crew-strengths"><h3>${esc(t('crew.strengths'))}</h3>${skillList(skills.slice(0,4),'crew-skills--key')}</section>
    <dl class="crew-personal"><div><dt>${esc(t('crew.inventory'))}</dt><dd>${person.inventory.map(item=>esc(t(`item.${item}`))).join(', ')||'—'}</dd></div><div><dt>${esc(t('crew.secret'))}</dt><dd>${esc(secret)}</dd></div></dl>
    <details class="crew-dossier"><summary>${esc(t('crew.fullProfile'))}</summary>
      <div class="crew-dossier-body"><p class="crew-profile-line">${esc(t('crew.rank',{rank:person.rank}))}<span class="mono">${esc(upp(person.characteristics))}</span></p>
        <dl class="attribute-grid">${CHARACTERISTICS.map(key=>`<div class="attribute"><dt>${key}</dt><dd>${person.characteristics[key]}</dd></div>`).join('')}</dl>
        ${skills.length>4?`<h3>${esc(t('crew.otherSkills'))}</h3>${skillList(skills.slice(4))}`:''}
        ${person.terms.length?`<h3>${esc(t('crew.careerHistory'))}</h3>${careerHistory(person)}`:''}
      </div>
    </details>
  </div>`;
}
