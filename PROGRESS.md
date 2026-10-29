# Jump-1 delivery record

The supplied specification is kept outside the published tree in `.local/SPEC.md`.
The game will be delivered and reviewed here; release on LOB7 remains a later step.

## Specification clarifications

- Campaign time follows section 9: 52 weeks, twelve instalments at weeks 4–48, final balloon at week 52. This resolves the document's conflicting descriptions of twelve and thirteen months.
- Mandatory copyright notices are reproduced faithfully. The ban on a source trademark applies to original game content, excluding the legally required OGL notice that itself contains that name.
- The user's explicit art request is applied: Kimi K3.1, with its Swarm workflow, produces original Blender art alongside procedural fallbacks. Actual model, execution and output evidence is recorded with the art delivery.

## Stage 1 — skeleton

Done: empty workspace initialized on `main`; static entrypoint, packaging metadata, local SDK and dependency-free test runner prepared.
Differences: parallel implementation is used to deliver the complete campaign; commits will contain coherent, tested milestones.
Next: deterministic core, source-verified rules, Kimi art and playable interface.

## Stages 2, 4–7 — deterministic campaign

Done: pure reducer, derived PRNG streams, source-verified eight careers and 36 commodities, 1,000-character and 1,000-subsector validation, 52-week clock, ship damage, scenes, bank pursuit, cargo/passenger/contract trading and all ending rules. Split replay is byte-identical.
Differences: these linked modules were implemented in parallel and are committed together; the nine originally requested serial commits are replaced by coherent tested milestones. Exact SRD world-generation and 2d6 price tables take precedence over approximations in the brief. Characteristic zero retains the brief's explicit −3 house rule.
Next: browser campaign, UI completion and final artistic review.

## Stage 3 — browser presentation

Done: responsive nautical/ink/brass interface, canvas star chart, SVG system diagram, crew papers, full trading panels, event rounds, bank notices and French/English catalogues. Startup arrow/Space input produces no console error. Mobile port, chart and market checked at 390 px with no horizontal overflow.
Differences: detailed crew creation chooses career, term count and training table, then shows the seeded lifepath; it does not stop at each individual career die roll. Cooperative transport is implemented and simulated, while the public game button remains marked coming soon pending real room verification and cooperative UI.
Next: complete browser playthrough, end-card export and remaining Blender families.

## Economic verification

Done: 200 Normal campaigns using only present-market information: 70 victories (35%), 88 repossessions (44%), 42 unpaid final balloons (21%). Target 30–50% reached. Full port work plus jumping costs two weeks; a quick stop costs one jump week and forbids port work. An invoice can pause and resume a planned departure without charging the port twice.
Differences: simulated success rate measures one explicit strategy, not human difficulty. Cash has a long upper tail because successful speculative trade compounds. Ordinary task rolls have no automatic 2/12 result; career survival alone follows its source natural-two rule.
Next: preserve the report and distinguish automated economic evidence from browser checks.

## User clarification — default language

Done: English is now the default regardless of browser locale. A manual French/English selection is persisted.
Differences: this explicit user request replaces the brief's browser-locale default.
Next: finish the browser campaign and deliver with the UI set to English.

## Stages 8–9 — illustrated browser campaign

Done: 59 Kimi K3.1 Pro / four-worker AgentSwarm renders, 55 editable Blender scenes, final local fonts and provenance. The browser campaign accepted 550 actions, completed 52 weeks and 20 jumps, and exported a byte-identical victory replay (`55a0768f`). JSON import, cutaway system hit regions, PNG download, clipboard image copy, port/chart/trade and audio settings at 390 × 844 px were checked. No console errors in the campaign. Mobile title overlap corrected.
Differences: no physical touch device or human campaign-duration measurement. Art source files remain outside the served main tree on a dedicated branch.
Next: complete Suno exports after the service human-verification checkpoint, final audio browser checks and release archive.

## Final rule review

Done: market offers retain their complete random fields after bookings; only crew present aboard contribute bonuses, suffer damage or enter capsules; recruitment clears the predecessor’s bonds. A bank sighting no longer seizes an account in good standing. Diligence retains 60 hull/60 structure, while hostile combat can continue up to twelve rounds and ceasefire negotiation cannot be combined with a free attack. Natural recovery proof `repo-recovery-57` defeats it at round twelve.
Differences: the twelve-round hostile bank encounter resolves the brief’s damage-versus-round-limit conflict. The corrected public-action economy simulation gives 74 wins, 84 repossessions and 42 unpaid final balloons in 200 Normal campaigns (37%). Prior browser evidence remains historical; the corrected 570-action browser campaign is being checked separately.

## User audio addition and visual review

Done: sixteen original Suno cues (three music, two ending stingers, eleven effects) are served locally, with seventeen playback keys and title/port sharing one recording. Nineteen permitted native exports are preserved locally and mirrored into OneDrive Downloads; three local musical alternatives remain outside runtime and thirteen further alternatives remain on Suno. Sources, hashes, format conversion, technical trims and loudness measurements are recorded. No subjective listening or artistic take selection is claimed. A transient human-verification checkpoint disappeared without solving or bypassing it; no purchase, track publication or unnecessary regeneration took place.
Differences: this user request replaces the initial optional procedural-audio plan. ElevenLabs was offered as an optional additional source; the delivered planned cues use Suno. The user accepted keeping the specified palette after noting its similarity to LOB7.
Next: finish the corrected browser proof, final file budget, local tag/archive and source-branch refresh.

## Corrected browser and codec verification

Done: the frozen corrected engine completed the actual browser campaign with 570 accepted acts, 47 scene rounds, 52 weeks and 20 jumps. Victory score 31,536,790, treasury 28,211,790 Cr. The real exported save replays to a byte-identical 94,024-byte reference state, hash `0043ca5e`. No browser console error or warning. Fresh Chromium also decoded all 16 delivered MP3 files after a trusted click with zero missing or failed files, then closed the test context; no sound was emitted by the codec page. The full game campaign ran with the completed Suno manifest.
Differences: subjective listening and physical-device touch testing remain unperformed and are labelled literally.
Next: seal the local release and portable source branch; no remote push or publication.

## PNG redraw regression

Done: visual inspection of the actual exported PNG caught inherited right text alignment on repeated canvas redraws. Each run-card draw now resets and restores its drawing context. A regression exercises two redraws on the same stale context, checking title, crew, score and footer anchors. The suite now contains sixty passing tests.
Differences: this is a presentation correction; campaign state and replay hash remain unchanged.

## Local v0.1.0 delivery

Done: corrected PNG re-exported and visually inspected at 1200×630, with image/png clipboard copy confirmed. English title and complete artwork checked again at 390×844 without horizontal overflow; temporary delivery-page viewport reset. The final static tree has 190 files, about 19.6 MiB, and code/styles/fonts remain about 0.6 MiB. The local v0.1.0 tag and archive preserve the solo edition; dev-assets preserves 55 Blender models, original render tools and portable audio tools/registries.
Differences: no public remote, push, LOB7 release or actual cooperative-room validation. The detailed lifepath remains an automatic seeded resolution after career/terms/table choices. Physical touch, a timed human run and subjective audio listening remain outside the evidence.

## User review — larger ship

Done: desktop ship panel widened from 220–255 px to 320–360 px, natural-ratio deck sizing and a large interactive ship view added. The enlarged plan is 1,178 px wide on the desktop check; mobile keeps a 720 px panoramic plan with eight system buttons at least 48 px high. Checked at 901 px and 390 px without document overflow, and verified system dialogs. User save exports before/after are exactly equal, with four accepted acts retained. The previous release archive is preserved as a checkpoint; the final tag/archive include this display update. No core rule or audio asset changed.

## User review — sharper ship, v0.1.1

Done: Kimi K3.1/AgentSwarm rerendered the existing Blender cutaway at native 4000×1800, Eevee 128 samples, a 0.75 px filter and reduced glow. Large ship views load this lossless 3.1 MB variant; the sidebar retains its lighter image. Layout, camera framing, compartment coordinates and overlay scale are unchanged. The browser loaded the HD file, displayed all eight hit regions and opened the correct Jump drive dialog without console errors. User save exports before/after are byte-identical. The static package contains 191 files, about 22.6 MiB. The previous v0.1.0 archive remains available.
