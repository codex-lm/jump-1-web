// Open Game Content under OGL 1.0a; see OGL.md. Numerically transcribed from the SRD.
export default {
  "id": "Rogue",
  "source": "https://github.com/orffen/cepheus-srd/blob/mdbook/src/book1/character-creation.md",
  "qualification": {
    "characteristic": "DEX",
    "target": 5
  },
  "survival": {
    "characteristic": "DEX",
    "target": 4
  },
  "commission": {
    "characteristic": "STR",
    "target": 6
  },
  "advancement": {
    "characteristic": "INT",
    "target": 7
  },
  "reenlistment": 4,
  "ranks": [
    {
      "title": "Independent",
      "skill": "Streetwise",
      "level": 1
    },
    {
      "title": "Associate",
      "skill": null,
      "level": 0
    },
    {
      "title": "Soldier",
      "skill": "Gun Combat",
      "level": 1
    },
    {
      "title": "Lieutenant",
      "skill": null,
      "level": 0
    },
    {
      "title": "Underboss",
      "skill": null,
      "level": 0
    },
    {
      "title": "Consigliere",
      "skill": null,
      "level": 0
    },
    {
      "title": "Boss",
      "skill": null,
      "level": 0
    }
  ],
  "benefits": [
    "Low Passage",
    "+1 Int",
    "Weapon",
    "Mid Passage",
    "Weapon",
    "High Passage",
    "+1 Soc"
  ],
  "cash": [
    1000,
    5000,
    5000,
    5000,
    10000,
    20000,
    50000
  ],
  "tables": {
    "personal": [
      "+1 Str",
      "+1 Dex",
      "+1 End",
      "Melee Combat",
      "Bribery",
      "Gambling"
    ],
    "service": [
      "Streetwise",
      "Mechanics",
      "Gun Combat",
      "Melee Combat",
      "Recon",
      "Vehicle"
    ],
    "specialist": [
      "Computer",
      "Electronics",
      "Bribery",
      "Broker",
      "Recon",
      "Vehicle"
    ],
    "advanced": [
      "Computer",
      "Gravitics",
      "Jack o' Trades",
      "Medicine",
      "Advocate",
      "Tactics"
    ]
  }
};
