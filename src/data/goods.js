// Open Game Content: orffen/cepheus-srd book2/trade-and-commerce.md.
// The result-indexed price table uses the SRD 2d6 check result, clamped 2..16.
// Unusual Cargo (66) has no source price; Jump-1 uses a 50,000 Cr/1d6 t narrative lot.
export const GOODS = [
  {
    "id": "advanced-electronics",
    "code": 11,
    "nameKey": "goods.advanced-electronics",
    "name": "Advanced Electronics",
    "basePrice": 100000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ht",
      "In"
    ],
    "buyDM": {
      "Ht": 2,
      "In": 3
    },
    "sellDM": {
      "Ni": 2,
      "Po": 1
    },
    "illegal": false
  },
  {
    "id": "advanced-manufactured-goods",
    "code": 12,
    "nameKey": "goods.advanced-manufactured-goods",
    "name": "Advanced Manufactured Goods",
    "basePrice": 200000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "In",
      "Ri"
    ],
    "buyDM": {
      "In": 3,
      "Ri": 2
    },
    "sellDM": {
      "Ag": 1,
      "Ni": 2
    },
    "illegal": false
  },
  {
    "id": "agricultural-equipment",
    "code": 13,
    "nameKey": "goods.agricultural-equipment",
    "name": "Agricultural Equipment",
    "basePrice": 150000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "In",
      "Ri"
    ],
    "buyDM": {
      "In": 3,
      "Ri": 2
    },
    "sellDM": {
      "Ag": 2,
      "Ga": 1
    },
    "illegal": false
  },
  {
    "id": "animal-products",
    "code": 14,
    "nameKey": "goods.animal-products",
    "name": "Animal Products",
    "basePrice": 1500,
    "tonnage": {
      "dice": 4,
      "multiplier": 5
    },
    "available": [
      "Ag",
      "Ga"
    ],
    "buyDM": {
      "Ag": 2,
      "Ga": 3
    },
    "sellDM": {
      "Hi": 2,
      "Ri": 1
    },
    "illegal": false
  },
  {
    "id": "collectibles",
    "code": 15,
    "nameKey": "goods.collectibles",
    "name": "Collectibles",
    "basePrice": 50000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "In",
      "Ri"
    ],
    "buyDM": {
      "In": 2,
      "Ri": 3
    },
    "sellDM": {
      "Hi": 2,
      "Ni": 1
    },
    "illegal": false
  },
  {
    "id": "computers-computer-parts",
    "code": 16,
    "nameKey": "goods.computers-computer-parts",
    "name": "Computers & Computer Parts",
    "basePrice": 150000,
    "tonnage": {
      "dice": 2,
      "multiplier": 1
    },
    "available": [
      "Ht",
      "In"
    ],
    "buyDM": {
      "Ht": 3,
      "In": 2
    },
    "sellDM": {
      "Na": 1,
      "Ni": 2
    },
    "illegal": false
  },
  {
    "id": "crystals-gems",
    "code": 21,
    "nameKey": "goods.crystals-gems",
    "name": "Crystals & Gems",
    "basePrice": 20000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ni",
      "Na"
    ],
    "buyDM": {
      "Ni": 3,
      "Na": 2
    },
    "sellDM": {
      "In": 1,
      "Ri": 2
    },
    "illegal": false
  },
  {
    "id": "cybernetic-parts",
    "code": 22,
    "nameKey": "goods.cybernetic-parts",
    "name": "Cybernetic Parts",
    "basePrice": 250000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ht",
      "Ri"
    ],
    "buyDM": {
      "Ht": 3,
      "Ri": 2
    },
    "sellDM": {
      "Na": 1,
      "Ni": 2
    },
    "illegal": false
  },
  {
    "id": "food-service-equipment",
    "code": 23,
    "nameKey": "goods.food-service-equipment",
    "name": "Food Service Equipment",
    "basePrice": 4000,
    "tonnage": {
      "dice": 2,
      "multiplier": 1
    },
    "available": [
      "In",
      "Na"
    ],
    "buyDM": {
      "In": 3,
      "Na": 2
    },
    "sellDM": {
      "Ag": 1,
      "Ni": 2
    },
    "illegal": false
  },
  {
    "id": "furniture",
    "code": 24,
    "nameKey": "goods.furniture",
    "name": "Furniture",
    "basePrice": 5000,
    "tonnage": {
      "dice": 4,
      "multiplier": 1
    },
    "available": [
      "Ag",
      "Ga"
    ],
    "buyDM": {
      "Ag": 2,
      "Ga": 3
    },
    "sellDM": {
      "Hi": 1,
      "Ri": 2
    },
    "illegal": false
  },
  {
    "id": "gambling-devices-equipment",
    "code": 25,
    "nameKey": "goods.gambling-devices-equipment",
    "name": "Gambling Devices & Equipment",
    "basePrice": 4000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "Hi",
      "Ri"
    ],
    "buyDM": {
      "Hi": 2,
      "Ri": 3
    },
    "sellDM": {
      "Na": 2,
      "Ni": 1
    },
    "illegal": false
  },
  {
    "id": "grav-vehicles",
    "code": 26,
    "nameKey": "goods.grav-vehicles",
    "name": "Grav Vehicles",
    "basePrice": 160000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "Ht",
      "Ri"
    ],
    "buyDM": {
      "Ht": 3,
      "Ri": 2
    },
    "sellDM": {
      "Ni": 2,
      "Po": 1
    },
    "illegal": false
  },
  {
    "id": "grocery-products",
    "code": 31,
    "nameKey": "goods.grocery-products",
    "name": "Grocery Products",
    "basePrice": 6000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ag",
      "Ga"
    ],
    "buyDM": {
      "Ag": 3,
      "Ga": 2
    },
    "sellDM": {
      "Hi": 1,
      "Ri": 2
    },
    "illegal": false
  },
  {
    "id": "household-appliances",
    "code": 32,
    "nameKey": "goods.household-appliances",
    "name": "Household Appliances",
    "basePrice": 12000,
    "tonnage": {
      "dice": 4,
      "multiplier": 1
    },
    "available": [
      "Hi",
      "In"
    ],
    "buyDM": {
      "Hi": 2,
      "In": 3
    },
    "sellDM": {
      "Na": 1,
      "Ni": 2
    },
    "illegal": false
  },
  {
    "id": "industrial-supplies",
    "code": 33,
    "nameKey": "goods.industrial-supplies",
    "name": "Industrial Supplies",
    "basePrice": 75000,
    "tonnage": {
      "dice": 2,
      "multiplier": 1
    },
    "available": [
      "In",
      "Ri"
    ],
    "buyDM": {
      "In": 3,
      "Ri": 2
    },
    "sellDM": {
      "Na": 1,
      "Ni": 2
    },
    "illegal": false
  },
  {
    "id": "liquor-other-intoxicants",
    "code": 34,
    "nameKey": "goods.liquor-other-intoxicants",
    "name": "Liquor & Other Intoxicants",
    "basePrice": 15000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ag",
      "Ga"
    ],
    "buyDM": {
      "Ag": 3,
      "Ga": 2
    },
    "sellDM": {
      "In": 1,
      "Ri": 2
    },
    "illegal": false
  },
  {
    "id": "luxury-goods",
    "code": 35,
    "nameKey": "goods.luxury-goods",
    "name": "Luxury Goods",
    "basePrice": 150000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "Ag",
      "Ga"
    ],
    "buyDM": {
      "Ag": 2,
      "Ga": 3
    },
    "sellDM": {
      "In": 1,
      "Ri": 2
    },
    "illegal": false
  },
  {
    "id": "manufacturing-equipment",
    "code": 36,
    "nameKey": "goods.manufacturing-equipment",
    "name": "Manufacturing Equipment",
    "basePrice": 750000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "In",
      "Ri"
    ],
    "buyDM": {
      "In": 3,
      "Ri": 2
    },
    "sellDM": {
      "Na": 1,
      "Ni": 2
    },
    "illegal": false
  },
  {
    "id": "medical-equipment",
    "code": 41,
    "nameKey": "goods.medical-equipment",
    "name": "Medical Equipment",
    "basePrice": 50000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ht",
      "Ri"
    ],
    "buyDM": {
      "Ht": 2,
      "Ri": 3
    },
    "sellDM": {
      "Hi": 1,
      "In": 2
    },
    "illegal": false
  },
  {
    "id": "petrochemicals",
    "code": 42,
    "nameKey": "goods.petrochemicals",
    "name": "Petrochemicals",
    "basePrice": 10000,
    "tonnage": {
      "dice": 2,
      "multiplier": 5
    },
    "available": [
      "Na",
      "Ni"
    ],
    "buyDM": {
      "Na": 2,
      "Ni": 3
    },
    "sellDM": {
      "Ag": 1,
      "In": 2
    },
    "illegal": false
  },
  {
    "id": "pharmaceuticals",
    "code": 43,
    "nameKey": "goods.pharmaceuticals",
    "name": "Pharmaceuticals",
    "basePrice": 100000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "Ht",
      "Wa"
    ],
    "buyDM": {
      "Ht": 3,
      "Wa": 2
    },
    "sellDM": {
      "In": 2,
      "Ri": 1
    },
    "illegal": false
  },
  {
    "id": "polymers",
    "code": 44,
    "nameKey": "goods.polymers",
    "name": "Polymers",
    "basePrice": 7000,
    "tonnage": {
      "dice": 4,
      "multiplier": 5
    },
    "available": [
      "In",
      "Ri"
    ],
    "buyDM": {
      "In": 2,
      "Ri": 3
    },
    "sellDM": {
      "Ni": 2,
      "Va": 1
    },
    "illegal": false
  },
  {
    "id": "precious-metals",
    "code": 45,
    "nameKey": "goods.precious-metals",
    "name": "Precious Metals",
    "basePrice": 50000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "As",
      "Ic"
    ],
    "buyDM": {
      "As": 3,
      "Ic": 2
    },
    "sellDM": {
      "In": 1,
      "Ri": 2
    },
    "illegal": false
  },
  {
    "id": "radioactives",
    "code": 46,
    "nameKey": "goods.radioactives",
    "name": "Radioactives",
    "basePrice": 1000000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "As",
      "Ni"
    ],
    "buyDM": {
      "As": 2,
      "Ni": 3
    },
    "sellDM": {
      "In": 2,
      "Ht": 1
    },
    "illegal": false
  },
  {
    "id": "robots-drones",
    "code": 51,
    "nameKey": "goods.robots-drones",
    "name": "Robots & Drones",
    "basePrice": 500000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ht",
      "In"
    ],
    "buyDM": {
      "Ht": 3,
      "In": 2
    },
    "sellDM": {
      "Ni": 1,
      "Ri": 2
    },
    "illegal": false
  },
  {
    "id": "scientific-equipment",
    "code": 52,
    "nameKey": "goods.scientific-equipment",
    "name": "Scientific Equipment",
    "basePrice": 50000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ht",
      "Ri"
    ],
    "buyDM": {
      "Ht": 3,
      "Ri": 2
    },
    "sellDM": {
      "Hi": 2,
      "Ni": 1
    },
    "illegal": false
  },
  {
    "id": "survival-gear",
    "code": 53,
    "nameKey": "goods.survival-gear",
    "name": "Survival Gear",
    "basePrice": 4000,
    "tonnage": {
      "dice": 2,
      "multiplier": 1
    },
    "available": [
      "Ga",
      "Ri"
    ],
    "buyDM": {
      "Ga": 3,
      "Ri": 2
    },
    "sellDM": {
      "Fl": 2,
      "Va": 1
    },
    "illegal": false
  },
  {
    "id": "textiles",
    "code": 54,
    "nameKey": "goods.textiles",
    "name": "Textiles",
    "basePrice": 3000,
    "tonnage": {
      "dice": 3,
      "multiplier": 5
    },
    "available": [
      "Ag",
      "Ni"
    ],
    "buyDM": {
      "Ag": 3,
      "Ni": 2
    },
    "sellDM": {
      "Na": 1,
      "Ri": 2
    },
    "illegal": false
  },
  {
    "id": "uncommon-raw-materials",
    "code": 55,
    "nameKey": "goods.uncommon-raw-materials",
    "name": "Uncommon Raw Materials",
    "basePrice": 50000,
    "tonnage": {
      "dice": 2,
      "multiplier": 5
    },
    "available": [
      "Ag",
      "Ni"
    ],
    "buyDM": {
      "Ag": 3,
      "Ni": 2
    },
    "sellDM": {
      "In": 2,
      "Na": 1
    },
    "illegal": false
  },
  {
    "id": "uncommon-unrefined-ores",
    "code": 56,
    "nameKey": "goods.uncommon-unrefined-ores",
    "name": "Uncommon Unrefined Ores",
    "basePrice": 20000,
    "tonnage": {
      "dice": 2,
      "multiplier": 5
    },
    "available": [
      "As",
      "Va"
    ],
    "buyDM": {
      "As": 2,
      "Va": 1
    },
    "sellDM": {
      "In": 2,
      "Na": 1
    },
    "illegal": false
  },
  {
    "id": "illicit-luxury-goods",
    "code": 61,
    "nameKey": "goods.illicit-luxury-goods",
    "name": "Illicit Luxury Goods",
    "basePrice": 150000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "Ag",
      "Ga"
    ],
    "buyDM": {
      "Ag": 2,
      "Ga": 3
    },
    "sellDM": {
      "In": 4,
      "Ri": 6
    },
    "illegal": true
  },
  {
    "id": "illicit-pharmaceuticals",
    "code": 62,
    "nameKey": "goods.illicit-pharmaceuticals",
    "name": "Illicit Pharmaceuticals",
    "basePrice": 100000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [
      "Ht",
      "Wa"
    ],
    "buyDM": {
      "Ht": 3,
      "Wa": 2
    },
    "sellDM": {
      "In": 6,
      "Ri": 4
    },
    "illegal": true
  },
  {
    "id": "medical-research-material",
    "code": 63,
    "nameKey": "goods.medical-research-material",
    "name": "Medical Research Material",
    "basePrice": 50000,
    "tonnage": {
      "dice": 1,
      "multiplier": 5
    },
    "available": [
      "Ht",
      "Ri"
    ],
    "buyDM": {
      "Ht": 2,
      "Ri": 3
    },
    "sellDM": {
      "In": 6,
      "Na": 4
    },
    "illegal": true
  },
  {
    "id": "military-equipment",
    "code": 64,
    "nameKey": "goods.military-equipment",
    "name": "Military Equipment",
    "basePrice": 150000,
    "tonnage": {
      "dice": 2,
      "multiplier": 1
    },
    "available": [
      "Ht",
      "In"
    ],
    "buyDM": {
      "Ht": 3,
      "In": 2
    },
    "sellDM": {
      "Hi": 6,
      "Ni": 4
    },
    "illegal": true
  },
  {
    "id": "personal-weapons-armor",
    "code": 65,
    "nameKey": "goods.personal-weapons-armor",
    "name": "Personal Weapons & Armor",
    "basePrice": 30000,
    "tonnage": {
      "dice": 2,
      "multiplier": 1
    },
    "available": [
      "In",
      "Ri"
    ],
    "buyDM": {
      "In": 3,
      "Ri": 2
    },
    "sellDM": {
      "Ni": 6,
      "Po": 4
    },
    "illegal": true
  },
  {
    "id": "unusual-cargo",
    "code": 66,
    "nameKey": "goods.unusual-cargo",
    "name": "Unusual Cargo",
    "basePrice": 50000,
    "tonnage": {
      "dice": 1,
      "multiplier": 1
    },
    "available": [],
    "buyDM": {},
    "sellDM": {},
    "illegal": false
  }
];
export const PURCHASE_MULTIPLIERS = [2, 2, 2, 1.8, 1.6, 1.4, 1.2, 1.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2];
export const SALE_MULTIPLIERS = [0.4, 0.4, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4];
export const COMMON_GOODS = [{"id": "basic-consumables", "basePrice": 1000}, {"id": "basic-electronics", "basePrice": 25000}, {"id": "basic-machine-parts", "basePrice": 10000}, {"id": "basic-manufactured", "basePrice": 20000}, {"id": "basic-raw-materials", "basePrice": 5000}, {"id": "basic-ore", "basePrice": 2000}];
