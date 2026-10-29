# Jump-1 · The Lantern Reach

A single-player, turn-based space-trading roguelite. Take command of a 200-ton
ship bought on credit, manage five crew members, trade between worlds, and try
to pay the bank before the end of a 52-week campaign.

English is the default language. Use the EN/FR control to switch to French.
The five crew stations belong to the solo player. Cooperative play is not
available in this edition; its menu entry is marked as coming soon.

## Run locally

Serve this directory over HTTP, for example with Python 3:

```sh
python -m http.server 8080
```

Open http://localhost:8080/ in a modern browser. The entrypoint is `index.html`.
The game uses plain relative ES modules and bundled images, fonts and audio.
There is no build step, npm dependency, external runtime service or backend.
Audio starts after a player gesture. Opening `index.html` with a `file:` URL
does not provide the HTTP origin required for local module and asset loading.

Use mouse or touch to select actions, worlds and cargo. Arrow keys move the
map cursor; Enter or Space confirms; Escape goes back. Keys 1–5 select crew
stations, L opens the log, M the map, S the ship, R a standard week and Q a
quick stop. Saves stay in the browser; JSON export/import allows manual backup.

## Source and edition

This is a publication copy of Jump-1 v0.1.2. It starts from the v0.1.1 source commit
`d563546d5b2af05f8bc59e87335383d2a4ef1baa` and adds a first-voyage guide, short
explanations on the crew and port screens, and a star chart that can be dragged
once zoomed. Rules and media are unchanged; the publication manifest describes
the currently playable solo edition.

The [source branch](https://github.com/codex-lm/jump-1-web/tree/12e042e45489b40a282ea6c7c0bc6423588dc121) preserves
the complete 191-file v0.1.1 snapshot, including its tests and development notes.
The public copy starts from that snapshot; it does not contain the earlier
development history. The main branch keeps the playable source and assets,
required notices, provenance and the QA document referenced by those notices.
There are no editable Blender projects or native audio exports in this runtime
copy. Their production and preservation are described by the provenance files.

## Credits and rights

- Cédric Bernadac: game design, original setting and production direction.
- Nilo / Codex: implementation, integration and validation.
- Kimi K3.1: original Blender models, materials and image renders under Cédric's direction.
- Suno: production service used for the 3 music tracks, 2 ending cues and 11 sound effects.

The game code is MIT licensed; see [LICENSE](LICENSE). Media, rules, fonts and
the supplied LOB7 Rooms SDK have separate scopes and notices:

- [ASSETS-LICENSE.md](ASSETS-LICENSE.md): generated-media dedication and rights scope.
- [OGL.md](OGL.md): full OGL 1.0a, content designations, SRD notices and compatibility licence.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): SDK, rules and font notices.
- [art/PROVENANCE.json](art/PROVENANCE.json) and [art/FONTS.md](art/FONTS.md): artwork and font provenance.
- [assets/audio/AUDIO-PROVENANCE.json](assets/audio/AUDIO-PROVENANCE.json): Suno source identities and conversion records.
- [QA.md](QA.md): technical checks and their limits, including the absence of a perceptual listening assessment.

Keep these notices and the original font licences when redistributing. The MIT
manifest field identifies the code licence; it does not relicense other content.
Jump-1 is compatible with the rules of Cepheus Engine. Cepheus Engine and
Samardan Press are trademarks of Jason "Flynn" Kemp. Jump-1 is not affiliated
with Jason "Flynn" Kemp or Samardan Press.
