// Open Game Content under OGL 1.0a; see OGL.md. Numerically transcribed from the SRD.
export default {
  "id": "Merchant",
  "source": "https://github.com/orffen/cepheus-srd/blob/mdbook/src/book1/character-creation.md",
  "qualification": {
    "characteristic": "INT",
    "target": 4
  },
  "survival": {
    "characteristic": "INT",
    "target": 5
  },
  "commission": {
    "characteristic": "INT",
    "target": 5
  },
  "advancement": {
    "characteristic": "EDU",
    "target": 8
  },
  "reenlistment": 4,
  "ranks": [
    {
      "title": "Crewman",
      "skill": "Steward",
      "level": 1
    },
    {
      "title": "Deck Cadet",
      "skill": null,
      "level": 0
    },
    {
      "title": "Fourth Officer",
      "skill": null,
      "level": 0
    },
    {
      "title": "Third Officer",
      "skill": "Pilot",
      "level": 1
    },
    {
      "title": "Second Officer",
      "skill": null,
      "level": 0
    },
    {
      "title": "First Officer",
      "skill": null,
      "level": 0
    },
    {
      "title": "Captain",
      "skill": null,
      "level": 0
    }
  ],
  "benefits": [
    "Low Passage",
    "+1 Edu",
    "Weapon",
    "High Passage",
    "1D6 Ship Shares",
    "High Passage",
    "Explorers' Society"
  ],
  "cash": [
    1000,
    5000,
    10000,
    20000,
    20000,
    50000,
    100000
  ],
  "tables": {
    "personal": [
      "+1 Str",
      "+1 Dex",
      "+1 End",
      "Zero-G",
      "Melee Combat",
      "Steward"
    ],
    "service": [
      "Comms",
      "Engineering",
      "Gun Combat",
      "Melee Combat",
      "Broker",
      "Vehicle"
    ],
    "specialist": [
      "Carousing",
      "Gunnery",
      "Jack o' Trades",
      "Medicine",
      "Navigation",
      "Piloting"
    ],
    "advanced": [
      "Advocate",
      "Engineering",
      "Medicine",
      "Navigation",
      "Sciences",
      "Tactics"
    ]
  }
};
