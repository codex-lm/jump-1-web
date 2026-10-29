import merchant from './merchant.js';
import navy from './navy.js';
import scout from './scout.js';
import marine from './marine.js';
import technician from './technician.js';
import physician from './physician.js';
import rogue from './rogue.js';
import drifter from './drifter.js';

export const CAREERS = {Merchant:merchant,Navy:navy,Scout:scout,Marine:marine,Technician:technician,Physician:physician,Rogue:rogue,Drifter:drifter};
export const CAREER_NAMES = Object.keys(CAREERS);
export const DEFAULT_CAREERS = ['Scout','Technician','Marine','Physician','Merchant'];
