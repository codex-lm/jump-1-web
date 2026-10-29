import en from '../i18n/en.js';
import fr from '../i18n/fr.js';
const dictionaries = {en,fr};
// English is the default in every browser locale. Only an explicit saved choice overrides it.
let language = 'en';
try { const stored = globalThis.localStorage?.getItem('jump1.lang'); if (stored in dictionaries) language = stored; } catch {}
export function getLanguage(){return language;}
export function setLanguage(value){language = value === 'fr' ? 'fr' : 'en'; try{globalThis.localStorage?.setItem('jump1.lang',language);}catch{} if(globalThis.document)document.documentElement.lang=language;}
export function t(key,params={}){let value=dictionaries[language][key]??en[key];if(value==null)return key;if(typeof value==='object'){value=value[params.gender]??value[new Intl.PluralRules(language).select(Number(params.count??params.terms)||0)]??value.other;}return String(value).replace(/\{([\w]+)\}/g,(_,name)=>String(params[name]??''));}
export function hasTranslation(key){return key in en && key in fr;}
export function money(value){return new Intl.NumberFormat(language==='fr'?'fr-FR':'en-GB',{maximumFractionDigits:0}).format(Number(value)||0);}
export function number(value,digits=0){return new Intl.NumberFormat(language==='fr'?'fr-FR':'en-GB',{maximumFractionDigits:digits}).format(Number(value)||0);}
export function sign(value){return Number(value)>=0?`+${value}`:String(value);}
