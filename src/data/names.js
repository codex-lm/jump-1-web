const REGISTERS = [
  {starts:['Vel','Or','Cal','Ner','Sol','Avel','Pel','Tal','Mer','Lun','Elar','Cor','Istr','Val','Lior','Ostel'],ends:['aris','ena','ora','ivo','elis','anto','essa','omar','ello','ana','iris','asto','avel','alen','iane','orin']},
  {starts:['Ost','Brev','Hald','Eir','Varn','Keld','Torn','Skel','Yl','Rosk','Alv','Myr','Norr','Svel','Tolv','Ber'],ends:['er','vik','und','holm','dal','en','isk','al','ef','ar','ill','orn','veld','ess','mar','on']},
  {starts:['Oye','Kala','Numa','Ara','Ilo','Tena','Joro','Ena','Suma','Malu','Pelu','Kato','Ralu','Ayi','Luma','Tumo'],ends:['laran','taki','moro','nela','yari','suma','kora','kana','selo','tumi','raki','lami','vani','nari','pali','yen']},
];
export function generateName(rng, register) {
  const parts = REGISTERS[register ?? rng.int(0, REGISTERS.length - 1)];
  return rng.pick(parts.starts) + rng.pick(parts.ends);
}
export const generateWorldName = generateName;
export function generatePersonName(rng) { return `${generateName(rng)} ${generateName(rng)}`; }
export function generateShipName(rng) { return generateName(rng); }
export const BAILIFF_TEMPERAMENTS = ['courteous', 'zealous', 'tired'];
