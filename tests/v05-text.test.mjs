import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../src/i18n/catalog.js';
import {setLanguage,getLanguage,t} from '../src/ui/i18n.js';
import {logText,localizedParams,setWorldLookup} from '../src/ui/common.js';
import {createInitialState} from '../src/core/state.js';
import {chargenScreen} from '../src/ui/chargen.js';

const LANGS=['en','fr'];
const forms=value=>typeof value==='object'?Object.entries(value).filter(([key])=>key!=='$n').map(([,text])=>text):[value];
const vars=text=>[...String(text).matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
function inLanguage(language,fn){const previous=getLanguage();setLanguage(language);try{return fn();}finally{setLanguage(previous);}}
const plain=text=>text.replace(/[  ]/g,' ');

test('every plural entry names a real parameter and keeps the same parameters in every form and language',()=>{
 for(const [key,pair] of Object.entries(catalog))for(const value of pair){if(typeof value!=='object')continue;
  const driver=value.$n||(vars(value.other).includes('terms')?'terms':'count');
  assert.ok(vars(value.other).includes(driver),`${key}: plural driver {${driver}} missing`);
  const expected=vars(forms(pair[0])[0]);for(const text of [...forms(pair[0]),...forms(pair[1])])assert.deepEqual(vars(text),expected,key);}
});

test('plural keys pick the singular for 1 and the plural for 2 in both languages',()=>{
 for(const language of LANGS)inLanguage(language,()=>{for(const [key,pair] of Object.entries(catalog)){const value=pair[language==='en'?0:1];if(typeof value!=='object')continue;const driver=value.$n||'count';
  const one=t(key,{[driver]:1}),two=t(key,{[driver]:2});assert.ok(!one.includes('{')&&!two.includes('{'),key);
  if(value.one!==value.other){assert.equal(plain(one),plain(value.one.replace(`{${driver}}`,'1').replace(/\{\w+\}/g,'')),`${key} 1`);assert.equal(plain(two),plain(value.other.replace(`{${driver}}`,'2').replace(/\{\w+\}/g,'')),`${key} 2`);}}});
 const cases=[
  ['log.misjump',{weeks:1,hex:'0101'},'Misjump: 1 week lost, arrival at 0101.','Saut raté : 1 semaine perdue, arrivée à 0101.'],
  ['log.misjump',{weeks:2,hex:'0101'},'Misjump: 2 weeks lost, arrival at 0101.','Saut raté : 2 semaines perdues, arrivée à 0101.'],
  ['bank.paid',{count:1},'1 instalment paid on time','1 mensualité payée à temps'],
  ['bank.paid',{count:2},'2 instalments paid on time','2 mensualités payées à temps'],
  ['log.heal',{points:1},'The infirmary restores 1 physical point across the crew.','L’infirmerie rend 1 point physique à l’équipage.'],
  ['log.heal',{points:2},'The infirmary restores 2 physical points across the crew.','L’infirmerie rend 2 points physiques à l’équipage.'],
  ['port.ordersProgress',{count:1},'1 of 5 orders assigned','1 ordre affecté sur 5'],
  ['port.ordersProgress',{count:2},'2 of 5 orders assigned','2 ordres affectés sur 5'],
  ['map.distance',{distance:1},'1 parsec away','À 1 parsec'],
  ['map.distance',{distance:2},'2 parsecs away','À 2 parsecs'],
  ['log.breakdownResolved',{weeks:1},'The machinery runs again. Lost time: 1 week.','Les machines repartent. Retard : 1 semaine.'],
  ['log.towed',{weeks:2,amount:'50'},'A tug brings the ship back after 2 weeks. Invoice: 50 Cr.','Un remorqueur ramène le vaisseau après 2 semaines. Facture : 50 Cr.'],
  ['end.jumpCount',{count:1},'1 jump','1 saut'],
  ['bank.settle',{weeks:1},'Settle the loan now (1 week early)','Solder le prêt maintenant (1 semaine d’avance)'],
 ];
 for(const [key,params,en,fr] of cases){assert.equal(inLanguage('en',()=>t(key,params)),en,key);assert.equal(plain(inLanguage('fr',()=>t(key,params))),fr,key);}
 // A formatted number still selects the right form.
 assert.equal(plain(inLanguage('fr',()=>t('navigation.businessFreight',{count:'1',tons:'2,5',pay:'1 000'}))),'Fret : 1 lot, 2,5 t, 1 000 Cr');
});

test('French uses vous everywhere, never tu forms',()=>{
 const tu=/(^|[\s«(“'’])(tu|tes|toi|ton|ta|te|t’)(?=[\s,.;:!?»)”]|$)/i;
 for(const [key,[,fr]] of Object.entries(catalog))for(const text of forms(fr)){assert.doesNotMatch(text,tu,key);assert.doesNotMatch(text,/(^|[\s.;:])(Choisis|Reçois|Prends|Garde|Tiens|Sois)(?=\s)/,key);}
 // The token check is safe for accented words: “bâton” or “état” must not count as tu forms.
 assert.doesNotMatch('Un bâton et un état stable.',tu);
});

test('an encounter with the bank cruiser is logged with its scene title, not as a repossession',()=>{
 for(const language of LANGS)inLanguage(language,()=>{
  const scene=logText({key:'log.scene',params:{type:'repo'}}),resolved=logText({key:'log.sceneResolved',params:{type:'repo'}});
  assert.ok(scene.includes(t('scene.repo')),scene);assert.ok(resolved.includes(t('scene.repo')),resolved);
  assert.ok(!scene.includes(t('end.repo'))&&!resolved.includes(t('end.repo')),scene);
  const customs=logText({key:'log.scene',params:{type:'customs'}});assert.ok(customs.includes(t('scene.customs')));assert.doesNotMatch(customs,/\?\s*\.|\.\./);
  const ending=logText({key:'log.ending',params:{type:'repo',score:1000}});assert.ok(ending.includes(t('end.repo')),ending);assert.doesNotMatch(ending,/\.\./);});
});

test('the glossary keeps one term per concept',()=>{
 const retiredFr=[/croiseur de saisie/i,/(^|[^\p{L}])navire/iu,/artilleur/i,/commissaire/i,/(^|[^\p{L}])ingénieur(?![\p{L}])/iu,/capteurs/i,/zéro-g/i,/(^|[^\p{L}])soute/iu,/première classe/i,/(^|[^\p{L}])traites?(?![\p{L}])/iu,/passagers? (haut|moyen)(?![\p{L}])/iu,/Test de (Carousing|Streetwise|Mechanics|Medicine)|Test d’Admin/,/non apprise/,/(^|[^\p{L}])tests? (de|d’)/iu];
 for(const [key,[en,fr]] of Object.entries(catalog)){for(const text of forms(fr))for(const term of retiredFr)assert.doesNotMatch(text,term,`${key}: ${text}`);for(const text of forms(en))assert.doesNotMatch(text,/recovery cruiser/i,key);}
 // One currency order: the amount comes first.
 for(const [key,pair] of Object.entries(catalog))for(const text of pair.flatMap(forms))assert.doesNotMatch(text,/(^|[^\w/])Cr \{|(^|[^\w/])Cr \d/,key);
});

test('French typography keeps punctuation and units attached; English is untouched',()=>{
 inLanguage('fr',()=>{for(const key of Object.keys(catalog)){const text=t(key,{amount:'1 500',tons:5,count:2,weeks:2,points:2});assert.doesNotMatch(text,/ [;:!?»]|« /,key);assert.doesNotMatch(text,/\d (Cr|t|%)(?![\p{L}\p{N}])/u,key);}
  assert.equal(t('scene.customs'),'Rien à déclarer ?');assert.equal(t('end.seedLabel',{seed:'abc'}),'Graine : abc');
  assert.equal(t('feedback.woundedButton'),'Choisir « Soigner l’équipage »');assert.ok(t('crew.recruit').includes('5 000 Cr'));});
 inLanguage('en',()=>{for(const key of Object.keys(catalog))assert.doesNotMatch(t(key,{amount:'1,500',count:2}),/[  ]/,key);});
});

test('log lines name worlds at render time and keep the saved hex',()=>{
 const state=createInitialState('text-hex',{rulesEdition:5}),world=state.subsector.worlds[0];
 const occupied=new Set(state.subsector.worlds.map(w=>w.hex));let empty='0101';for(let q=1;q<=8&&occupied.has(empty);q++)for(let r=1;r<=10;r++){const hex=`${String(q).padStart(2,'0')}${String(r).padStart(2,'0')}`;if(!occupied.has(hex)){empty=hex;break;}}
 const jump={week:3,key:'log.jump',params:{hex:world.hex}},saved=structuredClone(jump);
 assert.equal(logText(jump,state),`Jump to ${world.name} (${world.hex}). The ship crosses a week of violet silence.`);
 assert.deepEqual(jump,saved);
 assert.ok(logText({key:'log.misjump',params:{hex:empty,weeks:2}},state).endsWith(`arrival at ${empty}.`));
 assert.equal(logText({key:'log.arrive',params:{name:world.name,hex:world.hex}},state),`Docked at ${world.name}, ${world.hex}.`);
 assert.equal(plain(inLanguage('fr',()=>logText({key:'log.rumor',params:{hex:world.hex}},state))),`Une rumeur situe le croiseur de recouvrement à ${world.name} (${world.hex}).`);
 setWorldLookup(hex=>hex===world.hex?world.name:null);
 try{assert.ok(logText({key:'log.freightBooked',params:{tons:5,hex:world.hex,pay:100}}).includes(`${world.name} (${world.hex})`));}finally{setWorldLookup(null);}
 assert.equal(localizedParams({hex:world.hex},'log.jump').hex,world.hex);
});

test('log numbers are localised: fines as money, tonnage with a decimal comma in French',()=>{
 assert.equal(logText({key:'log.confiscation',params:{tons:4,fine:30000}}),'Customs confiscates 4 t. Fine: 30,000 Cr.');
 assert.equal(plain(inLanguage('fr',()=>logText({key:'log.confiscation',params:{tons:4,fine:30000}}))),'Les douanes confisquent 4 t. Amende : 30 000 Cr.');
 assert.equal(plain(inLanguage('fr',()=>logText({key:'log.refuel',params:{tons:27.5,amount:13750,type:'raw'}}))),'Chargement de 27,5 t de carburant brut pour 13 750 Cr.');
});

test('characteristic codes and the page title follow the language',()=>{
 const state=createInitialState('text-codes',{rulesEdition:5});
 assert.ok(chargenScreen(state).includes('STR DEX END INT EDU SOC'));
 inLanguage('fr',()=>{const html=chargenScreen(state);assert.ok(html.includes('FOR DEX END INT ÉDU SOC'));assert.ok(!html.includes('STR DEX'));assert.equal(t('meta.title'),'Jump-1 · La Marche des Lanternes');});
 assert.equal(t('meta.title'),'Jump-1 · The Lantern Reach');
 for(const code of ['STR','DEX','END','INT','EDU','SOC'])for(const language of LANGS)assert.ok(inLanguage(language,()=>t(`char.${code}`)).length===3);
});
