# Jump-1 art production

Original Blender artwork by Kimi K3.1, under the direction of Cédric Bernadac. Production used Kimi Code CLI 2.3.1 with four AgentSwarm workers bound to `kimi-code/k3.1-pro`; Codex integrated and independently checked the delivered files.

The visual language is a warm space atlas: ink blue, parchment, brass, oxidized copper, matte surfaces and restrained storm violet. All ships, busts, surfaces, props, lights and compositions were modeled or generated procedurally. No stock artwork, third-party 3D models or external image textures were used.

## Delivered artwork

| Family | Files | Native dimensions |
| --- | ---: | --- |
| Hero freighter | 3 | 2400 × 1500, alpha |
| Technical cutaway | 2 + compartment JSON | 2000 × 900 base / 4000 × 1800 detail, alpha |
| Other spacecraft and map miniatures | 8 | 1200 × 600 / 128 × 128, alpha |
| World archetypes and gas giant | 13 | 512 × 512 / 768 × 768, alpha |
| Crew medallions | 16 | 512 × 512, alpha |
| Scene banners | 16 | 1600 × 600, opaque |
| Map backdrop and tileable paper | 2 | 2048 × 1280 / 1024 × 1024, opaque |

There are 60 WebP images. The 42 transparent sprites use lossless VP8L; the 18 opaque images use quality 85 WebP. `assets/manifest.json` maps the exact keys to local paths and dimensions. `assets/img/ship/cutaway.json` supplies normalized polygons and anchors for all eight ship systems. The detail view uses `ship/cutaway-hd`; the base cutaway and normalized geometry remain unchanged.

The runtime helper in `src/ui/assets.js` provides a procedural plate if a manifest entry or image is unavailable. No external image or font requests are required at runtime.

## Editable sources and regeneration

The publication branch contains ready-to-serve artwork. Generator scripts and editable `.blend` sources belong to `dev-assets`, which is kept separate from the static game. There are 55 scene designs: eight ship scenes, thirteen worlds, sixteen portraits, sixteen scene banners and two map textures. The HD cutaway retains its own render-settings variant, giving 56 saved `.blend` files. Map miniatures reuse the corresponding spacecraft geometry.

Run the following commands from the repository root on the source branch. Development prerequisites are Blender 4.5.13 LTS, Python 3.12 and Pillow 12.2; they are not game runtime dependencies. Replace `blender` with the path to your Blender executable if necessary.

```sh
blender --background --factory-startup --python-exit-code 1 --python art/build-ships.py
python art/ship-verify.py
blender --background --factory-startup --python-exit-code 1 --python art/build-worlds.py -- --world all --samples 24
python art/world-convert.py --world all
blender --background --factory-startup --python-exit-code 1 --python art/build-portraits.py -- --samples 24 --engine EEVEE
python art/portrait-verify.py --contact-sheet
blender --background --factory-startup --python-exit-code 1 --python art/build-scenes.py -- --only all --samples 24 --scale 100
python art/scene-export.py
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python art/rerender-cutaway-hd.py
python art/export-cutaway-hd.py
```

The scripts write their native renders and editable scenes under `.local/art-source/`, and their final WebP files under `assets/img/`. All script imports are local. Blender uses AgX; ships, crew and scene banners use Eevee, and worlds use CPU Cycles. Rendering does not write into the Blender installation or change user preferences.

The HD rerender opens `art/models/ships/cutaway.blend` on the source branch, with `.local/art-source/ships/cutaway.blend` as its local-authoring fallback. It preserves the existing orthographic camera, object geometry, materials, lights, framing and compartment coordinates. It renders natively at 4000 × 1800 with Eevee 128 samples, a 0.75-pixel reconstruction filter and Fog Glow Strength 0.12 (previously 0.18). It applies no raster sharpening or upscaling. The PNG and render-settings scene are saved under `.local/art-source/ships/`; the separate Pillow exporter writes an exact lossless RGBA WebP. `python art/export-cutaway-hd.py --check-only` checks the current PNG/WebP without rewriting either file. The 2000 × 900 base image and compartment JSON are protected by before/after SHA-256 checks.

The `dev-assets` branch archives the editable scenes and the HD variant under `art/models/{ships,worlds,crew,scenes,map}/`. The HD variant is `art/models/ships/cutaway-hd-canonical.blend`. The original ignored authoring paths used by the generators are:

- `.local/art-source/ships/*.blend`
- `.local/art-source/worlds/blend/*.blend`
- `.local/art-source/portraits/blends/*.blend`
- `.local/art-source/scenes/*.blend`
- `.local/art-source/map/*.blend`

## Verification and provenance

The delivery was checked for exact image dimensions, manifest paths, transparency, lossless sprite encoding, nonempty imagery, normalized compartment geometry, transparent margins on every sprite, and the total file budget. Contact sheets for every family were visually inspected. The paper texture has an average opposite-edge RGB difference below 0.6 on a 0–255 scale in each direction. French accents, including œ and Œ, were verified in all bundled fonts.

The HD refinement used Kimi K3.1 through the same CLI with two AgentSwarm workers: one for the native render and one for the source audit. Independent checks confirmed exact PNG/WebP RGBA equality and identical scene object transforms, mesh geometry, assigned material names, lights, camera and color settings between base and HD source scenes. The native PNG was visually inspected; the retained render report records a 3.39-second render and 3.92-second WebP conversion on the authoring machine. Local reports are retained with the source files.

`PROVENANCE.json` records the model bindings, published image hashes and verification summary. Full local production logs and contact sheets are retained in the ignored `.local/art-source/` authoring workspace. Optional rendered dice were omitted; the game supplies its dice in code.

## Licenses

Original renders and editable Blender models: CC0-1.0, as declared in `ASSETS-LICENSE.md`. Generator code, the procedural runtime and inline SVG artwork: MIT. Fraunces, IBM Plex Sans and IBM Plex Mono retain SIL Open Font License 1.1; their exact notices accompany the fonts. See `FONTS.md` for the official font download sources.
