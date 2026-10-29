import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../src/core/state.js';
import {drawRunCard} from '../src/ui/end.js';
import {t,money} from '../src/ui/i18n.js';

test('two run-card redraws reset inherited text alignment and preserve footer/caller state',()=>{
  const originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const calls=[],stack=[];
  const context={
    textAlign:'right',textBaseline:'middle',transform:[2,0,0,2,50,10],
    globalAlpha:.25,globalCompositeOperation:'destination-out',dash:[4,2],
    font:'10px serif',fillStyle:'red',strokeStyle:'red',lineWidth:7,
    shadowBlur:20,shadowOffsetX:3,shadowOffsetY:4,shadowColor:'red',filter:'blur(2px)',
    save(){stack.push(Object.fromEntries(Object.entries(this).filter(([,value])=>typeof value!=='function').map(([key,value])=>[key,structuredClone(value)])));},
    restore(){Object.assign(this,stack.pop());},
    setTransform(...values){this.transform=values;},
    setLineDash(values){this.dash=[...values];},
    createLinearGradient(){return {addColorStop(){}};},
    fillRect(){},strokeRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},
    fillText(text,x,y){calls.push({text,x,y,align:this.textAlign,baseline:this.textBaseline,transform:[...this.transform],alpha:this.globalAlpha,composite:this.globalCompositeOperation});},
  };
  const canvas={getContext:()=>context};
  Object.defineProperty(globalThis,'document',{configurable:true,value:{getElementById:id=>id==='run-card'?canvas:null}});
  try{
    const state=createInitialState('run-card-repeat');state.ending={type:'victory',score:1234567};
    const expectedHeadings=[t('title.region'),state.ship.name.slice(0,30),t('end.victory'),t('end.score').toUpperCase(),money(state.ending.score)];
    for(let draw=0;draw<2;draw++){
      const start=calls.length;drawRunCard(state);const rendered=calls.slice(start);
      for(const text of expectedHeadings){
        const painted=rendered.find(call=>call.text===text&&call.x===62);assert.ok(painted,text);
        assert.equal(painted.align,'left',text+' must be anchored inside the left margin');
      }
      for(const painted of rendered.filter(call=>call.x===62)){
        assert.equal(painted.align,'left');assert.equal(painted.baseline,'alphabetic');
        assert.deepEqual(painted.transform,[1,0,0,1,0,0]);assert.equal(painted.alpha,1);assert.equal(painted.composite,'source-over');
      }
      const seed=rendered.find(call=>call.y===583&&call.x===62);assert.ok(seed.text.includes(state.meta.seed));assert.equal(seed.align,'left');
      const date=rendered.find(call=>call.y===583&&call.x===1000);assert.match(date.text,/^\d{4}-\d{2}-\d{2}$/);assert.equal(date.align,'right');
      const brand=rendered.find(call=>call.text==='JUMP—1');assert.equal(brand.x,1135);assert.equal(brand.y,583);assert.equal(brand.align,'right');
      assert.equal(context.textAlign,'right');assert.equal(context.textBaseline,'middle');assert.deepEqual(context.transform,[2,0,0,2,50,10]);
      assert.equal(context.globalAlpha,.25);assert.equal(context.globalCompositeOperation,'destination-out');assert.deepEqual(context.dash,[4,2]);assert.equal(stack.length,0);
    }
  }finally{
    if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else delete globalThis.document;
  }
});
