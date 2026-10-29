import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInitialState} from '../src/core/state.js';
import {loadAssets} from '../src/ui/assets.js';
import {loadShipGeometry,shipPanel,shipDetail,shipZoom} from '../src/ui/ship.js';

const geometry=JSON.parse(readFileSync(new URL('../assets/img/ship/cutaway.json',import.meta.url),'utf8'));
const manifest={'ship/cutaway':{src:'assets/img/ship/cutaway.webp',width:2000,height:900},'ship/cutaway-hd':{src:'assets/img/ship/cutaway-hd.webp',width:4000,height:1800}};

test('ship rendering retains procedural controls when optional artwork or geometry is unavailable',async()=>{
  const original=globalThis.fetch;
  try{
    globalThis.fetch=async()=>({ok:false});
    await loadAssets();assert.equal(await loadShipGeometry(),null);
    const html=shipPanel(createInitialState('ship-fallback'));
    assert.match(html,/viewBox="0 0 280 145"/);
    assert.equal((html.match(/data-action="system"/g)||[]).length,8);
    assert.match(html,/data-action="ship-zoom"/);
    assert.doesNotMatch(html,/ship-cutaway-overlay/);
    const zoom=shipZoom(createInitialState('ship-fallback'));
    assert.match(zoom,/viewBox="0 0 280 145"/);
    assert.equal((zoom.match(/<button class="ship-zoom-system"/g)||[]).length,8);
  }finally{globalThis.fetch=original;}
});

test('Blender cutaway uses local image, eight normalized hit regions and active crew anchors',async()=>{
  const original=globalThis.fetch;
  try{
    globalThis.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?manifest:geometry});
    await loadAssets();const loaded=await loadShipGeometry();assert.equal(Object.keys(loaded).length,8);
    const state=createInitialState('ship-art');state.crew[1].active=false;state.crew[1].discharged=true;state.ship.fuelType='raw';
    const html=shipPanel(state),detail=shipDetail(state),zoom=shipZoom(state);
    assert.match(html,/src="\.\/assets\/img\/ship\/cutaway.webp"/);
    assert.match(detail,/src="\.\/assets\/img\/ship\/cutaway-hd.webp"/);
    assert.match(zoom,/src="\.\/assets\/img\/ship\/cutaway-hd.webp"/);
    assert.match(zoom,/viewBox="0 0 2000 900"/);
    assert.match(html,/viewBox="0 0 2000 900"/);
    assert.equal((html.match(/<polygon class="system-hit"/g)||[]).length,8);
    assert.equal((html.match(/class="cutaway-crew /g)||[]).length,5);
    assert.match(html,/class="cutaway-crew cutaway-vacant"/);
    assert.match(html,/Discharged at port/);
    assert.match(detail,/data-action="purge"/);
    assert.match(html,/id="ship-crew-side-1"/);assert.match(detail,/id="ship-crew-detail-1"/);
    assert.match(zoom,/id="ship-crew-zoom-1"/);
    assert.match(zoom,/class="ship-zoom-frame" role="region" tabindex="0"/);
    assert.match(zoom,/ship-cutaway-zoom/);
    assert.match(zoom,/--ship-plate-ratio:2000 \/ 900/);
    assert.equal((zoom.match(/<polygon class="system-hit"/g)||[]).length,8);
    assert.equal((zoom.match(/<button class="ship-zoom-system"/g)||[]).length,8);
    assert.doesNotMatch(zoom,/crew-list|crew-mini|data-action="ship-zoom"/);
    // Image failure leaves the original eight accessible SVG controls in the fallback layer.
    assert.match(html,/asset-fallback ship-cutaway-fallback/);
  }finally{globalThis.fetch=original;}
});

test('out-of-range or incomplete cutaway geometry falls back without a rendering exception',async()=>{
  const original=globalThis.fetch;
  try{
    const broken=structuredClone(geometry);broken.jump.polygon[0][0]=2;
    globalThis.fetch=async()=>({ok:true,json:async()=>broken});
    assert.equal(await loadShipGeometry(),null);
    assert.doesNotMatch(shipPanel(createInitialState('broken-art')),/ship-cutaway-overlay/);
  }finally{globalThis.fetch=original;}
});
