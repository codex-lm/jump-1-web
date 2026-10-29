# Jump-1 — art production brief

Art director: Cédric Bernadac. Art production: Kimi K3.1 using AgentSwarm and Blender.

Create an original warm, matte space-opera atlas: nineteenth-century naval engraving, brass machinery, ochre light and the restrained warmth of painted 1970s science-fiction covers. No pixel art, neon, photorealistic faces, existing franchise designs, text baked into images, logos, watermarks, or external media.

Palette: ink #0F1B2D, parchment #EFE6D3, brass #D9A441, oxidized copper #3F8F8A, signal red #C8473B, storm violet #6B5B95, ivory #F3EEE4, ink brown #2A2118.

Blender: Eevee or Cycles, AgX, matte rough materials, restrained metallic brass edges; warm upper-left key and oxidized-copper rim. Same camera per asset family. Ship front-left three-quarter camera, elevation 20 degrees. Planets front-facing, upper-left illumination 35 degrees and soft terminator. Transparent alpha except scene banners and backdrops. Native render results convert to WebP (quality 85 banners, lossless sprites). Save editable Blender sources outside published main under .local/art-source; generators under art/.

## Required assets

Keys in assets/manifest.json map to {src,width,height}; src is relative to repository root. Actual images in assets/img/{family}/{name}.webp. No runtime outside requests.

- ship/hero-pristine, ship/hero-damaged, ship/hero-jump: 2400x1500, alpha. A squat wedge 200-ton freighter with two nacelles, dorsal turret, many warm small windows, readable cargo-bay masses and brass seams. Damaged: scorched patched plates. Jump: storm-violet halo. Hero silhouette must be distinctive and visually rich.
- ship/cutaway: 2000x900, alpha. Orthographic lateral cutaway, 8 readable compartments. assets/img/ship/cutaway.json contains normalized polygon and anchor per system: jump, maneuver, power, turret, sensors, sickbay, cargo, quarters.
- worlds/vacuum, asteroids, desert, rocky, ice, ocean, garden, jungle, volcanic, exotic, city, frozen-ocean: 512x512 alpha. Surface detail and atmosphere distinct per type. worlds/gas-giant: 768x768 alpha, ochre/cream bands and thin ring.
- ships/corsair, patrol, trader, diligence: 1200x600 alpha; each also ships/{name}-map 128x128. Corsair sharp/thorny; patrol compact/light stripes; trader patched cargo carrier; diligence massive dark 400-ton repossession cruiser with two searchlights.
- scenes/pirate, patrol, customs, derelict, gas-skim, jumpspace, drift, port-a, port-c, port-e, bar, sickbay, repo, bank, victory, defeat: 1600x600. Painted compositions with quiet left third for overlaid text. Create actual distinct scenes with objects and lighting, not flat gradients.
- crew/medallion-01 through crew/medallion-16: 512x512 alpha. Engraved profile/three-quarter bust inside a brass medallion: eight distinct morphologies at two ages, neutral gender, abstract non-photoreal faces. Fine bust geometry, collar and clothing detail. Warm brass relief and ink shadows.
- map/backdrop: 2048x1280 subdued ink nebula; map/paper: 1024x1024 tileable fine parchment.
- Optional dice/d6-1 through d6-6: 128x128 alpha brass dice with engraved pips.

## Fonts

Bundle Fraunces, IBM Plex Sans and IBM Plex Mono as woff2 in assets/fonts/, plus their SIL Open Font License. Font network requests are development-time only. Use official Google Fonts repositories / Google Fonts CSS for sources. Only necessary Latin/Latin-ext subsets and useful weights; keep total fonts under 1MiB.

## Delivery and verification

Manifest includes every delivered asset and real dimensions. Runtime fallback helper belongs src/ui/assets.js, with getAsset(key), assetMarkup(key, label, className), loadAssets(), attachAssetFallbacks(root), worldAsset(world) exports; guard all local fetch and failure. Do not depend on helper until integration is agreed.

Keep all published assets under 25MiB; total repository below 30MiB and under 200 files. Include art/README.md with exact invocation, Blender version, Kimi model and Swarm evidence summary, input/output provenance, CC0-1.0 for original renders; MIT for generator code. All third-party fonts retain SIL OFL. No copied existing game artwork. Source .blend files remain on dev-assets or in local archive prepared for it; no huge source blobs on main.

Read section 15 of .local/SPEC.md for the full original acceptance contract. It is not part of the published repository.
