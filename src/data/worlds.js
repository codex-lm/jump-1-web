// OGC source: orffen/cepheus-srd, book3/worlds.md, UWP Values for Trade Codes.
export const TRADE_CODES = ['Ag','As','Ba','De','Fl','Ga','Hi','Ht','Ic','In','Lo','Lt','Na','Ni','Po','Ri','Wa','Va'];
export const STARPORTS = ['A','B','C','D','E','X'];
export const ARCHETYPES = ['vacuum','asteroids','desert','rocky','ice','ocean','garden','jungle','volcanic','exotic','city','frozen-ocean'];
export const STARPORT_SERVICES = {
  A: {refined:true,repair:true,berth:100}, B:{refined:true,repair:true,berth:100},
  C:{refined:false,repair:true,berth:50}, D:{refined:false,repair:false,berth:50},
  E:{refined:false,repair:false,berth:0}, X:{refined:false,repair:false,berth:0},
};
