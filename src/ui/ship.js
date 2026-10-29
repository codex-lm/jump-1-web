import {t,meter,portrait,esc,icon} from './common.js';
import {getAsset} from './assets.js';
import {cargoUsed,SYSTEMS} from '../rules/ship.js';

const slots=[['jump',36,46,43,47,2],['power',82,46,36,47,2],['cargo',121,46,76,47,5],['sickbay',200,46,35,47,4],['quarters',121,96,76,30,5],['maneuver',12,59,21,45,1],['turret',148,22,37,21,3],['sensors',238,52,24,39,1]];
const stationAnchors={sensors:1,jump:2,turret:3,sickbay:4,cargo:5};
let shipGeometry=null;
const validPoint=point=>Array.isArray(point)&&point.length===2&&point.every(value=>Number.isFinite(value)&&value>=0&&value<=1);

/** Optional local Blender geometry. Invalid or missing data retains the original SVG plate. */
export async function loadShipGeometry(){
  shipGeometry=null;
  try{
    const response=await fetch('./assets/img/ship/cutaway.json');
    if(!response.ok)return null;
    const source=await response.json();
    if(!source||typeof source!=='object'||!SYSTEMS.every(id=>{
      const region=source[id];
      return region&&Array.isArray(region.polygon)&&region.polygon.length>=3&&region.polygon.length<=20&&region.polygon.every(validPoint)&&validPoint(region.anchor);
    }))return null;
    shipGeometry=Object.fromEntries(SYSTEMS.map(id=>[id,{polygon:source[id].polygon.map(point=>[...point]),anchor:[...source[id].anchor]}]));
  }catch{/* Artwork is optional, including its interaction geometry. */}
  return shipGeometry;
}

function integrity(value){return value<=0?{fill:'#c8473b35',stroke:'#e5776b'}:value<3?{fill:'#d9a44125',stroke:'#d9a441'}:{fill:'#3f8f8a0a',stroke:'#71b7ac'};}
function systemLabel(state,id){return `${t(`system.${id}`)} ${state.ship.systems[id]} / 3`;}

function proceduralCutaway(state){
  return `<svg viewBox="0 0 280 145" aria-label="${esc(t('ship.systems'))}"><path d="M8 64 35 40h199l38 32-25 57H35L8 105Z" fill="#233746" stroke="#d9a44177" stroke-width="1"/><path d="M37 35h200M37 134h205M5 57v55M275 65v50" stroke="#d9a44144" stroke-width=".6"/>${slots.map(([id,x,y,w,h,station])=>{
    const color=integrity(state.ship.systems[id]);
    return `<g role="button" tabindex="0" aria-label="${esc(systemLabel(state,id))}" data-action="system" data-system="${id}"><title>${esc(systemLabel(state,id))}</title><rect class="system-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${color.fill}" stroke="${color.stroke}" stroke-width=".7"/><text class="cutaway-label" x="${x+w/2}" y="${y+h/2+3}" text-anchor="middle">${station} · ${state.ship.systems[id]}</text></g>`;
  }).join('')}<path d="M4 73H0m4 22H0m261-25 13 6-9 22" stroke="#3f8f8a" stroke-width="2"/></svg>`;
}

function crewAnchor(state,id,scope,width,height){
  const station=stationAnchors[id];
  if(!station)return '';
  const [nx,ny]=shipGeometry[id].anchor,x=nx*width,y=ny*height;
  const person=state.crew.find(p=>p.station===station),active=person?.alive&&person.active!==false;
  const image=active?getAsset(`crew/medallion-${String(person.portrait||1).padStart(2,'0')}`):null;
  const radius=39,clip=`ship-crew-${scope}-${station}`,label=active?`${person.name} · ${t(`station.${station}`)}`:t(`station.${station}`);
  return `<g class="cutaway-crew ${active?'':'cutaway-vacant'}"${active?` role="button" tabindex="0" data-action="crew" data-index="${station-1}" aria-label="${esc(label)}"`:' aria-hidden="true"'}><title>${esc(label)}</title><defs><clipPath id="${clip}"><circle cx="${x}" cy="${y}" r="${radius}"/></clipPath></defs><circle cx="${x}" cy="${y}" r="${radius+5}" fill="#0f1b2d" stroke="${active?'#d9a441':'#829296'}" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${x}" y="${y+17}" text-anchor="middle" font-size="48" fill="#f3eee4">${station}</text>${image?`<image href="./${esc(image.src)}" x="${x-radius}" y="${y-radius}" width="${radius*2}" height="${radius*2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`:''}</g>`;
}

function cutaway(state,scope){
  scope=['side','detail','zoom'].includes(scope)?scope:'side';
  const classes=`cutaway ship-cutaway-plate ship-cutaway-${scope}`;
  const artwork=getAsset('ship/cutaway');
  if(!shipGeometry||!artwork)return `<div class="${classes}" style="--ship-plate-ratio:280 / 145">${proceduralCutaway(state)}</div>`;
  // Large views use a fresh Blender render; retain the base coordinate space for controls.
  const image=(scope==='side'?null:getAsset('ship/cutaway-hd'))||artwork;
  const width=Number.isFinite(artwork.width)&&artwork.width>0?artwork.width:2000,height=Number.isFinite(artwork.height)&&artwork.height>0?artwork.height:900;
  return `<div class="${classes} asset ship-cutaway" style="--ship-plate-ratio:${width} / ${height}" data-asset="ship/cutaway"><div class="asset-fallback ship-cutaway-fallback">${proceduralCutaway(state)}</div><img src="./${esc(image.src)}" width="${width}" height="${height}" alt="${esc(t('ship.systems'))}" loading="lazy" decoding="async"><svg class="ship-cutaway-overlay" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-label="${esc(t('ship.systems'))}">${SYSTEMS.map(id=>{
    const region=shipGeometry[id],color=integrity(state.ship.systems[id]);
    const points=region.polygon.map(([x,y])=>`${x*width},${y*height}`).join(' ');
    const cx=region.polygon.reduce((sum,p)=>sum+p[0],0)/region.polygon.length*width,cy=region.polygon.reduce((sum,p)=>sum+p[1],0)/region.polygon.length*height;
    return `<g role="button" tabindex="0" aria-label="${esc(systemLabel(state,id))}" data-action="system" data-system="${id}"><title>${esc(systemLabel(state,id))}</title><polygon class="system-hit" points="${points}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="1" vector-effect="non-scaling-stroke"/><text class="ship-system-level" x="${cx}" y="${cy+18}" text-anchor="middle">${state.ship.systems[id]} / 3</text></g>`;
  }).join('')}${SYSTEMS.map(id=>crewAnchor(state,id,scope,width,height)).join('')}</svg></div>`;
}

export function shipPanel(state,scope='side'){
  return `<div class="panel-heading"><h3>${esc(t('ship.title'))}</h3><span class="eyebrow">J—1</span></div><div class="section-label">${esc(t('ship.class'))}</div>${cutaway(state,scope)}<div class="ship-view-actions"><button class="small ship-enlarge-button" data-action="ship-zoom">${icon('eye')} ${esc(t('ship.enlarge'))}</button></div>${meter(t('ship.hull'),state.ship.hull,40,'',state.ship.hull<15?'danger-fill':'')}${meter(t('ship.structure'),state.ship.structure,40)}${meter(t('ship.fuel'),state.ship.fuel,30,'t',state.ship.fuel<22.5?'danger-fill':'brass-fill')}${meter(t('ship.hold'),cargoUsed(state),82,'t','brass-fill')}<div class="muted" style="font-size:.63rem;margin-top:8px">${esc(t(state.ship.fuelType==='raw'?'ship.raw':'ship.refined'))}</div><hr class="rule"><div class="section-label">${esc(t('ship.roster'))}</div><div class="crew-list">${state.crew.map(p=>{
    const status=!p.alive?t('crew.dead'):p.active===false?t('crew.discharged'):null;
    return `<button class="crew-mini ${status?'crew-inactive':''}" data-action="crew" data-index="${p.station-1}">${portrait(p)}<div><div class="crew-name">${esc(p.name)}</div><div class="crew-role">${esc(t(`station.${p.station}`))}${status?`<span class="crew-status">${esc(status)}</span>`:''}</div></div><span class="key">${p.station}</span></button>`;
  }).join('')}</div>`;
}

/** Large interactive plate; mobile keeps its readable size and pans horizontally. */
export function shipZoom(state){
  return `<div class="ship-zoom-view"><p class="section-intro">${esc(t('ship.zoomhelp'))}</p><div class="ship-zoom-frame" role="region" tabindex="0" aria-label="${esc(t('ship.systems'))}">${cutaway(state,'zoom')}</div><div class="ship-zoom-meters">${meter(t('ship.hull'),state.ship.hull,40,'',state.ship.hull<15?'danger-fill':'')}${meter(t('ship.structure'),state.ship.structure,40)}${meter(t('ship.fuel'),state.ship.fuel,30,'t',state.ship.fuel<22.5?'danger-fill':'brass-fill')}${meter(t('ship.hold'),cargoUsed(state),82,'t','brass-fill')}</div><div class="ship-zoom-systems">${SYSTEMS.map(id=>{const value=state.ship.systems[id];return `<button class="ship-zoom-system" data-action="system" data-system="${id}"><span>${esc(t(`system.${id}`))}</span><strong class="mono ${value===0?'red':value<3?'brass':'teal'}">${value} / 3</strong></button>`;}).join('')}</div></div>`;
}

export function shipDetail(state){
  const world=state.subsector.worlds.find(w=>w.hex===state.ship.hex);
  return `<div class="eyebrow">${esc(t('ship.class'))}</div><h2 style="margin:10px 0 20px">${esc(state.ship.name)}</h2>${shipPanel(state,'detail')}<hr class="rule"><p class="section-intro">${esc(t('ship.repaircost'))}</p><div class="actions"><button class="primary" data-action="refuel">${icon('fuel')} ${esc(t('ship.refuel'))}</button>${state.ship.fuelType==='raw'&&['A','B'].includes(world?.starport)?`<button data-action="purge">${esc(t('ship.purge'))}</button>`:''}<button data-action="repair" data-system="all">${icon('wrench')} ${esc(t('ship.repair'))}</button>${world?.gasGiant?`<button data-action="skim">${esc(t('ship.skim'))}</button>`:''}</div><div class="stack" style="margin-top:20px">${Object.entries(state.ship.systems).map(([id,value])=>`<div class="row between"><span>${esc(t(`system.${id}`))}</span><span class="mono ${value===0?'red':value<3?'brass':'teal'}">${value} / 3</span><button class="small" data-action="repair" data-system="${id}">${icon('wrench')}</button></div>`).join('')}</div>`;
}
