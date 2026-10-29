# Jump-1 · Nilo / Codex 0.4.0

A single-player, turn-based space-trading roguelite. Command a five-person crew
aboard a 200-ton ship bought on credit, trade through the Lantern Reach, and try
to repay the bank over 52 weeks. English is the default; French is available.
Cooperative play is not available in this edition.

This is the published **0.4.0 edition of the existing Nilo / Codex variant**,
built on its exact [0.3.0 release](https://lob7.com/player/br_s_e6f241d3-9f5b-4ff5-942a-6be20426bdf6).
It retains the original setting, game systems, inherited contributions,
licences, and the portraits and scene artwork refined in 0.2.0. Published on 29 October 2026 at 18:23:42 UTC with all four LOB7 checks passed.
[Play this edition](https://lob7.com/player/br_s_b16740f7-8bc5-4dd2-aeec-174d21b2d8b5). Hosted browser checks confirmed the new voyage,
fuel reserve, birthday promise and save reload; see QA.md for scope and limits.

New voyages in this edition use rules edition 4: opening routes offer onward
choices, public trade requests reward limited deliveries, and two fitting bays
let captains choose fuel reserve, repair workshop or passenger cabins in exchange
for cargo space. Voyage events add decisions and later consequences. Existing
saves retain their original rules and deterministic replay; starting a new voyage
opts into the new rules. Navigation briefings, recorded dice, responsive feedback
and reduced-motion settings from 0.3.0 remain available. See the QA document for
recorded checks and their limits, and the media provenance for the actual
production process.

## Run locally

```sh
python -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080/ in a modern browser. The entrypoint is `index.html`.
The game uses editable local HTML, CSS and JavaScript modules with bundled
images, fonts and audio. There is no build step, npm dependency or external
runtime service. Audio starts after a player gesture. Serve the directory over
HTTP; a `file:` URL does not provide the origin required by modules and assets.

Use mouse or touch for actions, worlds and cargo. Drag the zoomed star chart to
pan. Arrow keys select worlds; Enter or Space opens departure confirmation
when the star chart has focus; Escape returns to port.
Keys 1–5 open crew dossiers, L the log, M the map, S the ship, R a standard week
and Q opens quick-departure confirmation. Saves stay in the browser, with JSON
export/import for backup and transfer between edition origins.

## Source and branch identity

- Development snapshot: `c3e48c4ce9506f3daecea56bc8892271fce810ab`.
- Existing LOB7 variant: `bv_s_3b846f49-e849-4413-8999-3bccbf2a7d5c`.
- Exact parent LOB7 release: `br_s_e6f241d3-9f5b-4ff5-942a-6be20426bdf6`.
- Playable branch: [`codex/visual-refresh`](https://github.com/codex-lm/jump-1-web/tree/codex/visual-refresh).
- Source and tests: [`codex/visual-refresh-source`](https://github.com/codex-lm/jump-1-web/tree/codex/visual-refresh-source).

This source branch includes the filtered editable development snapshot and its tests.
The public copy retains inherited public history; earlier private development
history is not mirrored. Source filtering excludes credentials, local work
directories, publication receipts and native authoring files. Editable Blender
projects and native audio exports are not part of this runtime package. Their
provenance and preservation are described in the accompanying records.

Run `node tests/run.mjs` from this source branch for the available automated checks.
An export receipt is a local packaging check, not a claim of browser or hosted
gameplay acceptance.

## Credits and rights

- **Cédric Bernadac**: Created the game design and original Lantern Reach setting; directed the production of Jump-1.
- **Nilo / Codex**: Implemented the engine, interface, audio and integrations under Cédric Bernadac’s direction. Refreshed layouts and native Blender faces in 0.2; added destination briefings, scene guidance, reports and motion in 0.3. Added contextual voyages, crew assistance, compact inspections, branching starts, ship fittings, market requests and linked stories in 0.4, preserving legacy saves.
- **Kimi K3.1**: Created original Blender models, materials and image renders, including the native HD ship cutaway, under Cédric Bernadac's direction. Refined the 16 crew portraits and four inhabited port/bar scenes for the 0.2.0 visual refresh.
- **Claude Opus 5.5**: Added the first-voyage guide, the crew and port explanations, and the draggable star chart in 0.1.2, under Cédric Bernadac's direction.
- **Suno**: source service for the inherited music and sound effects; see the audio provenance.

Code is MIT licensed. Other content has the scopes specified in its own notices:

- [LICENSE](LICENSE), [ASSETS-LICENSE.md](ASSETS-LICENSE.md).
- [OGL.md](OGL.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- [Artwork provenance](art/PROVENANCE.json) and [font provenance](art/FONTS.md).
- [Audio provenance](assets/audio/AUDIO-PROVENANCE.json).
- [QA record](QA.md).

Keep these notices and the original font licences when redistributing. The MIT
manifest field describes the code licence; it does not relicense other content.
Jump-1 is compatible with the rules of Cepheus Engine. Cepheus Engine and
Samardan Press are trademarks of Jason "Flynn" Kemp. Jump-1 is not affiliated
with Jason "Flynn" Kemp or Samardan Press.
