# Jump-1 · Nilo / Codex visual refresh 0.2.0

A single-player, turn-based space-trading roguelite. Command a five-person crew
aboard a 200-ton ship bought on credit, trade through the Lantern Reach, and try
to repay the bank over 52 weeks. English is the default; French is available.
Cooperative play is not available in this edition.

This is an **independent Nilo / Codex variant**, derived from the original
[Jump-1 0.1.2 release](https://lob7.com/player/br_s_837e292e-e255-4373-8387-06020925c0f4). It retains the
original setting, game systems, inherited contributions and licences. The
original game's main branch and original LOB7 edition are not replaced by this
variant. This branch is prepared source; publication and hosted acceptance are
recorded by LOB7 and must be checked separately.

The visual refresh improves readable typography, compact crew and port panels,
character dossiers and portraits, commerce quotes and mobile layouts, and scene
artwork. See the artwork provenance for the actual production process and the
QA document for recorded checks and their limits.

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
pan. Arrow keys select worlds; Enter or Space confirms; Escape returns to port.
Keys 1–5 open crew dossiers, L the log, M the map, S the ship, R a standard week
and Q a quick stop. Saves stay in the browser, with JSON export/import for backup.

## Source and branch identity

- Development snapshot: `a7acf33c9ca772703e11cd1b4a676ea1005504b9`.
- Parent LOB7 release: `br_s_837e292e-e255-4373-8387-06020925c0f4`.
- Playable branch: [`codex/visual-refresh`](https://github.com/codex-lm/jump-1-web/tree/codex/visual-refresh).
- Source and tests: [`8571a6792135827651de4952c2e5cd03df0aa817`](https://github.com/codex-lm/jump-1-web/tree/8571a6792135827651de4952c2e5cd03df0aa817).

This runtime branch includes editable game code and ready-to-serve media.
The public copy retains inherited public history; earlier private development
history is not mirrored. Source filtering excludes credentials, local work
directories, publication receipts and native authoring files. Editable Blender
projects and native audio exports are not part of this runtime package. Their
provenance and preservation are described in the accompanying records.

The source branch contains `tests/run.mjs`; the runtime branch omits test and development tooling.
An export receipt is a local packaging check, not a claim of browser or hosted
gameplay acceptance.

## Credits and rights

- **Cédric Bernadac**: Created the game design and original Lantern Reach setting; directed the production of Jump-1.
- **Nilo / Codex**: Implemented the deterministic game engine, interface, local audio player and integrations under Cédric Bernadac’s direction. Created the 0.2.0 visual refresh: compact crew and port layouts, readable commerce, responsive journal, distinct portrait families and save compatibility; refined native Blender face geometry and integrated the canonical ship into the scenes.
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
