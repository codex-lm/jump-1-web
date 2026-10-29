// Open Game Content under OGL 1.0a; see OGL.md. Numerically transcribed from the SRD.
export default {
  "id": "Navy",
  "source": "https://github.com/orffen/cepheus-srd/blob/mdbook/src/book1/character-creation.md",
  "qualification": {
    "characteristic": "INT",
    "target": 6
  },
  "survival": {
    "characteristic": "INT",
    "target": 5
  },
  "commission": {
    "characteristic": "SOC",
    "target": 7
  },
  "advancement": {
    "characteristic": "EDU",
    "target": 6
  },
  "reenlistment": 5,
  "ranks": [
    {
      "title": "Starman",
      "skill": "Zero-G",
      "level": 1
    },
    {
      "title": "Midshipman",
      "skill": null,
      "level": 0
    },
    {
      "title": "Lieutenant",
      "skill": null,
      "level": 0
    },
    {
      "title": "Lt Commander",
      "skill": "Tactics",
      "level": 1
    },
    {
      "title": "Commander",
      "skill": null,
      "level": 0
    },
    {
      "title": "Captain",
      "skill": null,
      "level": 0
    },
    {
      "title": "Commodore",
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
      "Engineering",
      "Gun Combat",
      "Gunnery",
      "Melee Combat",
      "Vehicle"
    ],
    "specialist": [
      "Gravitics",
      "Jack o' Trades",
      "Melee Combat",
      "Navigation",
      "Leadership",
      "Piloting"
    ],
    "advanced": [
      "Advocate",
      "Computer",
      "Engineering",
      "Medicine",
      "Navigation",
      "Tactics"
    ]
  }
};
