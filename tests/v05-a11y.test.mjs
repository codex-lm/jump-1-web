import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInitialState} from '../src/core/state.js';
import {reduce} from '../src/core/reducer.js';
import {createScene} from '../src/rules/scenes/index.js';
import {setLanguage} from '../src/ui/i18n.js';
import {actionReport,renderActionReport,reportSummary,reportTitle} from '../src/ui/feedback.js';
import {renderScene,sceneDefaults} from '../src/ui/scene.js';
import {loadAssets,assetMarkup} from '../src/ui/assets.js';
import {loadShipGeometry,shipDetail,shipZoom,shipPanel} from '../src/ui/ship.js';
import {titleScreen} from '../src/ui/title.js';
import {focusKey,findFocusTarget,regionHeading,focusable} from '../src/ui/focus.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const ready=seed=>reduce(createInitialState(seed,{rulesEdition:5}),{t:'CHARGEN_DONE'});

// A small stand-in for the DOM: elements with attributes, matched by [name="value"] selectors (the only form focus.js builds).
function fakeElement(tag,attributes={},{disabled=false,hidden=false,region='central-panel'}={}){
 return {tagName:tag.toUpperCase(),id:attributes.id||'',disabled,attributes,region,
  getAttribute(name){return name in this.attributes?String(this.attributes[name]):null;},hasAttribute(name){return name in this.attributes;},setAttribute(name,value){this.attributes[name]=value;},
  closest(selector){if(selector==='[aria-hidden="true"],[hidden]')return hidden?this:null;return selector===`.${this.region}`?this:null;},
  getClientRects(){return hidden?[]:[{}];},focus(){fakeElement.focused=this;}};
}
function fakeRoot(elements){
 const match=(el,selector)=>{if(/^(h1|h2|h3)(,|$)/.test(selector))return selector.split(',').some(s=>s.trim().split(' ').at(-1)===el.tagName.toLowerCase());return [...selector.matchAll(/\[([\w-]+)="((?:[^"\\]|\\.)*)"\]/g)].every(([,name,value])=>el.getAttribute(name)===value.replace(/\\(.)/g,'$1'));};
 return {elements,querySelectorAll(selector){if(!selector)throw new SyntaxError('empty selector');return elements.filter(el=>match(el,selector));},querySelector(selector){if(selector.startsWith('.'))return this;return this.querySelectorAll(selector)[0]||null;}};
}

test('per-system repair buttons have an accessible name and are disabled when the system is intact',async()=>{
 setLanguage('en');
 const state=ready('a11y-repair');state.ship.systems.sensors=1;
 const html=shipDetail(state),buttons=[...html.matchAll(/<button class="small" data-action="repair-options" data-system="(\w+)"([^>]*)>/g)];
 assert.equal(buttons.length,Object.keys(state.ship.systems).length);
 for(const [,system,rest]of buttons){
  assert.match(rest,/aria-label="Repair: [^"]+ · [\d,]+ Cr"/,system);assert.match(rest,/title="Repair: /,system);
  assert.equal(/\bdisabled\b/.test(rest),state.ship.systems[system]>=3,system);
 }
 const sensors=buttons.find(([,system])=>system==='sensors')[2];assert.match(sensors,/aria-label="Repair: Sensors/);
 state.phase='payment';assert.match(shipDetail(state),/data-system="sensors"[^>]*disabled/);
 setLanguage('fr');assert.match(shipDetail(ready('a11y-repair-fr')),/aria-label="Réparer : /);setLanguage('en');
});

test('turn reports and scene banners expose a focusable heading and a short live-region summary',()=>{
 setLanguage('en');
 const before=ready('a11y-report'),after=reduce(before,{t:'END_WEEK',routines:true}),report=actionReport(before,after,'END_WEEK');
 assert.match(renderActionReport(report),/<h3 tabindex="-1">/);
 const summary=reportSummary(report);assert.ok(summary.startsWith(reportTitle(report)),summary);
 if(report.delta.credits)assert.match(summary,/Treasury [+−][\d,]+ Cr$/);
 const manual={...report,delta:{credits:-700}};assert.match(reportSummary(manual),/\. Treasury −700 Cr$/);
 setLanguage('fr');assert.match(reportSummary(manual),/\. Trésorerie −700 Cr$/);setLanguage('en');
 assert.equal(reportSummary(null),'');
 const state=createInitialState('a11y-scene');state.phase='scene';state.scene=createScene('pirate',state);
 assert.match(renderScene(state,sceneDefaults(state)),/<h2 tabindex="-1">/);
});

test('focus keys find the same control again, then the next one with the same action, then the panel heading',()=>{
 const make=()=>[fakeElement('h2',{}),...[1,2,3,4,5].map(station=>fakeElement('button',{'data-action':'order','data-station':station})),fakeElement('button',{'data-action':'panel','data-panel':'map'}),fakeElement('select',{id:'order-3'})];
 const oldRoot=fakeRoot(make()),apply3=oldRoot.elements[3];
 const key=focusKey(apply3,oldRoot);
 assert.equal(key.selector,'[data-action="order"][data-station="3"]');assert.equal(key.action,'order');assert.equal(key.index,2);assert.equal(key.region,'central-panel');
 const same=fakeRoot(make());assert.equal(findFocusTarget(same,key),same.elements[3]);
 const removed=fakeRoot(make().filter(el=>el.getAttribute('data-station')!=='3'));assert.equal(findFocusTarget(removed,key).getAttribute('data-station'),'4');
 const disabled=fakeRoot(make());disabled.elements[3].disabled=true;assert.equal(findFocusTarget(disabled,key).getAttribute('data-station'),'4');
 const last=fakeRoot(make());for(const el of last.elements.slice(3,6))el.disabled=true;assert.equal(findFocusTarget(last,key).getAttribute('data-station'),'2');
 const none=fakeRoot(make().filter(el=>el.getAttribute('data-action')!=='order'));assert.equal(findFocusTarget(none,key),null);assert.equal(regionHeading(none,key.region).tagName,'H2');
 const select=focusKey(oldRoot.elements[7],oldRoot);assert.equal(select.selector,'[id="order-3"]');assert.equal(findFocusTarget(fakeRoot(make()),select).id,'order-3');
 const heading=focusKey(oldRoot.elements[0],oldRoot);assert.equal(heading.selector,'');assert.equal(findFocusTarget(fakeRoot(make()),heading),null);assert.equal(regionHeading(fakeRoot(make()),heading.region).tagName,'H2');assert.equal(focusKey(null),null);
 assert.equal(focusable(fakeElement('button',{},{hidden:true})),false);assert.equal(focusable(fakeElement('button',{},{disabled:true})),false);
 assert.equal(focusKey(fakeElement('button',{'data-action':'x','data-hex':'0"1'}),null).selector,'[data-action="x"][data-hex="0\\"1"]');
});

test('main.js restores focus after renders, defers it while a modal is open and announces reports in #toast',()=>{
 const main=read('src/main.js');
 assert.match(main,/settleFocus\(/);assert.match(main,/modal\.addEventListener\('close'/);
 assert.match(main,/if\(modal\.open\)\{if\(target\|\|message\)pendingFocus=/);
 assert.match(main,/if\(!typing\)target=heading/);
 assert.match(main,/if\(message\)toast\(message\)/);
 assert.match(read('index.html'),/<div id="toast" role="status" aria-live="polite">/);
});

test('loading: the hero starts eagerly with high priority, geometry loads in parallel and only the zoom modal uses the HD cutaway',async()=>{
 const html=read('index.html');
 assert.match(html,/<link rel="preload" as="image" href="\.\/assets\/img\/ship\/hero-pristine\.webp" fetchpriority="high">/);
 assert.ok(html.indexOf('rel="preload"')<html.indexOf('<script'));
 assert.match(read('src/main.js'),/await Promise\.all\(\[loadAssets\(\),loadShipGeometry\(\)\]\)/);
 const manifest=JSON.parse(read('assets/manifest.json')),geometry=JSON.parse(read('assets/img/ship/cutaway.json'));
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?manifest:geometry});
  await Promise.all([loadAssets(),loadShipGeometry()]);
  assert.match(assetMarkup('ship/hero-pristine','','title-hero',{lazy:false,priority:'high'}),/loading="eager" decoding="async" fetchpriority="high"/);
  assert.match(assetMarkup('crew/medallion-01','x'),/loading="lazy" decoding="async" width/);
  assert.doesNotMatch(assetMarkup('crew/medallion-01','x'),/fetchpriority/);
  const title=titleScreen({});assert.match(title,/hero-pristine\.webp" alt="" loading="eager" decoding="async" fetchpriority="high"/);
  const state=ready('a11y-assets'),{width,height}=manifest['ship/cutaway'];
  for(const html of [shipPanel(state),shipDetail(state)]){assert.match(html,/src="\.\/assets\/img\/ship\/cutaway\.webp"/);assert.doesNotMatch(html,/cutaway-hd/);assert.match(html,new RegExp(`viewBox="0 0 ${width} ${height}"`));}
  const zoom=shipZoom(state);assert.match(zoom,/cutaway-hd\.webp/);assert.match(zoom,new RegExp(`src="[^"]+" width="${width}" height="${height}"`));assert.match(zoom,new RegExp(`viewBox="0 0 ${width} ${height}"`));
 }finally{globalThis.fetch=original;}
});

test('gain, loss, link and stamp text tokens reach 4.5:1 and touch targets reach 44px on coarse pointers',()=>{
 const css=read('styles.css');
 const token=name=>css.match(new RegExp(`${name}:(#[0-9a-f]{6})`))?.[1];
 const rgb=h=>[0,2,4].map(i=>parseInt(h.slice(1+i,3+i),16)/255);
 const lum=h=>{const [r,g,b]=rgb(h).map(c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4);return 0.2126*r+0.7152*g+0.0722*b;};
 const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};
 const teal=token('--teal-text'),red=token('--red-text'),stamp=token('--stamp-text');
 assert.ok(teal&&red&&stamp);
 // Report gradient stops (#162838 and #1b393b99 over ink), the map detail, the objective panel, dialogs and the page itself.
 for(const bg of ['#162838','#162d35','#142535','#1b2d3b','#142334','#0f1b2d']){assert.ok(ratio(teal,bg)>=4.5,`teal on ${bg}: ${ratio(teal,bg)}`);assert.ok(ratio(red,bg)>=4.5,`red on ${bg}: ${ratio(red,bg)}`);}
 assert.ok(ratio(stamp,'#efe6d3')>=4.5);
 assert.match(css,/\.result-gain strong\{color:var\(--teal-text\)\}\.result-loss strong\{color:var\(--red-text\)\}/);
 assert.match(css,/\.destination-link,\.jump-route-worlds>span\{color:var\(--teal-text\)\}/);
 const coarse=css.slice(css.lastIndexOf('@media(pointer:coarse){'));
 assert.match(coarse,/\.topbar \.small,\.topbar \.icon-button,[^{]*\.central-nav button,\.central-nav \.help-button[^{]*\{min-width:44px;min-height:44px\}/);
 assert.match(coarse,/\.scene-roll-detail summary[^{]*\{display:list-item;min-height:44px/);
 assert.match(css,/@media\(max-width:600px\)\{\.central-nav\{flex-wrap:wrap/);
 assert.ok(css.lastIndexOf('flex-wrap:wrap;row-gap')>css.lastIndexOf('.central-nav{gap:1px;flex-wrap:nowrap'));
});
