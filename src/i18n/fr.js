import { catalog } from './catalog.js';
export default Object.fromEntries(Object.entries(catalog).map(([key,value]) => [key,value[1]]));
