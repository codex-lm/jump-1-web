# Third-party notices

## LOB7 Rooms SDK

`lob7-rooms.js` is the LOB7 Rooms browser SDK, downloaded without alteration
from [LOB7](https://lob7.com/lob7-rooms.js). All notices in that supplied file are
retained. It is provided by LOB7 and is not claimed as original Jump-1 code.
No additional rights or license for the SDK are asserted here.

The SDK provides the platform's room bridge. An actual selected LOB7 room is
still required to validate the live cooperative integration; simulated protocol
tests do not establish that validation.

## Rules content

Rule mechanics and tables derive from the
[Cepheus Engine SRD](https://github.com/orffen/cepheus-srd/tree/0839018902355215fb8148f0b4ce1b1f8e011080),
verified at commit `0839018902355215fb8148f0b4ce1b1f8e011080`.
[OGL.md](OGL.md) contains the complete OGL 1.0a, required copyright notices,
content designations and compatibility license. These are separate from MIT.

Cepheus Engine and Samardan Press are trademarks of Jason "Flynn" Kemp.
Jump-1 is not affiliated with Jason "Flynn" Kemp or Samardan Press.

## Font software

Fraunces, IBM Plex Sans and IBM Plex Mono are bundled under SIL OFL 1.1.
Their original notices are retained in `assets/fonts/fraunces.OFL.txt`,
`assets/fonts/ibm-plex-sans.OFL.txt` and
`assets/fonts/ibm-plex-mono.OFL.txt`. Source URLs and font file measurements
are recorded in [art/FONTS.md](art/FONTS.md).

## Suno as an audio production service

Original music and sound effects were generated through Suno for this project.
The delivered set contains 16 local runtime cues. Native files come from the
official export interface; runtime files are locally prepared derivatives.
No Suno application code or SDK is bundled, and the game does not need a Suno
connection to play these clips.

[ASSETS-LICENSE.md](ASSETS-LICENSE.md) defines the generated-media dedication,
rights scope and supporting primary sources. The service name identifies
provenance, not endorsement. [Audio provenance](assets/audio/AUDIO-PROVENANCE.json)
and [QA.md](QA.md) distinguish the 19 official exports, remote references,
local derivatives and technical checks. No perceptual listening assessment is
claimed.

## Preparation tools and runtime dependencies

Blender and FFmpeg are external preparation tools. Their executables and
libraries are not bundled in the browser game. Original project generators,
audio-preparation code and the runtime audio player are MIT code.

There are no third-party JavaScript frameworks, npm runtime dependencies or
remote scripts beyond the locally bundled Rooms SDK. The separate content
notices above continue to apply to rules, font software and generated media.
