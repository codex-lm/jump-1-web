import en from '../i18n/en.js';
import fr from '../i18n/fr.js';
const dictionaries = {en,fr};
// English is the default in every browser locale. Only an explicit saved choice overrides it.
let language = 'en';
try { const stored = globalThis.localStorage?.getItem('jump1.lang'); if (stored in dictionaries) language = stored; } catch {}
export function getLanguage(){return language;}
export function setLanguage(value){language = value === 'fr' ? 'fr' : 'en'; try{globalThis.localStorage?.setItem('jump1.lang',language);}catch{} if(globalThis.document){document.documentElement.lang=language;document.title=t('meta.title');}}
// Plural entries are {one,other,$n}: $n names the parameter that picks the form; count, then terms, when it is absent.
function pluralCount(value){const text=String(value??'').replace(/[\s  ]/g,'');const n=Number(language==='fr'?text.replace(',','.'):text.replace(/,/g,''));return Number.isFinite(n)?n:0;}
// French typography, applied once to the finished string: narrow no-break space before ; ! ?, no-break space before : and inside « », in digit groups and between a number and Cr, t or %.
export function frenchTypography(text){return text.replace(/ ([;!?])/g,' $1').replace(/ :/g,' :').replace(/« /g,'« ').replace(/ »/g,' »').replace(/(\d) (?=\d{3}(?!\d))/g,'$1 ').replace(/(\d) (Cr|t|%)(?![\p{L}\p{N}])/gu,'$1 $2');}
export function t(key,params={}){let value=dictionaries[language][key]??en[key];if(value==null)return key;if(typeof value==='object'){value=value[params.gender]??value[new Intl.PluralRules(language).select(pluralCount(params[value.$n]??params.count??params.terms))]??value.other;}const text=String(value).replace(/\{([\w]+)\}/g,(_,name)=>String(params[name]??''));return language==='fr'?frenchTypography(text):text;}
export function hasTranslation(key){return key in en && key in fr;}
export function money(value){return new Intl.NumberFormat(language==='fr'?'fr-FR':'en-GB',{maximumFractionDigits:0}).format(Number(value)||0);}
export function number(value,digits=0){return new Intl.NumberFormat(language==='fr'?'fr-FR':'en-GB',{maximumFractionDigits:digits}).format(Number(value)||0);}
export function sign(value){return Number(value)>=0?`+${value}`:String(value);}
