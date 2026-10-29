// Open Game Content under OGL 1.0a; see OGL.md. Numerically transcribed from the SRD.
export default {
  "id": "Technician",
  "source": "https://github.com/orffen/cepheus-srd/blob/mdbook/src/book1/character-creation.md",
  "qualification": {
    "characteristic": "EDU",
    "target": 6
  },
  "survival": {
    "characteristic": "DEX",
    "target": 4
  },
  "commission": {
    "characteristic": "EDU",
    "target": 5
  },
  "advancement": {
    "characteristic": "INT",
    "target": 8
  },
  "reenlistment": 5,
  "ranks": [
    {
      "title": "Technician",
      "skill": "Computer",
      "level": 1
    },
    {
      "title": "Team Lead",
      "skill": null,
      "level": 0
    },
    {
      "title": "Supervisor",
      "skill": null,
      "level": 0
    },
    {
      "title": "Manager",
      "skill": null,
      "level": 0
    },
    {
      "title": "Director",
      "skill": "Admin",
      "level": 1
    },
    {
      "title": "Vice-President",
      "skill": null,
      "level": 0
    },
    {
      "title": "Executive Officer",
      "skill": null,
      "level": 0
    }
  ],
  "benefits": [
    "Low Passage",
    "+1 Edu",
    "+1 Int",
    "Mid Passage",
    "Mid Passage",
    "High Passage",
    "+1 Soc"
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
      "Gun Combat"
    ],
    "service": [
      "Admin",
      "Computer",
      "Mechanics",
      "Medicine",
      "Electronics",
      "Sciences"
    ],
    "specialist": [
      "Computer",
      "Electronics",
      "Gravitics",
      "Linguistics",
      "Engineering",
      "Animals"
    ],
    "advanced": [
      "Advocate",
      "Computer",
      "Jack o' Trades",
      "Linguistics",
      "Medicine",
      "Sciences"
    ]
  }
};
