import {market} from '../src/rules/trade.js';
import {actionReport,newJournalEntries,renderActionReport,renderPortObjective} from '../src/ui/feedback.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../src/core/state.js';
import {reduce} from '../src/core/reducer.js';
import {distance} from '../src/rules/subsector.js';
import {GOODS} from '../src/data/goods.js';
import {monthlyCosts} from '../src/rules/economy.js';
import {destinationServices,departurePreview,renderDepartureSummary,renderDestination} from '../src/ui/navigation.js';
import {renderMap,mountMap,pickMapWorld} from '../src/ui/map.js';
import {setLanguage} from '../src/ui/i18n.js';

function fixture(){
 const state=reduce(createInitialState('navigation-preview'),{t:'CHARGEN_DONE'});
 const origin=state.subsector.worlds.find(w=>w.hex===state.ship.hex);
 const destination=state.subsector.worlds.find(w=>distance(origin,w)===1);
 origin.starport='B';destination.starport='B';
 state.crew[1].skills.Engineering=20;state.crew[1].characteristics.INT=15;
 for(const p of state.crew)p.mood=0;
 state.economy.credits=1000000;state.ship.fuel=30;state.ship.fuelType='refined';
 state.arrivalWeek=state.clock.week;
 return {state,origin,destination};
}

test('destination services follow fuel, repair, recruit and gas-giant rules',()=>{
 for(const port of ['A','B','C','D','E','X']){
  const result=destinationServices({starport:port,population:4,gasGiant:false});
  assert.equal(result.refined,['A','B'].includes(port));
  assert.equal(result.raw,['A','B','C','D'].includes(port));
  assert.equal(result.repairs,['A','B','C'].includes(port)?'available':['D','E'].includes(port)?'conditional':'none');
  assert.equal(result.recruits,false);assert.equal(result.skim,false);
 }
 assert.equal(destinationServices({population:5,gasGiant:true}).recruits,true);
 assert.equal(destinationServices({population:5,gasGiant:true}).skim,true);
});

test('nominal departure time, fuel and fees match actual normal, completed-port and quick departures',()=>{
 const cases=[
  {quick:false,completed:false,arrived:true,fuel:30,port:'B'},
  {quick:false,completed:false,arrived:false,fuel:30,port:'B'},
  {quick:false,completed:true,arrived:true,fuel:30,port:'B'},
  {quick:false,completed:true,arrived:true,fuel:20,port:'B'},
  {quick:true,completed:false,arrived:true,fuel:30,port:'B'},
  {quick:true,completed:false,arrived:true,fuel:10,port:'B'},
  {quick:true,completed:false,arrived:true,fuel:5,port:'C'},
 ];
 for(const c of cases){
  const {state,origin,destination}=fixture();origin.starport=c.port;
  state.portWeekComplete=c.completed;state.arrivalWeek=c.arrived?state.clock.week:0;state.ship.fuel=c.fuel;
  const before=JSON.stringify(state),preview=departurePreview(state,destination.hex,{quick:c.quick});
  assert.equal(preview.canDepart,true);assert.equal(JSON.stringify(state),before);
  let actual=reduce(state,{t:c.quick?'QUICK_STOP':'DEPART',hex:destination.hex});
  assert.equal(actual.lastError,null);assert.equal(actual.ship.hex,destination.hex);
  assert.equal(actual.clock.week-state.clock.week,preview.weeks);
  assert.equal(actual.ship.fuel,preview.remainingFuel);
  assert.equal(actual.economy.expenses.fuel-state.economy.expenses.fuel,preview.costs.refuel);
  // Arrival berthing is charged after any encounter, separately from departure.
  const chargedBerthing=actual.economy.expenses.berthing-state.economy.expenses.berthing;
  assert.equal(chargedBerthing,preview.costs.departureBerthing+(actual.portPending?0:preview.costs.arrivalBerthing));
 }
 const {state,destination}=fixture();state.ship.fuel=22.5;
 const threshold=departurePreview(state,destination.hex);
 assert.equal(threshold.canDepart,true);assert.equal(threshold.consumption,25);assert.equal(threshold.remainingFuel,0);
 state.ship.fuel=22.4;assert.equal(departurePreview(state,destination.hex).blocked,'needFuel');
 state.portWeekComplete=true;state.ship.fuel=20;assert.equal(departurePreview(state,destination.hex).canDepart,true);
 state.ship.fuel=19.9;assert.equal(departurePreview(state,destination.hex).blocked,'needFuel');
});

test('quick departure affordability, raw-fuel mixing and billing warnings preserve actual preconditions',()=>{
 const {state,origin,destination}=fixture();
 state.ship.fuel=10;state.ship.fuelType='raw';state.economy.credits=9999;
 assert.equal(departurePreview(state,destination.hex,{quick:true}).blocked,'quickNoCredits');
 state.economy.credits=10000;
 let preview=departurePreview(state,destination.hex,{quick:true});
 assert.equal(preview.canDepart,true);assert.equal(preview.fuelType,'raw');assert.equal(preview.costs.refuel,10000);
 state.ship.fuel=0;assert.equal(departurePreview(state,destination.hex,{quick:true}).fuelType,'refined');
 origin.starport='E';assert.equal(departurePreview(state,destination.hex,{quick:true}).blocked,'quickNoFuel');
 origin.starport='B';state.portWorked=true;assert.equal(departurePreview(state,destination.hex,{quick:true}).blocked,'quickUnavailable');
 state.portWorked=false;state.ship.fuel=30;state.clock.week=3;
 preview=departurePreview(state,destination.hex);assert.deepEqual(preview.billingWeeks,[4]);
 state.clock.week=52;assert.equal(departurePreview(state,destination.hex).finalWeek,true);
});

test('trip bills use current crew costs, deferrals and the exact final balance; fuel-less worlds warn visibly',()=>{
 const {state,destination}=fixture();state.clock.week=3;
 const charges=Object.values(monthlyCosts(state)).reduce((sum,c)=>sum+c,0);
 let preview=departurePreview(state,destination.hex);
 assert.deepEqual(preview.bills,[{week:4,type:'monthly',payment:state.economy.monthlyPayment,operating:charges}]);
 state.economy.deferNext=true;
 assert.equal(departurePreview(state,destination.hex).bills[0].type,'deferred');
 state.economy.maintenanceWaived=true;
 assert.equal(departurePreview(state,destination.hex).bills[0].operating,charges-3090);
 state.clock.week=51;state.economy.arrears=12345;state.economy.deferredBalance=777;
 preview=departurePreview(state,destination.hex);
 assert.deepEqual(preview.bills,[{week:52,type:'final',payment:state.economy.balloon+12345+777,operating:0}]);
 assert.equal(preview.finalWeek,true);
 destination.starport='X';destination.gasGiant=false;
 preview=departurePreview(state,destination.hex);assert.equal(preview.strandingRisk,true);
 setLanguage('en');const html=renderDestination(state,destination.hex);
 assert.ok(html.indexOf('Stranding risk')<html.indexOf('<details'));
 assert.ok(html.indexOf('No fuel sold at port')<html.indexOf('<details'));
 destination.gasGiant=true;assert.equal(departurePreview(state,destination.hex).strandingRisk,false);
 destination.gasGiant=false;destination.starport='D';assert.equal(departurePreview(state,destination.hex).strandingRisk,false);
});

test('destination summaries retain real freight, passenger and mission obligations without future prices or state mutation',()=>{
 const {state,destination}=fixture();
 const good=GOODS.find(g=>Object.keys(g.sellDM||{}).length);
 destination.codes=[Object.keys(good.sellDM)[0]];
 state.cargo=[{id:'f',kind:'freight',destination:destination.hex,tons:7,pay:7000,deadline:2},
  {id:'m',kind:'mission',contractId:'c',tons:5},
  {id:'g',kind:'speculative',goodId:good.id,nameKey:good.nameKey,tons:3,buyPrice:123456789}];
 state.passengers=[{id:'p',class:'Low',destination:destination.hex,count:2,pay:2000,deadline:4}];
 state.contracts=[{id:'c',type:'smuggle',destination:destination.hex,tons:5,pay:9000,deadline:5}];
 const before=JSON.stringify(state),preview=departurePreview(state,destination.hex);
 assert.equal(preview.freight[0].expectedPay,3500);assert.equal(preview.freight[0].late,true);
 assert.equal(preview.passengers[0].count,2);assert.equal(preview.contracts[0].id,'c');
 assert.equal(preview.goods.length,1);assert.equal(preview.goods[0].favorable,true);
 for(const language of ['en','fr']){
  setLanguage(language);
  const html=renderDestination(state,destination.hex)+renderDepartureSummary(state,destination.hex,{quick:true});
  assert.ok(html.includes('destination-name'));assert.ok(html.includes('destination-details'));
  assert.ok(!html.includes('123456789'));assert.ok(!html.includes('undefined'));assert.ok(!html.includes('navigation.'));
 }
 assert.equal(JSON.stringify(state),before);
});

test('map inspection selects exactly one distant world and never enables an out-of-range departure',()=>{
 const {state}=fixture();const distant=state.subsector.worlds.find(w=>distance(state.ship.hex,w.hex)>1);
 const html=renderMap(state,distant.hex);
 assert.equal((html.match(/<option[^>]* selected/g)||[]).length,1);
 assert.match(html,new RegExp(`<option value="${distant.hex}" selected`));
 assert.match(html,new RegExp(`data-action="depart" data-hex="${distant.hex}" disabled`));
 assert.ok(html.indexOf('id="destination-name"')<html.indexOf('id="star-chart"'));
 const points=[{x:10,y:10,world:{hex:'0101'}},{x:35,y:10,world:{hex:'0201'}}],before=JSON.stringify(points);
 assert.equal(pickMapWorld(points,{x:13,y:12},10).hex,'0101');
 assert.equal(pickMapWorld(points,{x:33,y:12},10).hex,'0201');
 assert.equal(pickMapWorld(points,{x:22,y:30},10),null);
 assert.equal(JSON.stringify(points),before);
});

test('chart zoom keeps the pointed world selectable and a drag cannot commit a destination',()=>{
 const {state,destination}=fixture();destination.name='TARGET';
 const listeners=new Map(),resetListeners=new Map(),texts=[];
 const reset={hidden:true,addEventListener:(k,f)=>resetListeners.set(k,f),removeEventListener:k=>resetListeners.delete(k)};
 const ctx=new Proxy({measureText:text=>({width:text.length*6}),fillText:(text,x,y)=>texts.push({text,x,y})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});
 const canvas={style:{},parentElement:{clientWidth:600,querySelector:()=>reset},getContext:()=>ctx,
  addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),getBoundingClientRect:()=>({left:0,top:0}),setPointerCapture:()=>{}};
 const previousDocument=globalThis.document,previousNow=Date.now;let now=10000;
 globalThis.document={getElementById:id=>id==='star-chart'?canvas:null};Date.now=()=>now;
 try{
  const chosen=[],cleanup=mountMap(state,state.ship.hex,hex=>chosen.push(hex));
  const label=texts.find(p=>p.text==='TARGET'),radius=Math.min((600-20)/13.5,(650-35)/18.5);
  const event={clientX:label.x,clientY:label.y-radius*.46,pointerId:1,pointerType:'mouse',button:0};
  listeners.get('click')(event);assert.deepEqual(chosen,[destination.hex]);
  listeners.get('wheel')({...event,deltaY:-1,preventDefault(){}});
  assert.equal(reset.hidden,false);listeners.get('click')(event);assert.deepEqual(chosen,[destination.hex,destination.hex]);
  listeners.get('pointerdown')(event);listeners.get('pointermove')({...event,clientX:event.clientX+40});
  listeners.get('pointerup')({...event,clientX:event.clientX+40});listeners.get('click')(event);
  assert.equal(chosen.length,2);
  now+=1000;resetListeners.get('click')();assert.equal(reset.hidden,true);
  listeners.get('click')(event);assert.equal(chosen.length,3);
  cleanup();assert.equal(listeners.size,0);assert.equal(resetListeners.size,0);
 }finally{globalThis.document=previousDocument;Date.now=previousNow;}
});


test('reports show actual purchase deltas, preserve state and survive capped journals',()=>{
 setLanguage('en');let state=reduce(createInitialState('feedback'),{t:'CHARGEN_DONE'});
 const good=market(state).goods.find(g=>g.buyPrice<=state.economy.credits);
 assert.ok(good);
 const before=JSON.stringify(state),after=reduce(state,{t:'BUY',goodId:good.goodId,tons:1});
 assert.equal(after.lastError,null);
 const report=actionReport(state,after,'BUY');
 assert.equal(report.delta.credits,-good.buyPrice);assert.equal(report.delta.cargo,1);
 assert.equal(JSON.stringify(state),before);
 const old={log:Array.from({length:400},(_,i)=>({week:i,key:'old'}))};
 const fresh=[{week:401,key:'log.jump'},{week:402,key:'log.arrive'}];
 assert.deepEqual(newJournalEntries(old,{log:[...old.log.slice(2),...fresh]}),fresh);
 assert.deepEqual(newJournalEntries(old,old),[]);
});

test('arrival report includes actual fees and delivery rather than quoting promised revenue',()=>{
 setLanguage('en');const before=createInitialState('report-arrival'),after=structuredClone(before);
 before.cargo=[{tons:30}];after.economy.credits+=29900;after.clock.week+=2;
 after.log=[{week:3,key:'log.freightDelivered',params:{tons:30,amount:30000}},{week:3,key:'log.arrive',params:{name:'<Oster>',hex:'0310'}}];
 const report=actionReport(before,after,'RESOLVE'),html=renderActionReport(report);
 assert.equal(report.delta.credits,29900);assert.equal(report.delta.cargo,-30);
 assert.ok(html.includes('29,900'));assert.ok(html.includes('30,000'));assert.ok(html.includes('&lt;Oster&gt;'));
 assert.ok(html.includes('2 weeks elapsed'));assert.equal(actionReport(before,{...after,lastError:'NO_FUEL'},'DEPART'),null);
});

test('port guidance prioritizes real departure blockers and links accepted deliveries',()=>{
 setLanguage('en');const state=createInitialState('next-step');state.phase='port';state.ship.fuel=5;
 assert.ok(renderPortObjective(state).includes('22.5 t'));
 state.portWeekComplete=true;assert.ok(renderPortObjective(state).includes('20 t'));
 state.ship.fuel=30;state.cargo=[{kind:'freight',tons:5,destination:'0310'}];
 assert.ok(renderPortObjective(state).includes('data-hex="0310"'));
 state.ship.systems.jump=0;assert.ok(renderPortObjective(state).includes('jump drive is offline'));
});

test('a completed quiet scene still produces a meaningful report',()=>{
 const before=createInitialState('quiet-report'),after=structuredClone(before);
 after.log=[{week:1,key:'log.sceneResolved',params:{type:'patron'}}];
 const html=renderActionReport(actionReport(before,after,'END_WEEK'));
 assert.ok(html.includes('resolved'));assert.ok(!html.includes('<ul></ul>'));
});
