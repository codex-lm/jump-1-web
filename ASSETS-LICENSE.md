# Asset and content licenses

The implementation license and the content licenses have separate scopes. The
MIT declaration in `LOB7-GAME.json` identifies the game code; it does not replace
the licenses for rules content, fonts, the Rooms SDK, or generated media.

## Scope

| Material | License or notice |
| --- | --- |
| Original JavaScript, CSS, inline SVG, procedural canvas visuals, audio player and original procedural audio code | MIT, Copyright 2026 Cédric Bernadac; see LICENSE |
| Original Blender image renders and editable model assets | CC0-1.0, within the rights described below |
| Original Suno-generated music and sound effects actually delivered for Jump-1, including their runtime format conversions | CC0-1.0, within the rights described below |
| Asset-generation and audio-preparation scripts written for this project | MIT |
| Fraunces, IBM Plex Sans and IBM Plex Mono font software | SIL Open Font License 1.1, with original notices retained in assets/fonts/ |
| Rule mechanics, numerical tables and derived rules text or translations from the Cepheus Engine SRD | Open Game Content under OGL 1.0a; see OGL.md |
| LOB7 Rooms SDK | Supplied SDK notices; see THIRD_PARTY_NOTICES.md |

The original Jump-1 name, setting, names and narrative remain Product Identity
as identified in OGL.md. That designation does not reclassify pre-existing Open
Game Content or the media separately dedicated under CC0 here. Neither MIT nor
CC0 relicenses the rules, font software, SDK or third-party marks.

Cepheus Engine and Samardan Press are trademarks of Jason "Flynn" Kemp.
Jump-1 is not affiliated with Jason "Flynn" Kemp or Samardan Press.

## CC0 dedication for original generated media

To the extent that any copyright, related rights or neighboring rights in the
following media are held by or assigned to Cédric Bernadac, he dedicates those
rights under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/):

- Original Blender renders and editable model assets created by Kimi K3.1 under
  the direction of Cédric Bernadac for Jump-1.
- The v0.2.0 visual refresh includes native geometry refinements, canonical
  spacecraft integration and final render integration by Nilo/Codex. These
  original media retain the same CC0-1.0 scope; their generators retain MIT.
- Original Suno-generated music and sound effects delivered for Jump-1 through
  permitted official downloads, and their runtime format conversions.

The dedication applies only to rights Cédric Bernadac can grant. It is not a
claim that AI-generated output necessarily attracts copyright protection, is
exclusive or unique, or conveys rights in a provider's software or trademarks.
The [CC0 legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode.en)
sets out the waiver, fallback license and limitations. No warranty of copyright
qualification or ownership beyond the rights actually held is made here.

Blender provenance, dimensions and file hashes are recorded in
[art/PROVENANCE.json](art/PROVENANCE.json). Generator code remains MIT even where
the resulting image or model is dedicated under CC0.

## Suno recording provenance and permitted downloads

Suno's [paid-subscription guidance](https://help.suno.com/en/articles/9601665)
allows commercial uses, including video games, for permitted downloads obtained
while subscribed. Its [ownership guidance](https://help.suno.com/en/articles/2416769)
describes the position of Pro and Premier subscribers. The Premier plan was
observed for this production. Sixteen cues were generated with A/B identities:
19 takes were obtained through official exports, comprising the 16 reference
takes A and three alternative music takes B. The other 13 takes are retained as
remote references, not asserted to be permitted local commercial downloads.

The [Suno terms](https://suno.com/terms/) consulted for this edition were revised
August 10, 2026 and effective September 3, 2026. They distinguish permitted
official downloads from streams, permit incidental processing or format
conversion, and retain restrictions for the platform's Remix feature. This
production uses original generations, not that feature. Native exports and
their provenance records are preserved; a runtime MP3 conversion does not create
a new source license or establish higher source quality. Remote-only take links
are references, not proof of a permitted commercial download.

The delivered runtime set contains all 16 cues. Native exports are retained
separately, including the three alternative music takes. The CC0 scope above
covers the officially downloaded media actually delivered and their runtime
derivatives; it does not treat a remote reference as a downloaded asset.
The [audio provenance](assets/audio/AUDIO-PROVENANCE.json) records the source
identities and preparation history. [QA.md](QA.md) distinguishes delivery and
technical checks from listening, which was not performed.

## Fonts and external inputs

The bundled fonts retain their original copyright notices, SIL OFL text and any
reserved font name provisions in `assets/fonts/`; see [art/FONTS.md](art/FONTS.md).

Blender geometry and materials are original or procedural. The Suno workflow
uses original text prompts and no uploaded external recording as an input.
Generated recordings are a later addition to the initial procedural-audio
plan; they are explicitly included in the media scope above.
