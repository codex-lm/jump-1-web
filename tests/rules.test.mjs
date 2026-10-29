import test from 'node:test';
import assert from 'node:assert/strict';
import { hash, derive } from '../src/core/rng.js';
import { task } from '../src/core/dice.js';
import { generateCharacter, generateCrew } from '../src/rules/chargen.js';
import { generateBonds } from '../src/rules/bonds.js';
import { CHARACTERISTICS, characteristicDM, upp } from '../src/rules/characteristics.js';
import { SKILLS } from '../src/rules/skills.js';
import { CAREERS } from '../src/data/careers.js';
import { GOODS, PURCHASE_MULTIPLIERS, SALE_MULTIPLIERS } from '../src/data/goods.js';
import { generateSubsector, neighbors, distance, connectedWorlds } from '../src/rules/subsector.js';
import { tradeCodes } from '../src/rules/worldgen.js';

test('FNV-1a known vector and labelled independent deterministic streams',()=>{
  assert.equal(hash('hello'),0x4f9f2cab);
  const a=derive('lantern','crew',1),b=derive('lantern','crew',1),c=derive('lantern','crew',2);
  const seq=Array.from({length:100},()=>a());
  assert.deepEqual(seq,Array.from({length:100},()=>b()));
  assert.notDeepEqual(seq,Array.from({length:100},()=>c()));
  assert.ok(seq.every(n=>n>=0&&n<1));
});

test('task has no automatic success or failure and Jack-of-all-Trades only reduces untrained penalty',()=>{
  assert.equal(task({rng:()=>0,skill:4,characteristic:15}).success,true);
  assert.equal(task({rng:()=>.999,skill:undefined,characteristic:1,difficulty:-6}).success,false);
  assert.equal(task({rng:()=>0,skill:undefined,joat:10}).skill,0);
  assert.equal(task({rng:()=>0,skill:0,joat:3}).skill,0);
  assert.equal(characteristicDM(0),-3);
  assert.equal(upp({STR:7,DEX:10,END:8,INT:11,EDU:9,SOC:5}),'7A8B95');
});

test('1000 lifepaths: bounded characteristics, closed skill list, deterministic history, safe aging',()=>{
  for(let i=0;i<1000;i++) {
    const seed=`lifepath-${i}`,index=i%5,crew=generateCharacter(seed,index);
    assert.equal(crew.station,index+1);
    assert.ok(crew.age>=22&&crew.age<=38);
    assert.ok(crew.terms.length>=1&&crew.terms.length<=5);
    for(const key of CHARACTERISTICS) assert.ok(crew.characteristics[key]>=1&&crew.characteristics[key]<=15);
    for(const [key,n] of Object.entries(crew.skills)){assert.ok(key in SKILLS);assert.ok(n>=0&&n<=4);}
    assert.ok(crew.cash>=0&&crew.shipBenefit>=0&&crew.alive);
    assert.deepEqual(crew,generateCharacter(seed,index));
    assert.deepEqual(generateCharacter(seed,index,{career:'Rogue',terms:1}).terms[0].qualification?.dice,generateCharacter(seed,index,{career:'Rogue',terms:5}).terms[0].qualification?.dice);
  }
});

test('all eight career data tables transcribed completely; detailed choices stay reproducible',()=>{
  assert.equal(Object.keys(CAREERS).length,8);
  for(const career of Object.values(CAREERS)) {
    assert.equal(career.cash.length,7);
    assert.equal(career.benefits.length,7);
    for(const table of Object.values(career.tables)) assert.equal(table.length,6);
  }
  const crew=generateCrew('bonded-crew');
  assert.equal(crew.length,5);
  assert.deepEqual(generateBonds('bonded-crew',crew),generateBonds('bonded-crew',crew));
  for(const career of Object.keys(CAREERS)) assert.equal(generateCharacter('all-careers',2,{career,table:'advanced',terms:5,benefitChoices:['material']}).alive,true);
});

test('odd-q hex neighbors are reciprocal and exactly one parsec apart',()=>{
  for(let q=1;q<=8;q++) for(let r=1;r<=10;r++) {
    const hex=`${String(q).padStart(2,'0')}${String(r).padStart(2,'0')}`;
    assert.equal(distance(hex,hex),0);
    for(const next of neighbors(hex)){assert.equal(distance(hex,next),1);assert.ok(neighbors(next).includes(hex));}
  }
  assert.equal(neighbors('0405').length,6);
});

test('1000 subsectors: valid UWP, A/B starting port and fourteen connected reachable worlds',()=>{
  for(let i=0;i<1000;i++) {
    const sector=generateSubsector(`subsector-${i}`),start=sector.worlds.find(w=>w.hex===sector.startHex);
    assert.ok(sector.worlds.length>=14);
    assert.ok(connectedWorlds(sector.worlds,sector.startHex).length>=14);
    assert.ok(['A','B'].includes(start.starport));
    assert.ok(start.population>=6);
    assert.notEqual(start.zone,'Amber');
    assert.ok(sector.worlds.some(w=>w.hex===sector.bankHex));
    assert.equal(new Set(sector.worlds.map(w=>w.hex)).size,sector.worlds.length);
    for(const w of sector.worlds) {
      assert.match(w.uwp,/^[ABCDEX][0-9A-F]{6}-[0-9A-F]$/);
      for(const key of ['size','hydrographics','population']) assert.ok(w[key]>=0&&w[key]<=10);
      for(const key of ['atmosphere','government','law','tech']) assert.ok(w[key]>=0&&w[key]<=15);
      assert.deepEqual(w.codes,tradeCodes(w));
      if(w.size===0){assert.equal(w.atmosphere,0);assert.equal(w.hydrographics,0);}
      if(w.population===0){assert.equal(w.government,0);assert.equal(w.law,0);assert.equal(w.tech,0);}
    }
  }
});

test('36 SRD goods cover d66 and exact purchase/sale bounds',()=>{
  assert.equal(GOODS.length,36);
  assert.equal(new Set(GOODS.map(g=>g.code)).size,36);
  for(const good of GOODS){assert.ok(good.basePrice>0);assert.ok(good.tonnage.dice>=1);assert.ok(good.tonnage.multiplier>=1);}
  assert.equal(Math.min(...PURCHASE_MULTIPLIERS),.2);
  assert.equal(Math.max(...PURCHASE_MULTIPLIERS),2);
  assert.equal(Math.min(...SALE_MULTIPLIERS),.4);
  assert.equal(Math.max(...SALE_MULTIPLIERS),4);
});
