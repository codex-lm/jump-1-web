/** Keyboard focus survives the innerHTML re-renders: a control is found again by its id or its data-* attributes. UI only, no game state. */
const KEY_ATTRIBUTES=['panel','station','system','id','index','choice','hex','tab','good','refit','remove','quick'];
const REGIONS=['central-panel','ship-panel','journal-panel','mobile-tabs','topbar'];
const attr=value=>String(value).replace(/["\\]/g,'\\$&');
const all=(root,selector)=>[...root.querySelectorAll(selector)];
/** Stable description of a focused element. An element with no id or action (a heading, a scroll region) keeps only its region, so focus falls back to that region's heading. */
export function focusKey(el,root){
 if(!el||typeof el.getAttribute!=='function')return null;
 const action=el.getAttribute('data-action')||'';
 const selector=el.id?`[id="${attr(el.id)}"]`:action?`[data-action="${attr(action)}"]${KEY_ATTRIBUTES.map(k=>{const v=el.getAttribute(`data-${k}`);return v==null?'':`[data-${k}="${attr(v)}"]`;}).join('')}`:'';
 const region=REGIONS.find(name=>el.closest?.(`.${name}`))||'';
 return {selector,action,region,match:root&&selector?Math.max(0,all(root,selector).indexOf(el)):0,index:root&&action?all(root,`[data-action="${attr(action)}"]`).indexOf(el):-1};
}
/** A control can take focus when it is enabled, not hidden from assistive technology and laid out. */
export function focusable(el){return !!el&&!el.disabled&&el.getAttribute?.('aria-disabled')!=='true'&&!el.closest?.('[aria-hidden="true"],[hidden]')&&(typeof el.getClientRects!=='function'||el.getClientRects().length>0);}
/** The same control, else the next control with the same action, else the previous one. */
export function findFocusTarget(root,key){
 if(!key?.selector)return null;
 const same=all(root,key.selector);
 if(focusable(same[key.match]))return same[key.match];
 const any=same.find(focusable);if(any)return any;
 if(!key.action)return null;
 const list=all(root,`[data-action="${attr(key.action)}"]`),from=Math.max(0,Math.min(key.index,list.length));
 return list.slice(from).find(focusable)||list.slice(0,from).reverse().find(focusable)||null;
}
/** First heading of a region (the central panel by default), for when the control is gone. */
export function regionHeading(root,region='central-panel'){
 const scope=(region&&root.querySelector(`.${region}`))||root.querySelector('.central-panel')||root;
 return all(scope,'h1,h2,h3').find(focusable)||all(root,'main h1,main h2').find(focusable)||null;
}
/** Headings take programmatic focus only (tabindex=-1), never a Tab stop. */
export function focusElement(el){
 if(!el)return false;
 if(/^H[1-6]$/.test(el.tagName||'')&&!el.hasAttribute('tabindex'))el.setAttribute('tabindex','-1');
 el.focus({preventScroll:true});
 return true;
}
