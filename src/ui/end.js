import {t,esc,money,number,worldName,logText,portrait} from './common.js';
import {assetMarkup} from './assets.js';
import {getLanguage} from './i18n.js';
export function chronicleEntries(state){
 const important=(state.milestones?.length?state.milestones:state.log).filter(e=>['log.runStarted','log.jump','log.sell','log.scene','log.payment','log.missedPayment','log.secret','log.contractDelivered','log.destroyed','log.bank.4','log.misjump','log.collectorPaid','log.negotiated','log.informantTurned','log.informantDismissed'].includes(e.key));
 if(important.length<=18)return important;
 const chosen=new Set();
 for(const key of ['log.runStarted','log.jump','log.sell','log.misjump']){const index=important.findIndex(e=>e.key===key);if(index>=0)chosen.add(index);}
 important.forEach((e,index)=>{if(chosen.size<18&&['log.missedPayment','log.secret'].includes(e.key))chosen.add(index);});
 const remaining=important.map((_,i)=>i).filter(i=>!chosen.has(i)),count=18-chosen.size;
 for(let i=0;i<count;i++)chosen.add(remaining[Math.round(i*(remaining.length-1)/Math.max(1,count-1))]);
 return [...chosen].sort((a,b)=>a-b).map(i=>important[i]);
}
export function endScreen(state,{audioControls=''}={}){const entries=chronicleEntries(state);const income=state.economy.income;return `<div class="title-nav"><div class="brand-small">${esc(state.ship.name)}</div><div class="actions">${audioControls}<button class="small" data-action="language">FR / EN</button><button class="small" data-action="home">${esc(t('common.back'))}</button></div></div><main class="end-screen"><div class="end-banner">${assetMarkup(`scenes/${state.ending.type==='victory'?'victory':'defeat'}`,t(`end.${state.ending.type}`))}<div class="end-banner-copy"><div class="eyebrow">${esc(t('end.kicker'))} · ${state.meta.config.daily?esc(t('end.daily',{date:state.meta.seed.slice(6)})):esc(state.meta.seed)}</div><h1>${esc(t(`end.${state.ending.type}`))}</h1></div></div><div class="end-columns"><article class="chronicle"><div class="eyebrow">${esc(t('end.seed',{seed:state.meta.seed}))}</div><h2>${esc(t('end.chronicle'))}</h2><div class="chronicle-medallions">${state.crew.map(p=>portrait(p)).join('')}</div><p>${esc(t('end.opening',{ship:state.ship.name,world:worldName(state,state.route[0])}))}</p>${entries.map(e=>`<p><span class="week-stamp">${esc(t('common.week'))} ${e.week}</span>${esc(logText(e))}</p>`).join('')}<p>${esc(t('end.closing',{weeks:state.clock.completedWeeks||state.clock.week,jumps:state.stats.jumps,world:worldName(state,state.ship.hex),ending:t(`end.${state.ending.type}`),cash:money(state.economy.credits)}))}</p></article><aside class="end-side"><section class="end-stats"><div class="eyebrow">${esc(t('end.score'))}</div><div class="score-big">${money(state.ending.score)}</div>${[['end.jumps',state.stats.jumps],['end.weeks',state.clock.completedWeeks],['end.freight',income.freight],['end.passengers',income.passengers],['end.trade',income.trade],['end.patrons',income.patrons],['end.expenses',Object.values(state.economy.expenses).reduce((a,b)=>a+b,0)],['end.maxpressure',state.stats.maxPressure],['end.survivors',state.crew.filter(p=>p.alive&&p.active!==false).length]].map(([key,value])=>`<div class="stat-row"><span>${esc(t(key))}</span><strong>${money(value)}</strong></div>`).join('')}</section><section class="card-export"><canvas id="run-card" class="run-card-preview" width="1200" height="630" role="img" aria-label="${esc(t('end.download'))}"></canvas><div class="stack"><button class="primary" data-action="download-card">${esc(t('end.download'))}</button><button data-action="copy-card">${esc(t('end.copycard'))}</button><button data-action="print">${esc(t('end.print'))}</button><button data-action="full-log">${esc(t('end.fulllog'))}</button></div></section></aside></div><div class="actions" style="margin-top:25px"><button class="primary" data-action="replay">${esc(t('end.replay'))}</button><button data-action="home">${esc(t('end.new'))}</button><button data-action="copy-seed">${esc(t('end.copyseed'))}</button><button data-action="export">${esc(t('menu.export'))}</button></div></main>`;}
export function drawRunCard(state){
 const canvas=document.getElementById('run-card');
 if(!canvas)return;
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 ctx.save();
 try{
  // A redraw can inherit the previous footer's right alignment. Treat the card
  // as a complete drawing and isolate every style from the caller's context.
  ctx.setTransform(1,0,0,1,0,0);
  ctx.textAlign='left';
  ctx.textBaseline='alphabetic';
  ctx.globalAlpha=1;
  ctx.globalCompositeOperation='source-over';
  ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
  ctx.shadowColor='transparent';
  if('filter' in ctx)ctx.filter='none';
  ctx.setLineDash([]);
  const grad=ctx.createLinearGradient(0,0,1200,630);grad.addColorStop(0,'#0f1b2d');grad.addColorStop(1,'#203640');ctx.fillStyle=grad;ctx.fillRect(0,0,1200,630);ctx.strokeStyle='#d9a44166';ctx.lineWidth=2;ctx.strokeRect(25,25,1150,580);ctx.fillStyle='#d9a441';ctx.font='18px PlexMono,monospace';ctx.fillText(t('title.region'),62,78);ctx.fillStyle='#f3eee4';ctx.font='54px Fraunces,Georgia';ctx.fillText(state.ship.name.slice(0,30),62,154);ctx.fillStyle=state.ending.type==='victory'?'#78beb7':'#d9a441';ctx.font='30px Fraunces,Georgia';ctx.fillText(t(`end.${state.ending.type}`),62,210);ctx.fillStyle='#9fafb5';ctx.font='16px Plex,system-ui';state.crew.forEach((p,i)=>ctx.fillText(`${p.station}. ${p.name}${p.alive?'':' †'}`,62,276+i*29));ctx.fillStyle='#d9a441';ctx.font='17px PlexMono,monospace';ctx.fillText(t('end.score').toUpperCase(),62,478);ctx.font='55px PlexMono,monospace';ctx.fillText(money(state.ending.score),62,540);const pts=new Map();for(const w of state.subsector.worlds){const x=650+w.q*62,y=78+w.r*43+(w.q%2?21.5:0);pts.set(w.hex,{x,y});ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#83969a';ctx.fill();ctx.fillStyle='#879596';ctx.font='9px Plex,system-ui';ctx.textAlign='center';ctx.fillText(w.name.slice(0,13),x,y+13);}ctx.strokeStyle='#d9a441';ctx.lineWidth=2;ctx.beginPath();state.route.forEach((h,i)=>{const p=pts.get(h)||{x:650+(Number(h.slice(0,2))-1)*62,y:78+(Number(h.slice(2))-1)*43+((Number(h.slice(0,2))-1)%2?21.5:0)};i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();const h=state.ship.hex;const here=pts.get(h)||{x:650+(Number(h.slice(0,2))-1)*62,y:78+(Number(h.slice(2))-1)*43+((Number(h.slice(0,2))-1)%2?21.5:0)};if(here){ctx.fillStyle='#d9a441';ctx.beginPath();ctx.arc(here.x,here.y,6,0,Math.PI*2);ctx.fill();}ctx.textAlign='left';ctx.fillStyle='#9fafb5';ctx.font='14px PlexMono,monospace';ctx.fillText(`${t('common.seed')}: ${state.meta.seed.slice(0,60)}`,62,583);ctx.textAlign='right';ctx.fillStyle='#9fafb5';ctx.fillText(new Date().toISOString().slice(0,10),1000,583);ctx.fillStyle='#d9a441';ctx.fillText('JUMP—1',1135,583);
 }finally{
  ctx.restore();
 }
}
