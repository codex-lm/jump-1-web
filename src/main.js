import {createLocal,readSave,validateSave} from './net/local.js';
import {createInitialState,assertState} from './core/state.js';
import {reduce} from './core/reducer.js';
import {hash} from './core/rng.js';
import {distance} from './rules/subsector.js';
import {upp} from './rules/characteristics.js';
import {t,getLanguage,setLanguage,hasTranslation,money} from './ui/i18n.js';
import {esc,icon} from './ui/html.js';
import {loadAssets,attachAssetFallbacks,getAsset} from './ui/assets.js';
import {portrait,worldName,badge,logEntry,logText as logEntryText} from './ui/common.js';
import {titleScreen} from './ui/title.js';
import {chargenScreen} from './ui/chargen.js';
import {characterSheet} from './ui/character.js';
import {shipPanel,shipDetail,shipZoom,loadShipGeometry} from './ui/ship.js';
import {renderPort} from './ui/port.js';
import {renderMap,mountMap} from './ui/map.js';
import {departurePreview,renderDepartureSummary} from './ui/navigation.js';
import {actionReport,renderActionReport} from './ui/feedback.js';
import {renderMarket,cargoManifest,updateMarketTotal} from './ui/cargo.js';
import {renderScene,sceneDefaults} from './ui/scene.js';
import {renderJournal,paymentPanel,contractsPanel,bankPanel} from './ui/journal.js';
import {endScreen,drawRunCard} from './ui/end.js';
import {createAudioPlayer} from './audio/player.js';

const app=document.getElementById('app'),modal=document.getElementById('modal');
let audioStatus=null;
function updateAudioControls(status){
 for(const button of document.querySelectorAll('[data-action="audio-toggle"]')){
  button.setAttribute('aria-pressed',String(status.enabled));button.setAttribute('aria-label',t(status.enabled?'audio.mute':'audio.unmute'));button.setAttribute('aria-description',t(!status.enabled?'audio.off':status.error?'common.unavailable':status.playing?'audio.playing':status.unlocked?'audio.on':'audio.hint'));button.title=`${t(status.enabled?'audio.mute':'audio.unmute')} · ${button.getAttribute('aria-description')}`;
  const label=button.querySelector('[data-audio-label]');if(label)label.textContent=t(status.enabled?'audio.on':'audio.off');
  const image=button.querySelector('[data-audio-icon]');if(image)image.innerHTML=icon(status.enabled?'volume':'muted');
 }
 for(const input of document.querySelectorAll('[data-audio-volume]')){input.value=String(Math.round(status[input.dataset.audioVolume]*100));const output=document.querySelector(`[data-audio-level="${input.dataset.audioVolume}"]`);if(output)output.textContent=`${input.value}%`;}
}
const audio=createAudioPlayer({onStatus(status){audioStatus=status;updateAudioControls(status);}});
function primeAudio(){if(!audioStatus?.unlocked)void audio.unlock();}
function audioControl(compact=true){return `<button class="${compact?'icon-button':'row'}" data-action="audio-toggle" aria-pressed="${audio.isEnabled()}" aria-label="${esc(t(audio.isEnabled()?'audio.mute':'audio.unmute'))}"><span data-audio-icon>${icon(audio.isEnabled()?'volume':'muted')}</span>${compact?'':`<span data-audio-label>${esc(t(audio.isEnabled()?'audio.on':'audio.off'))}</span>`}</button>`;}
function screenAudioContext(){if(screen==='title'||!state||state.phase==='chargen')return 'title';if(state.ending)return state.ending.type==='victory'?'victory':'defeat';if(['pirate','repo','customs','patrol'].includes(state.scene?.type)||(state.collector?.pressure||0)>=2||state.phase==='payment')return 'threat';if(panel==='map'||['travel','drift','breakdown'].includes(state.scene?.type))return 'travel';return 'port';}
let transport=null,state=null,screen='title',titleForm=false,detailed=false,panel='port',journalTab='log',marketTab='goods',mobile='central',selectedHex=null,sceneKey='',choices={},unmountMap=null,toastTimer=0,saveWarning=false,journalOpen=false;
let lastReport=null,shownReport=null,renderedState=null,pendingMapMotion=false,pendingStationMotion=null;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let settings={reduceMotion:motionPreference.matches,font:16};
try{settings={...settings,...JSON.parse(localStorage.getItem('jump1.settings')||'{}')};}catch{}
function motionReduced(){return !!settings.reduceMotion||motionPreference.matches;}
function applySettings(){document.body.classList.toggle('reduce-motion',motionReduced());document.documentElement.style.setProperty('--font-size',`${Math.max(12,Math.min(18,Number(settings.font)||16))}px`);try{localStorage.setItem('jump1.settings',JSON.stringify(settings));}catch{}}
motionPreference.addEventListener('change',applySettings);
function toast(message){const el=document.getElementById('toast');clearTimeout(toastTimer);el.textContent=message;el.classList.add('visible');toastTimer=setTimeout(()=>el.classList.remove('visible'),4200);}
function showModal(title,html,{wide=false}={}){if(modal.open)modal.close();modal.classList.toggle('ship-zoom-modal',wide);modal.innerHTML=`<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="icon-button" data-action="close" aria-label="${esc(t('common.close'))}">${icon('close')}</button></div><div class="modal-body">${html}</div>`;modal.showModal();attachAssetFallbacks(modal);}
const GUIDE_KEY='jump1.guide.v1';let guideShown=false;function guideSeen(){if(guideShown)return true;try{return localStorage.getItem(GUIDE_KEY)==='1';}catch{return false;}}function markGuideSeen(){guideShown=true;try{localStorage.setItem(GUIDE_KEY,'1');}catch{}}
function showHelp(){showModal(t('help.title'),`<div class="help-grid">${[1,2,3].map(i=>`<article class="help-step"><span class="number">0${i}</span><h3>${esc(t(`help.${i}title`))}</h3><p>${esc(t(`help.${i}`))}</p></article>`).join('')}</div><p class="mono muted" style="font-size:.7rem;margin:25px 0 0">${esc(t('help.shortcuts'))}</p>`);}
function showCentral(){mobile='central';if(matchMedia('(max-width:1199px)').matches)journalOpen=false;}
function connectLocal(seed,config,actions=[]){transport?.close();transport=createLocal(seed,config,actions);state=transport.getState();screen='game';panel='port';mobile='central';journalOpen=false;selectedHex=state.ship.hex;sceneKey='';lastReport=null;shownReport=null;renderedState=null;pendingMapMotion=false;pendingStationMotion=null;render();window.scrollTo(0,0);}
function send(action,{quiet=false}={}){
 if(!transport)return false;
 const previous=state,result=transport.send({by:'captain',...action});
 if(result?.error){toast(t(hasTranslation(`error.${result.error}`)?`error.${result.error}`:'common.error'));return false;}
 state=transport.getState();
 if(state.ship.hex!==previous.ship.hex)selectedHex=state.ship.hex;
 if(state.phase!==previous.phase)showCentral();
 audio.onAction(previous,state,action);
 if(!quiet&&(['DEPART','QUICK_STOP','END_WEEK','STAY','PAY','SKIP_PAY'].includes(action.t)||(action.t==='REFUEL'&&state.clock.week!==previous.clock.week)))lastReport=actionReport(previous,state,action.t);
 if(!quiet)render();
 if(result?.saved===false&&!saveWarning){saveWarning=true;toast(t('save.failed'));}
 else if(!quiet&&['BUY','SELL','BOOK_FREIGHT','BOOK_PASSENGER','ACCEPT_CONTRACT','REFUEL','REPAIR','PORT_ACTION'].includes(action.t)){
  const report=actionReport(previous,state,action.t),entry=report?.entries.filter(e=>!e.roll).at(-1)||report?.entries.at(-1);
  if(entry)toast(entry.roll?t(entry.roll.success?'feedback.checkSucceeded':'feedback.checkFailed',{name:entry.params.name,skill:t(`skill.${entry.params.skill}`)}):logEntryText(entry));
 }
 return true;
}
function startRun(seed,config){connectLocal(seed,{...config,portraitEdition:2});send({t:'CHARGEN_EXPRESS'});}
function topbar(){const e=state.economy;return `<header class="topbar"><div class="brand-block"><div class="world-label">${esc(state.subsector.name)}</div><h1 class="ship-name">${esc(state.ship.name)}</h1></div><div class="top-stats"><div class="top-stat" data-hud="week"><span>${esc(t('hud.week',{week:state.clock.week}))}</span><strong>${esc(t('hud.month',{month:state.clock.month}))}</strong></div><div class="top-stat" data-hud="cash"><span>${esc(t('hud.cash'))}</span><strong class="${e.credits<e.nextPayment?'red':'brass'}">${money(e.credits)} Cr</strong></div><div class="top-stat"><span>${esc(t('hud.due'))} · ${esc(t('hud.inweeks',{weeks:Math.max(0,e.nextPaymentWeek-state.clock.week)}))}</span><strong>${money(e.nextPayment)} Cr</strong></div><div class="top-stat"><span>${esc(t('hud.arrears'))}</span><strong class="${e.arrears?'red':''}">${money(e.arrears)}</strong></div><div class="top-stat pressure-stat"><span>${esc(t('hud.pressure'))} · ${state.collector.pressure}</span><div class="pressure" aria-label="${esc(t('hud.pressure'))}: ${state.collector.pressure}">${[1,2,3,4,5].map(i=>`<i class="${state.collector.pressure>=i?'on':''}"></i>`).join('')}</div></div></div><div class="actions">${audioControl()}<button class="small" data-action="language">${getLanguage()==='fr'?'EN':'FR'}</button><button class="icon-button" data-action="menu" aria-label="${esc(t('nav.menu'))}">${icon('settings')}</button></div></header>`;}
function gameScreen(){
 if(state.phase==='chargen')return chargenScreen(state,detailed);
 if(state.ending)return endScreen(state,{audioControls:audioControl()});
 let central;
 if(state.phase==='scene'){
  const key=`${state.meta.actionCount-Object.keys(state.scene.choices).length}:${state.scene.type}:${state.scene.round}`;
  if(sceneKey!==key){choices=sceneDefaults(state);sceneKey=key;}
  central=renderScene(state,choices);
 }else if(state.phase==='payment')central=paymentPanel(state);
 else if(panel==='map')central=renderMap(state,selectedHex);
 else if(panel==='market')central=renderMarket(state,marketTab);
 else if(panel==='ship')central=shipDetail(state);
 else if(panel==='cargo')central=cargoManifest(state,true);
 else if(panel==='contracts')central=contractsPanel(state);
 else central=renderPort(state);
 return `<main class="game" data-mobile="${mobile}" data-journal="${journalOpen?'open':'closed'}">${topbar()}<div class="game-body">
 <aside class="ship-panel">${shipPanel(state)}</aside>
 <section class="central-panel"><nav class="central-nav" aria-label="${esc(t('nav.menu'))}">${['port','map','market','ship'].map(p=>`<button data-action="panel" data-panel="${p}" class="${panel===p?'active':''}" aria-pressed="${panel===p}">${esc(t(`nav.${p}`))}</button>`).join('')}<button class="journal-toggle" data-action="journal-toggle" aria-expanded="${journalOpen}" aria-controls="journal-panel" aria-label="${esc(t(journalOpen?'nav.closejournal':'nav.openjournal'))}">${icon('log')}<span>${esc(t('nav.journal'))}</span></button><button data-action="how" class="help-button" aria-label="${esc(t('title.how'))}">?</button></nav>${state.phase!=='port'||panel==='port'?renderActionReport(lastReport):''}${central}</section>
 <aside class="journal-panel" id="journal-panel" aria-label="${esc(t('nav.journal'))}"><div class="journal-heading"><h3>${esc(t('nav.journal'))}</h3><button class="icon-button" data-action="journal-toggle" aria-label="${esc(t('nav.closejournal'))}">${icon('close')}</button></div>${renderJournal(state,journalTab)}</aside>
 </div><nav class="mobile-tabs">${[['ship','ship'],['central','map'],['journal','log']].map(([p,i])=>`<button data-action="mobile" data-panel="${p}" class="${mobile===p?'active':''}" aria-pressed="${mobile===p}">${icon(i)} ${esc(t(p==='central'?'nav.port':p==='journal'?'nav.journal':'nav.ship'))}</button>`).join('')}</nav></main>`;
}
function render(){
 unmountMap?.();unmountMap=null;
 const scroll=window.scrollY,previous=renderedState;
 const oldMeters=new Map([...app.querySelectorAll('[role="meter"]')].map(el=>[el.getAttribute('aria-label'),Number(el.getAttribute('aria-valuenow'))]));
 app.innerHTML=screen==='title'?titleScreen({form:titleForm,saved:!!readSave(),audioEnabled:audio.isEnabled()}):gameScreen();
 attachAssetFallbacks(app);
 const animate=!motionReduced(),report=app.querySelector('.action-report');
 if(screen==='game'&&state?.phase==='port'&&panel==='map')unmountMap=mountMap(state,selectedHex,hex=>selectDestination(hex),{animateRoute:animate&&pendingMapMotion});
 if(animate){
  if(pendingMapMotion)app.querySelector('.destination-heading')?.classList.add('motion-reveal');
  if(pendingStationMotion)app.querySelector(`[data-action="scene-choice"][data-station="${pendingStationMotion}"]`)?.closest('.scene-station')?.classList.add('motion-chosen');
  if(report&&lastReport!==shownReport){report.classList.add('motion-new');if(lastReport?.arrival)app.querySelector('.world-header')?.classList.add('motion-reveal');}
  if(screen==='game'&&previous&&previous!==state){
   const delta=state.economy.credits-previous.economy.credits;
   if(delta)app.querySelector('[data-hud="cash"]')?.classList.add(delta>0?'resource-gain':'resource-loss');
   if(state.clock.week!==previous.clock.week)app.querySelector('[data-hud="week"]')?.classList.add('motion-chosen');
   for(const meter of app.querySelectorAll('[role="meter"]')){const old=oldMeters.get(meter.getAttribute('aria-label')),value=Number(meter.getAttribute('aria-valuenow'));if(old!==undefined&&value!==old)meter.closest('.meter')?.classList.add(value>old?'resource-gain':'resource-loss');}
   if(state.phase==='scene'&&(previous.phase!=='scene'||previous.scene?.type!==state.scene?.type))app.querySelector('.scene-banner')?.classList.add('motion-reveal');
  }
 }
 if(report)shownReport=lastReport;
 pendingMapMotion=false;pendingStationMotion=null;renderedState=screen==='game'?state:null;
 if(screen==='game'&&state?.phase==='port'&&!state.stats?.jumps&&!modal.open&&!guideSeen()){markGuideSeen();showHelp();}
 if(state?.ending&&screen==='game')document.fonts.ready.then(()=>drawRunCard(state));
 window.scrollTo({top:scroll,behavior:'auto'});audio.setContext(screenAudioContext());if(audioStatus)updateAudioControls(audioStatus);
}
function showMenu(){showModal(t('menu.title'),`<p class="section-intro">${esc(t('menu.saved'))}</p><div class="stack">${audioControl(false)}<label>${esc(t('audio.music'))}<span class="row"><input type="range" min="0" max="100" data-audio-volume="music" aria-label="${esc(t('audio.music'))}"><output data-audio-level="music"></output></span></label><label>${esc(t('audio.effects'))}<span class="row"><input type="range" min="0" max="100" data-audio-volume="sfx" aria-label="${esc(t('audio.effects'))}"><output data-audio-level="sfx"></output></span></label>${state?`<button data-action="export">${esc(t('menu.export'))}</button>`:''}<button data-action="load-save">${esc(t('menu.import'))}</button><button data-action="about">${esc(t('title.about'))}</button><label class="row"><input id="setting-motion" type="checkbox" ${motionReduced()?'checked':''} ${motionPreference.matches?'disabled':''}>${esc(t('menu.reduce'))}</label>${motionPreference.matches?`<small class="muted">${esc(t('motion.system'))}</small>`:''}<label>${esc(t('menu.font'))}<input id="setting-font" type="range" min="12" max="18" value="${settings.font}"></label><button data-action="home">${esc(t('menu.titleback'))}</button>${state&&!state.ending?`<button class="danger" data-action="abandon-prompt">${esc(t('menu.abandon'))}</button>`:''}</div>`);if(audioStatus)updateAudioControls(audioStatus);}
async function showAbout(licences=false){showModal(t('about.title'),`<div class="tabs"><button data-action="about" class="${!licences?'active':''}">${esc(t('about.game'))}</button><button data-action="licences" class="${licences?'active':''}">${esc(t('about.licences'))}</button></div>${licences?'<pre id="licence-text"></pre>':`<p>${esc(t('about.description'))}</p><p>${esc(t('about.compatible'))}</p><small class="muted">${esc(t('about.version'))}</small>`}`);if(licences){try{const result=await fetch(new URL('../OGL.md', import.meta.url));if(!result.ok)throw new Error();const text=await result.text();const target=document.getElementById('licence-text');if(target)target.textContent=text;}catch{const target=document.getElementById('licence-text');if(target)target.textContent=t('common.unavailable');}}}
function showCrew(index){const p=state.crew[index];if(p)showModal(p.name,characterSheet(p,state.meta.config));}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportSave(){const save=transport?.exportSave();if(save)download(new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),`jump-1-${state.meta.seed.replace(/[^a-z0-9-]/gi,'-')}.json`);}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast(t('common.copied'));}catch{showModal(t('common.copy'),`<input readonly value="${esc(text)}">`);modal.querySelector('input')?.select();}}
function selectDestination(hex){pendingMapMotion=hex!==selectedHex;selectedHex=hex;panel='map';showCentral();render();const heading=document.querySelector('.destination-heading');if(heading){const r=heading.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)heading.scrollIntoView({block:'start',behavior:'auto'});}}
function depart(hex,quick=false){
 if(!hex||state.phase!=='port')return;
 const preview=departurePreview(state,hex,{quick});
 showModal(t('map.confirm',{world:worldName(state,hex)}),`<p class="destination-route">${esc(t('navigation.fromTo',{origin:`${worldName(state,state.ship.hex)} (${state.ship.hex})`,destination:`${worldName(state,hex)} (${hex})`}))}</p>${renderDepartureSummary(state,hex,{quick})}<div class="actions departure-confirm"><button data-action="close">${esc(t('common.cancel'))}</button><button class="primary" data-action="confirm-depart" data-hex="${esc(hex)}" data-quick="${quick?'1':'0'}" ${preview.canDepart?'':'disabled'}>${esc(t(quick?'feedback.confirmQuick':'feedback.confirmDepart'))}</button></div>`);
}
function executeDeparture(hex,quick){
 modal.close();
 panel='port';showCentral();
 if(send({t:quick?'QUICK_STOP':'DEPART',hex}))window.scrollTo(0,0);
}
function showFuelOptions(){
 const world=state.subsector.worlds.find(w=>w.hex===state.ship.hex),tons=30-state.ship.fuel;
 const sells=['A','B','C','D'].includes(world?.starport),refined=['A','B'].includes(world?.starport),cost=Math.ceil(tons*(refined?500:100));
 showModal(t('feedback.fuelOptions'),`<p>${esc(t('feedback.fuelLevel',{fuel:state.ship.fuel}))}</p>${sells?`<p>${esc(t('feedback.buyFuel',{tons,amount:money(cost),type:t(refined?'fuel.refined':'fuel.raw')}))}</p><button class="primary" data-action="refuel" ${tons<=0||cost>state.economy.credits?'disabled':''}>${esc(t('ship.refuel'))}</button>`:`<p>${esc(t('navigation.noFuel'))}</p>`}${refined&&state.ship.fuelType==='raw'&&state.ship.fuel>0?`<p class="navigation-warning">${esc(t('feedback.mixedFuel'))}</p><button data-action="purge" ${state.economy.credits<15000?'disabled':''}>${esc(t('ship.purge'))}</button>`:''}${world?.gasGiant?`<hr class="rule"><p>${esc(t('feedback.skimWarning'))}</p><button data-action="confirm-skim" ${tons<=0?'disabled':''}>${esc(t('ship.skim'))}</button>`:''}`);
}
function standardWeek(){
 if(state?.phase!=='port')return;
 const previous=state,orders=[...document.querySelectorAll('[id^="order-"]')].filter(e=>!e.disabled).map(e=>({station:Number(e.id.split('-')[1]),choice:e.value}));
 for(const order of orders)send({t:'PORT_ACTION',by:order.station,...order},{quiet:true});
 send({t:'END_WEEK',routines:orders.length===0},{quiet:true});lastReport=actionReport(previous,state,'END_WEEK');render();window.scrollTo(0,0);
}
async function handleAction(button){const action=button.dataset.action;if(button.disabled)return;if(['close','language','new','how','menu','about','licences','home','panel','mobile','journal-tab','map','market','market-tab','cargo','crew','system','ship-zoom','records'].includes(action))audio.onAction(null,null,{t:'UI_CLICK'});switch(action){
 case 'close':modal.close();break;
 case 'dismiss-report':lastReport=null;render();break;
 case 'report-log':journalTab='log';journalOpen=true;mobile='journal';render();document.getElementById('journal-panel')?.scrollIntoView({block:'start'});break;
 case 'destination':selectDestination(button.dataset.hex);break;
 case 'confirm-depart':executeDeparture(button.dataset.hex,button.dataset.quick==='1');break;
 case 'audio-toggle':primeAudio();audio.setEnabled(!audio.isEnabled());break;
 case 'language':setLanguage(getLanguage()==='fr'?'en':'fr');if(modal.open)modal.close();render();break;
 case 'new':titleForm=true;render();document.querySelector('[name=shipName]')?.focus();break;
 case 'daily':{const seed=`daily-${new Date().toISOString().slice(0,10)}`;startRun(seed,{difficulty:'normal',daily:true,shipName:t('title.defaultship')});break;}
 case 'resume':{const save=readSave();if(save){try{connectLocal(save.seed,save.config,save.actions);}catch{toast(t('save.invalid'));}}else toast(t('save.nosave'));break;}
 case 'coop':toast(t('net.coming'));break;
 case 'records':{let history=[];try{const value=JSON.parse(localStorage.getItem('jump1.history.v1')||'[]');if(Array.isArray(value))history=value.slice(0,10);}catch{}showModal(t('title.records'),history.length?history.map(r=>`<article class="cargo-item"><div class="row between"><strong>${esc(r.shipName)}</strong><span class="mono brass">${money(r.ending?.score)}</span></div><p class="muted" style="font-size:.75rem;margin:8px 0">${esc(t(`end.${r.ending?.type}`))} · ${esc(r.seed)}</p></article>`).join(''):`<p>${esc(t('records.empty'))}</p>`);break;}
 case 'how':showHelp();break;
 case 'menu':showMenu();break;
 case 'about':await showAbout();break;
 case 'licences':await showAbout(true);break;
 case 'home':modal.close();screen='title';titleForm=false;render();window.scrollTo(0,0);break;
 case 'export':exportSave();break;
 case 'load-save':document.getElementById('import-file').click();break;
 case 'abandon-prompt':showModal(t('menu.abandon'),`<p>${esc(t('menu.abandonconfirm'))}</p><div class="actions"><button data-action="close">${esc(t('common.cancel'))}</button><button class="danger" data-action="abandon">${esc(t('common.confirm'))}</button></div>`);break;
 case 'abandon':modal.close();send({t:'ABANDON'});break;
 case 'express':detailed=false;send({t:'CHARGEN_EXPRESS'});break;
 case 'detailed':detailed=true;render();break;
 case 'reroll':send({t:'CHARGEN_ROLL',index:Number(button.dataset.index)});break;
 case 'career':{const index=Number(button.dataset.index);send({t:'CHARGEN_PICK',index,name:document.getElementById(`crew-name-${index}`).value,career:document.getElementById(`crew-career-${index}`).value,terms:Number(document.getElementById(`crew-terms-${index}`).value),table:document.getElementById(`crew-table-${index}`).value});break;}
 case 'board':send({t:'CHARGEN_DONE'});window.scrollTo(0,0);break;
 case 'panel':panel=button.dataset.panel;showCentral();render();break;
 case 'mobile':mobile=button.dataset.panel;render();break;
 case 'journal-toggle':{if(matchMedia('(max-width:900px)').matches){mobile=mobile==='journal'?'central':'journal';}else journalOpen=!journalOpen;render();document.querySelector(journalOpen?'#journal-panel .journal-heading button':'.journal-toggle')?.focus();break;}
 case 'journal-tab':journalTab=button.dataset.tab;render();break;
 case 'map':panel='map';showCentral();render();break;
 case 'market':marketTab=button.dataset.tab||'goods';panel='market';showCentral();render();break;
 case 'market-tab':marketTab=button.dataset.tab;render();break;
 case 'cargo':panel='cargo';showCentral();render();break;
 case 'crew':showCrew(Number(button.dataset.index));break;
 case 'ship-zoom':showModal(state.ship.name,shipZoom(state),{wide:true});break;
 case 'system':{const id=button.dataset.system;showModal(t(`system.${id}`),`<p class="mono brass">${esc(t('ship.damage',{value:state.ship.systems[id]}))}</p><p>${esc(t('ship.repaircost'))}</p><button data-action="repair" data-system="${id}" ${state.phase!=='port'?'disabled':''}>${esc(t('ship.repair'))}</button>`);break;}
 case 'order':{const station=Number(button.dataset.station);send({t:'PORT_ACTION',by:station,station,choice:document.getElementById(`order-${station}`).value});break;}
 case 'standard':standardWeek();break;
 case 'stay':send({t:'STAY'});break;
 case 'fuel-options':showFuelOptions();break;
 case 'refuel':if(send({t:'REFUEL'}))modal.close();break;
 case 'skim':showFuelOptions();break;
 case 'confirm-skim':modal.close();send({t:'REFUEL',type:'skim'});break;
 case 'purge':if(send({t:'REFUEL',type:'refined',purge:true}))modal.close();break;
 case 'repair':send({t:'REPAIR',system:button.dataset.system||'all'});if(modal.open)modal.close();break;
 case 'buy':send({t:'BUY',goodId:button.dataset.good,tons:Number(document.getElementById(`qty-${button.dataset.id}`).value)});break;
 case 'sell':{const lot=state.cargo.find(l=>l.id===button.dataset.id);send({t:'SELL',cargoId:lot.id,tons:lot.tons});break;}
 case 'freight':send({t:'BOOK_FREIGHT',id:button.dataset.id});break;
 case 'passenger':send({t:'BOOK_PASSENGER',id:button.dataset.id,count:Number(document.getElementById(`paxcount-${button.dataset.id}`).value)});break;
 case 'contract':send({t:'ACCEPT_CONTRACT',id:button.dataset.id});break;
 case 'recruit':send({t:'RECRUIT',station:Number(button.dataset.station)});break;
 case 'depart':depart(button.dataset.hex);break;
 case 'quick':depart(button.dataset.hex,true);break;
 case 'scene-choice':pendingStationMotion=button.dataset.station;choices[button.dataset.station]=button.dataset.choice;render();break;
 case 'resolve':{const previous=state;const type=state.scene.type,round=state.scene.round;const selected={...choices};for(let station=1;station<=5;station++){if(state.phase!=='scene'||state.scene.type!==type||state.scene.round!==round)break;if(state.scene.choices[station]||!state.crew[station-1]?.alive||state.crew[station-1]?.active===false)continue;send({t:'SCENE_CHOICE',by:station,station,choice:selected[station]||'hold'},{quiet:true});}sceneKey='';lastReport=actionReport(previous,state,'RESOLVE');render();window.scrollTo(0,0);break;}
 case 'pay':send({t:'PAY'});break;
 case 'partpay':send({t:'PAY',amount:Math.max(1,Math.floor(state.economy.credits))});break;
 case 'skippay':send({t:'SKIP_PAY'});break;
 case 'arrears':send({t:'PAY',amount:state.economy.arrears});break;
 case 'replay':startRun(state.meta.seed,state.meta.config);window.scrollTo(0,0);break;
 case 'copy-seed':await copyText(state.meta.seed);break;
 case 'download-card':{const c=document.getElementById('run-card');c?.toBlob(blob=>blob&&download(blob,`jump-1-${state.meta.seed}.png`),'image/png');break;}
 case 'copy-card':{try{const c=document.getElementById('run-card');const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);toast(t('common.copied'));}catch{toast(t('common.unavailable'));}break;}
 case 'print':window.print();break;
 case 'full-log':showModal(t('log.title'),state.log.map(logEntry).join(''));break;
 }}
document.addEventListener('pointerdown',primeAudio,{capture:true});
document.addEventListener('keydown',event=>{if(!event.repeat&&!['Shift','Control','Alt','Meta','Escape'].includes(event.key))primeAudio();},{capture:true});
document.addEventListener('input',event=>{if(event.target.matches('[data-market-unit-price]'))updateMarketTotal(event.target);const bus=event.target.dataset.audioVolume;if(bus==='music'||bus==='sfx'){primeAudio();audio.setVolumes({[bus]:Number(event.target.value)/100});}});
window.addEventListener('pagehide',event=>{if(!event.persisted)audio.close();});
document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)Promise.resolve(handleAction(button)).catch(error=>{console.error(error);toast(t('common.error'));});});
document.addEventListener('submit',event=>{if(event.target.id!=='new-run-form')return;event.preventDefault();const values=new FormData(event.target);const entered=String(values.get('seed')||'').trim();const seed=entered||`lantern-${new Date().toISOString().slice(0,19).replace(/\D/g,'')}`;startRun(seed,{shipName:String(values.get('shipName')||t('title.defaultship')),difficulty:String(values.get('difficulty')||'normal')});window.scrollTo(0,0);});
document.addEventListener('change',event=>{if(event.target.id==='setting-motion'){settings.reduceMotion=event.target.checked;applySettings();}if(event.target.id==='setting-font'){settings.font=Number(event.target.value);applySettings();}});
document.getElementById('import-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>2000000)throw new Error();const save=JSON.parse(await file.text());if(!validateSave(save))throw new Error();let checked=createInitialState(save.seed,save.config);for(const action of save.actions){checked=reduce(checked,action);if(checked.lastError)throw new Error();}assertState(checked);modal.close();connectLocal(save.seed,save.config,save.actions);transport.save();toast(t('save.imported'));}catch{toast(t('save.invalid'));}});
document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.target.matches('input,select,textarea'))return;if(modal.open)return;if(screen==='title'){if(['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();const buttons=[...app.querySelectorAll('.title-actions button')];if(buttons.length){const index=buttons.indexOf(document.activeElement);buttons[(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length].focus();}}else if(event.code==='Space'&&document.activeElement.tagName!=='BUTTON'){event.preventDefault();app.querySelector('[data-action=new]')?.focus();}return;}if(event.key==='Escape'){panel='port';showCentral();render();return;}if(/^[1-5]$/.test(event.key)){showCrew(Number(event.key)-1);return;}if(event.key.toLowerCase()==='m'){panel='map';showCentral();render();return;}if(event.key.toLowerCase()==='s'){panel='ship';showCentral();render();return;}if(event.key.toLowerCase()==='l'){mobile='journal';journalOpen=true;journalTab='log';render();return;}if(event.key.toLowerCase()==='r'&&state.phase==='port'){standardWeek();return;}if(event.key.toLowerCase()==='q'&&state.phase==='port'&&selectedHex&&distance(state.ship.hex,selectedHex)===1){depart(selectedHex,true);return;}if(panel==='map'&&state.phase==='port'&&event.key.startsWith('Arrow')){event.preventDefault();const worlds=[...state.subsector.worlds].sort((a,b)=>a.hex.localeCompare(b.hex));let i=worlds.findIndex(w=>w.hex===selectedHex);i=(i+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+worlds.length)%worlds.length;selectDestination(worlds[i].hex);document.getElementById('star-chart')?.focus({preventScroll:true});}else if(panel==='map'&&state.phase==='port'&&['Enter',' '].includes(event.key)&&event.target.id==='star-chart'){event.preventDefault();if(distance(state.ship.hex,selectedHex)===1)depart(selectedHex);}else if(event.target.matches('[role=button][data-action]')&&['Enter',' '].includes(event.key)){event.preventDefault();handleAction(event.target);}});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(panel==='map'&&screen==='game')render();},180);});
applySettings();setLanguage(getLanguage());await loadAssets();await loadShipGeometry();
for(const [key,variable]of [['map/backdrop','--map-art'],['map/paper','--paper-art']]){const asset=getAsset(key);if(asset)document.documentElement.style.setProperty(variable,`url("./${asset.src}")`);}
render();
