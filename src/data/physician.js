// Open Game Content under OGL 1.0a; see OGL.md. Numerically transcribed from the SRD.
export default {
  "id": "Physician",
  "source": "https://github.com/orffen/cepheus-srd/blob/mdbook/src/book1/character-creation.md",
  "qualification": {
    "characteristic": "EDU",
    "target": 6
  },
  "survival": {
    "characteristic": "INT",
    "target": 4
  },
  "commission": {
    "characteristic": "INT",
    "target": 5
  },
  "advancement": {
    "characteristic": "EDU",
    "target": 8
  },
  "reenlistment": 5,
  "ranks": [
    {
      "title": "Intern",
      "skill": "Medicine",
      "level": 1
    },
    {
      "title": "Resident",
      "skill": null,
      "level": 0
    },
    {
      "title": "Senior Resident",
      "skill": null,
      "level": 0
    },
    {
      "title": "Chief Resident",
      "skill": null,
      "level": 0
    },
    {
      "title": "Attending Phys.",
      "skill": "Admin",
      "level": 1
    },
    {
      "title": "Service Chief",
      "skill": null,
      "level": 0
    },
    {
      "title": "Hospital Admin.",
      "skill": null,
      "level": 0
    }
  ],
  "benefits": [
    "Low Passage",
    "+1 Edu",
    "+1 Int",
    "High Passage",
    "Explorers' Society",
    "High Passage",
    "+1 Soc"
  ],
  "cash": [
    2000,
    10000,
    20000,
    20000,
    50000,
    100000,
    100000
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
      "Leadership",
      "Sciences"
    ],
    "specialist": [
      "Computer",
      "Carousing",
      "Electronics",
      "Medicine",
      "Medicine",
      "Sciences"
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
