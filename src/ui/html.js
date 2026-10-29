export function esc(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
export function button(label,action,classes='',data=''){return `<button class="${classes}" data-action="${action}" ${data}>${label}</button>`;}
const paths={
 volume:'m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',muted:'m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m-6 0 6-6',
 lantern:'M9 4h6m-3-2v2M8 7h8l2 12H6L8 7Zm1 0 1-3h4l1 3M5 21h14M12 10v6m-2-2h4',
 arrow:'M4 12h15m-5-5 5 5-5 5',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
 ship:'m3 17 4-9h9l5 9H3Zm5-5h8m-9 9h10M12 8V3m-2 2h4',
 log:'M5 3h14v18H5V3Zm4 4h6m-6 4h6m-6 4h4',crew:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9v-3a7 7 0 0 1 14 0v3',
 cargo:'m3 6 9-4 9 4v12l-9 4-9-4V6Zm0 0 9 4 9-4m-9 4v12M7 4l10 4',
 settings:'M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-7 2v4',close:'m6 6 12 12M6 18 18 6',
 fuel:'M5 21V4h9v17M3 21h13M7 7h5v5H7V7Zm7 4h3v6c0 3 4 3 4 0v-6l-3-4',
 wrench:'m15 3-3 3 3 3 3-3a6 6 0 0 1-7 8l-6 6a2 2 0 0 1-3-3l6-6a6 6 0 0 1 7-8Z',
 dice:'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h.01M12 12h.01M17 17h.01M17 7h.01M7 17h.01',
 bank:'m3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18',
 download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',star:'m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-7Z',
 check:'m4 12 5 5L20 6',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0'
};
export function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.star}"/></svg>`;}
