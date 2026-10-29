import {fuelCapacity} from '../rules/ship.js';
import {distance} from '../rules/subsector.js';
import {berthingCost,monthlyCosts,COSTS} from '../rules/economy.js';
import {isIllegal,activeDemand} from '../rules/trade.js';
import {GOODS} from '../data/goods.js';
import {assetMarkup,worldAsset} from './assets.js';
import {t,esc,money,number,badge} from './common.js';

/** Public, static world capabilities only. No future market, encounter or dice rolls. */
export function destinationServices(world){
  return {refined:['A','B'].includes(world?.starport),raw:['A','B','C','D'].includes(world?.starport),
    repairs:['A','B','C'].includes(world?.starport)?'available':['D','E'].includes(world?.starport)?'conditional':'none',
    recruits:!!world&&world.population>=5,skim:!!world?.gasGiant};
}

/** Nominal, incident-free leg. Preserve the reducer's departure threshold separately
 * from total consumption: a legal departure can still arrive with an empty tank. */
export function departurePreview(state,hex,{quick=false}={}){
  const origin=state.subsector.worlds.find(w=>w.hex===state.ship.hex)||null;
  const destination=state.subsector.worlds.find(w=>w.hex===hex)||null;
  const range=distance(state.ship.hex,hex),services=destinationServices(destination);
  const portWeeks=quick||state.portWeekComplete?0:1, weeks=portWeeks+1;
  const minimumFuel=quick?22.5:state.portWeekComplete?20:22.5;
  const sourceServices=destinationServices(origin);
  const automaticRefuel=quick&&state.ship.fuel<22.5&&sourceServices.raw;
  const refuelTons=automaticRefuel?fuelCapacity(state)-state.ship.fuel:0;
  const refuelType=sourceServices.refined?'refined':'raw';
  const refuelCost=Math.ceil(refuelTons*(refuelType==='refined'?COSTS.fuelRefined:COSTS.fuelRaw));
  const fuelType=automaticRefuel&&(state.ship.fuel===0||refuelType==='raw')?refuelType:state.ship.fuelType;
  const consumption=20+2.5*weeks, remainingFuel=Math.max(0,state.ship.fuel+refuelTons-consumption);
  const departureBerthing=portWeeks?berthingCost(origin,state.arrivalWeek===state.clock.week?6:7):0;
  const arrivalBerthing=berthingCost(destination,1),arrivalWeek=state.clock.week+weeks;
  let blocked=null;
  if(state.phase!=='port')blocked='notAtPort';
  else if(!destination||range===0)blocked='noDestination';
  else if(range!==1)blocked='unreachable';
  else if(quick&&(state.arrivalWeek!==state.clock.week||state.portWorked||state.portWeekComplete))blocked='quickUnavailable';
  else if(state.ship.systems.jump===0)blocked='noDrive';
  else if(quick&&state.ship.fuel<22.5&&!sourceServices.raw)blocked='quickNoFuel';
  else if(quick&&refuelCost>state.economy.credits)blocked='quickNoCredits';
  else if(!quick&&state.ship.fuel<minimumFuel)blocked='needFuel';
  const freight=state.cargo.filter(l=>l.kind==='freight'&&l.destination===hex).map(l=>({...l,late:arrivalWeek>l.deadline,expectedPay:Math.round(l.pay*(arrivalWeek>l.deadline?.5:1))}));
  const passengers=state.passengers.filter(p=>p.destination===hex).map(p=>({...p}));
  const contracts=state.contracts.filter(c=>c.destination===hex).map(c=>({...c,late:arrivalWeek>c.deadline}));
  const goods=state.cargo.filter(l=>l.kind==='speculative').map(l=>{
    const good=GOODS.find(g=>g.id===l.goodId);
    return {...l,favorable:!!good&&!!destination&&destination.codes.some(code=>(good.sellDM?.[code]||0)>0),restricted:!!destination&&isIllegal(good,destination)};
  });
  const billingWeeks=Array.from({length:weeks},(_,i)=>state.clock.week+i).filter(w=>w<=52&&w%4===0);
  const operatingCosts=monthlyCosts(state),operatingTotal=Object.values(operatingCosts).reduce((sum,n)=>sum+n,0);
  const bills=billingWeeks.map(week=>week===52?
    {week,type:'final',payment:state.economy.balloon+state.economy.arrears+state.economy.deferredBalance,operating:0}:
    {week,type:state.economy.deferNext?'deferred':'monthly',payment:state.economy.monthlyPayment,operating:operatingTotal});
  return {origin,destination,hex,range,services,quick,blocked,canDepart:!blocked,
    portWeeks,weeks,arrivalWeek,minimumFuel,consumption,remainingFuel,fuelType,automaticRefuel,refuelTons,
    costs:{departureBerthing,refuel:refuelCost,departure:departureBerthing+refuelCost,arrivalBerthing},
    billingWeeks,bills,operatingCosts,finalWeek:arrivalWeek>52,strandingRisk:!!destination&&!services.raw&&!services.skim&&remainingFuel<22.5,freight,passengers,contracts,goods};
}

function blockedText(preview){return preview.blocked?t(`navigation.${preview.blocked}`,{tons:number(preview.minimumFuel,1),amount:money(preview.costs.refuel)}):'';}
function metric(label,value,detail){return `<div class="departure-metric"><dt>${esc(label)}</dt><dd>${esc(value)}</dd><small>${esc(detail)}</small></div>`;}

/** Reusable by the map and the captain's departure-confirmation dialog. */
export function renderDepartureSummary(state,hex,{quick=false}={}){
  const p=departurePreview(state,hex,{quick});
  if(!p.destination||p.range===0)return `<p class="navigation-note">${esc(t('navigation.choose'))}</p>`;
  return `<div class="departure-summary"><dl class="departure-metrics">
    ${metric(t('navigation.time'),t('navigation.weeks',{count:p.weeks}),t('navigation.timeSplit',{port:p.portWeeks}))}
    ${metric(t('navigation.fuel'),t('navigation.fuelAmount',{tons:number(p.consumption,1)}),t('navigation.fuelSplit',{plant:number(p.consumption-20,1)}))}
    ${metric(t('navigation.fees'),t('navigation.credits',{amount:money(p.costs.departure)}),t('navigation.feeSplit',{berthing:money(p.costs.departureBerthing),refuel:money(p.costs.refuel)}))}
  </dl><p class="departure-reserve">${esc(t('navigation.reserve',{tons:number(p.remainingFuel,1)}))} · ${esc(t('navigation.arrivalFee',{amount:money(p.costs.arrivalBerthing)}))}</p>
  ${p.blocked?`<p class="navigation-warning" role="status">${esc(blockedText(p))}</p>`:''}
  ${p.canDepart&&state.ship.fuel+p.refuelTons<p.consumption?`<p class="navigation-warning">${esc(t('navigation.shortReserve'))}</p>`:''}
  ${p.bills.map(b=>`<p class="navigation-warning">${esc(t(b.type==='final'?'navigation.finalBill':b.type==='deferred'?'navigation.deferredBill':'navigation.monthlyBill',{week:b.week,payment:money(b.payment),operating:money(b.operating)}))}</p>`).join('')}
  ${p.finalWeek?`<p class="navigation-warning">${esc(t('navigation.finalWeek'))}</p>`:''}
  ${p.strandingRisk?`<p class="navigation-warning">${esc(t('navigation.strandingRisk'))}</p>`:''}
  <p class="navigation-note">${esc(t('navigation.nominal'))}</p><p class="navigation-note">${esc(t('navigation.jumpCaution'))}${p.fuelType==='raw'?` ${esc(t('navigation.rawRisk'))}`:''}</p></div>`;
}

function renderServices(p){
  const s=p.services,items=[];
  if(s.refined)items.push(t('navigation.refined',{price:money(COSTS.fuelRefined)}));
  items.push(s.raw?t('navigation.raw',{price:money(COSTS.fuelRaw)}):t('navigation.noFuel'));
  items.push(t(s.repairs==='available'?'navigation.repairs':s.repairs==='conditional'?'navigation.repairsLimited':'navigation.noRepairs'));
  if(s.recruits)items.push(t('navigation.recruits'));
  if(s.skim)items.push(t('navigation.skim'));
  return `<section><h4>${esc(t('navigation.services'))}</h4><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`;
}
function renderDeliveries(p){
  const deadline=(item)=>`<small>${esc(t('navigation.deadline',{week:item.deadline}))}${item.late?` · ${esc(t('navigation.late'))}`:''}</small>`;
  const entries=[...p.freight.map(f=>`<li>${esc(t('navigation.freightDelivery',{tons:number(f.tons),pay:money(f.expectedPay)}))}${deadline(f)}</li>`),
    ...p.passengers.map(g=>`<li>${esc(t('navigation.passengerDelivery',{count:g.count,class:t(`market.${g.class.toLowerCase()}`),pay:money(g.pay)}))}${deadline(g)}</li>`),
    ...p.contracts.map(c=>`<li>${esc(t('navigation.contractDelivery',{name:t(`contract.${c.type}`),pay:money(c.pay)}))}${c.tons?`<small>${esc(t('navigation.missionCargo',{tons:number(c.tons)}))}</small>`:''}${deadline(c)}</li>`)];
  return `<section><h4>${esc(t('navigation.carrying'))}</h4>${entries.length?`<ul>${entries.join('')}</ul><p class="navigation-note">${esc(t('navigation.deliveryCaveat'))}</p>`:`<p class="navigation-note">${esc(t('navigation.noneDue'))}</p>`}</section>`;
}

export function renderDestination(state,hex){
  const p=departurePreview(state,hex),world=p.destination;
  if(!world)return '';
  const demand=activeDemand(state,hex);
  const population=world.population===0?'none':world.population<=3?'sparse':world.population<=6?'settled':world.population<=8?'busy':'dense';
  const art=worldAsset(world),type=t(`world.${world.archetype||art.split('/')[1]}`),quick=departurePreview(state,hex,{quick:true});
  const fuelSummary=t(p.services.refined?'navigation.fuelBoth':p.services.raw?'navigation.fuelRawOnly':'navigation.noFuel');
  const repairSummary=t(p.services.repairs==='available'?'navigation.repairs':p.services.repairs==='conditional'?'navigation.repairsLimited':'navigation.noRepairs');
  const risks=[t(world.zone==='Amber'?'navigation.amber':'navigation.green'),t('navigation.jumpRisk')];
  if(p.fuelType==='raw')risks.push(t('navigation.rawRisk'));
  if(state.ship.systems.jump<3)risks.push(t('navigation.driveRisk'));
  if(['E','X'].includes(world.starport))risks.push(t('navigation.approachRisk'));
  if(world.law>=1&&p.goods.some(g=>g.restricted))risks.push(t('navigation.customsRisk'));
  return `<article class="map-destination" aria-labelledby="destination-name"><header class="destination-heading">${assetMarkup(art,type,'destination-planet')}<div><div class="eyebrow">${esc(t(p.range===0?'navigation.current':'navigation.selected'))}</div><h3 id="destination-name">${esc(world.name)}</h3><p class="destination-route mono">${esc(t('navigation.fromTo',{origin:p.origin?`${p.origin.name} (${state.ship.hex})`:state.ship.hex,destination:`${world.name} (${world.hex})`}))}</p></div></header>
    <p class="destination-description">${esc(t('navigation.description',{type,population:t(`navigation.population.${population}`)}))}</p>
    <p class="navigation-note">${esc(t('port.profile',{port:world.starport,tech:world.tech,law:world.law}))} · ${esc(p.range===0?t('map.here'):t('map.distance',{distance:p.range}))}</p>
    <div class="destination-services-preview"><p>${esc(fuelSummary)}${p.services.skim?` · ${esc(t('navigation.gasGiant'))}`:''}</p><p>${esc(repairSummary)}</p></div>
    ${demand?.remaining?`<div class="trade-demand destination-demand"><span>${esc(t('navigation.demandTitle'))}</span><strong>${esc(t(demand.nameKey))}</strong><span>${esc(t('trade.demandTerms',{remaining:demand.remaining,volume:demand.volume,bonus:money(demand.bonusPerTon),week:demand.untilWeek}))}</span>${p.range===1&&p.arrivalWeek>demand.untilWeek?`<p class="navigation-warning destination-demand-expiring">${esc(t('navigation.demandExpires',{week:p.arrivalWeek}))}</p>`:''}</div>`:''}
    ${world.zone==='Amber'?`<p class="navigation-zone">${esc(t('navigation.amber'))}</p>`:''}
    <div class="destination-codes">${world.codes.map(c=>badge(`${c} · ${t(`code.${c}`)}`)).join('')}</div>
    ${p.range===1?renderDepartureSummary(state,hex):`<p class="${p.range===0?'navigation-note':'navigation-warning'}">${esc(p.range===0?t('navigation.choose'):blockedText(p))}</p>`}
    <div class="destination-actions"><button class="primary" data-action="depart" data-hex="${esc(world.hex)}" ${p.canDepart?'':'disabled'}>${esc(t('map.depart',{world:world.name}))}</button>${p.range===1?`<button data-action="quick" data-hex="${esc(world.hex)}" ${quick.canDepart?'':'disabled'}>${esc(t('port.quick'))}</button>`:''}</div>
    ${p.freight.length||p.passengers.length||p.contracts.length?renderDeliveries(p):''}
    <details class="destination-details"><summary>${esc(t('navigation.details'))}</summary><div class="destination-details-grid">${renderServices(p)}${p.freight.length||p.passengers.length||p.contracts.length?'':renderDeliveries(p)}
    ${p.goods.length?`<section><h4>${esc(t('navigation.cargo'))}</h4><ul>${p.goods.map(g=>`<li>${esc(t('navigation.cargoLot',{name:t(g.nameKey||GOODS.find(item=>item.id===g.goodId)?.nameKey||g.goodId),tons:number(g.tons)}))}${g.restricted?`<small class="red">${esc(t('navigation.restricted'))}</small>`:g.favorable?`<small class="teal">${esc(t('navigation.favorable'))}</small>`:''}</li>`).join('')}</ul><p class="navigation-note">${esc(t('navigation.noPrices'))}</p></section>`:''}
    <section><h4>${esc(t('navigation.risks'))}</h4><ul>${risks.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></section></div><p class="mono navigation-note">${esc(world.hex)} · ${esc(world.uwp)}</p></details></article>`;
}
