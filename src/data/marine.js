// Open Game Content under OGL 1.0a; see OGL.md. Numerically transcribed from the SRD.
export default {
  "id": "Marine",
  "source": "https://github.com/orffen/cepheus-srd/blob/mdbook/src/book1/character-creation.md",
  "qualification": {
    "characteristic": "INT",
    "target": 6
  },
  "survival": {
    "characteristic": "END",
    "target": 6
  },
  "commission": {
    "characteristic": "EDU",
    "target": 6
  },
  "advancement": {
    "characteristic": "SOC",
    "target": 7
  },
  "reenlistment": 6,
  "ranks": [
    {
      "title": "Trooper",
      "skill": "Zero-G",
      "level": 1
    },
    {
      "title": "Lieutenant",
      "skill": null,
      "level": 0
    },
    {
      "title": "Captain",
      "skill": null,
      "level": 0
    },
    {
      "title": "Major",
      "skill": "Tactics",
      "level": 1
    },
    {
      "title": "Lt Colonel",
      "skill": null,
      "level": 0
    },
    {
      "title": "Colonel",
      "skill": null,
      "level": 0
    },
    {
      "title": "Brigadier",
      "skill": null,
      "level": 0
    }
  ],
  "benefits": [
    "Low Passage",
    "+1 Edu",
    "Weapon",
    "Mid Passage",
    "+1 Soc",
    "High Passage",
    "Explorers' Society"
  ],
  "cash": [
    1000,
    5000,
    10000,
    10000,
    20000,
    50000,
    50000
  ],
  "tables": {
    "personal": [
      "+1 Str",
      "+1 Dex",
      "+1 End",
      "+1 Int",
      "+1 Edu",
      "Melee Combat"
    ],
    "service": [
      "Comms",
      "Demolitions",
      "Gun Combat",
      "Gunnery",
      "Melee Combat",
      "Battle Dress"
    ],
    "specialist": [
      "Electronics",
      "Gun Combat",
      "Melee Combat",
      "Survival",
      "Recon",
      "Vehicle"
    ],
    "advanced": [
      "Advocate",
      "Computer",
      "Gravitics",
      "Medicine",
      "Navigation",
      "Tactics"
    ]
  }
};
