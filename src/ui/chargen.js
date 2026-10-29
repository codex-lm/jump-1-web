import {t,esc,portrait,money} from './common.js';
import {CAREER_NAMES} from '../data/careers.js';
import {upp} from '../rules/characteristics.js';
import {rankedSkills,skillList,careerHistory} from './character.js';

function careerEditor(person,index){
  return `<div class="career-editor">
    <label>${esc(t('crew.name'))}<input id="crew-name-${index}" maxlength="48" value="${esc(person.name)}"></label>
    <label>${esc(t('chargen.detailed'))}<select id="crew-career-${index}">${CAREER_NAMES.map(c=>`<option value="${c}" ${c===person.career?'selected':''}>${esc(t(`career.${c}`))}</option>`).join('')}</select></label>
    <label>${esc(t('chargen.terms'))}<select id="crew-terms-${index}">${[1,2,3,4,5].map(n=>`<option ${n===person.terms.length?'selected':''}>${n}</option>`).join('')}</select></label>
    <label>${esc(t('chargen.table'))}<select id="crew-table-${index}">${['personal','service','specialist','advanced'].map((v,i)=>`<option value="${v}">${esc(t(`table.${['Personal Development','Service Skills','Specialist','Advanced'][i]}`))}</option>`).join('')}</select></label>
    <button class="small career-rebuild" data-action="career" data-index="${index}">${esc(t('chargen.changecareer'))}</button>
  </div>`;
}

function characterCard(person,index,state,detailed){
  const skills=rankedSkills(person);
  return `<article class="character-card">
    <div class="character-summary">
      <div class="character-art">${portrait(person)}</div>
      <div class="character-identity"><div class="eyebrow">0${person.station} / ${esc(t(`station.${person.station}`))}</div><h3>${esc(person.name)}</h3><div class="character-meta">${esc(t(`career.${person.career}`))} · ${esc(t('chargen.age',{age:person.age,terms:person.terms.length}))}</div></div>
      <div class="character-strengths"><span class="section-label">${esc(t('crew.strengths'))}</span>${skillList(skills.slice(0,4))}</div>
    </div>
    <div class="character-tools"><details class="character-record" ${detailed?'open':''}><summary>${esc(t(detailed?'chargen.detailed':'crew.fullProfile'))}</summary><div class="character-record-body">
      ${detailed?careerEditor(person,index):''}
      <div class="character-record-columns"><div><h4>${esc(t('crew.careerHistory'))}</h4>${careerHistory(person)}</div><div><h4>${esc(t('crew.skills'))}</h4>${skillList(skills)}<p class="character-upp" title="${esc(t('chargen.upp'))}"><span>STR DEX END INT EDU SOC</span><strong>${esc(upp(person.characteristics))}</strong></p></div></div>
    </div></details>
    ${!state.meta.rerollUsed&&!state.meta.config.daily?`<button class="quiet small character-reroll" data-action="reroll" data-index="${index}" aria-label="${esc(t('chargen.reroll'))}">↻ ${esc(t('chargen.reroll').split(' · ')[0])}</button>`:''}</div>
  </article>`;
}

export function chargenScreen(state,detailed=false){
  const bonds=state.bonds.filter(b=>b.visible).slice(0,4);
  return `<div class="title-nav"><div class="brand-small">JUMP—1</div><div class="actions"><button class="small" data-action="language">FR / EN</button><button class="small" data-action="menu">☰</button></div></div>
    <main class="chargen-screen"><header class="chargen-header"><div class="eyebrow">${esc(t('chargen.kicker'))}</div><h1>${esc(t('chargen.title'))}</h1><p class="section-intro">${esc(t('chargen.description'))}</p><details class="chargen-guide"><summary>${esc(t('title.how'))}</summary><p class="section-intro">${esc(t('chargen.next'))}</p><p class="upp-legend">${esc(t('chargen.upp'))}</p></details><div class="actions"><button class="${!detailed?'active':''}" data-action="express" aria-pressed="${!detailed}">${esc(t('chargen.express'))}</button><button class="${detailed?'active':''}" data-action="detailed" aria-pressed="${detailed}">${esc(t('chargen.detailed'))}</button></div></header>
    <section class="chargen-cards ${detailed?'chargen-cards--detailed':''}">${state.crew.map((p,index)=>characterCard(p,index,state,detailed)).join('')}</section>
    ${bonds.length?`<details class="bonds-preview"><summary>${esc(t('chargen.bonds'))}</summary><ul>${bonds.map(b=>`<li>${esc(state.crew.find(c=>c.id===b.a)?.name)} &amp; ${esc(state.crew.find(c=>c.id===b.b)?.name)} — ${esc(t(`bond.${b.type}`))}</li>`).join('')}</ul></details>`:''}
    <footer class="chargen-bottom"><div><div class="section-label">${esc(t('chargen.cash'))}</div><div class="mono brass chargen-cash">${money(20000+state.crew.reduce((sum,p)=>sum+p.cash,0))} Cr</div></div><div class="actions"><button data-action="how">${esc(t('title.how'))}</button><button class="primary" data-action="board">${esc(t('chargen.begin'))} →</button></div></footer></main>`;
}
