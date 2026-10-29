# Local Suno audio contract

The player in `player.js` plays existing audio files only. Every audible music,
stinger and effect must be produced with Suno Music. It contains no oscillator,
procedural sound, speech synthesis or fallback sound. WebAudio supplies decoding,
mixing, clip playback and volume envelopes.

The UI and the game reducer remain separate from audio. No audio operation changes
the game state, action history, random streams or replay result.

## Manifest

Place the manifest at `assets/audio/manifest.json`. Both a flat object and the
following wrapper are accepted:

```json
{
  "schemaVersion": 1,
  "clips": {
    "music.title": {
      "src": "assets/audio/lantern-ledger.mp3",
      "volume": 0.8,
      "loop": true,
      "start": 2.5,
      "end": 62.5
    },
    "music.port": "music.title",
    "sfx.click": {
      "src": "assets/audio/brass-click.mp3",
      "volume": 0.7,
      "start": 0.1,
      "end": 0.8
    }
  }
}
```

The filenames and clip points above illustrate the schema. They do not declare
that any audio has been generated or supplied.

Each entry accepts:

| Field | Meaning |
| --- | --- |
| `src` | Local path starting with `assets/audio/`; MP3, WAV, OGG, M4A, AAC, FLAC or WebM. An optional leading `./` is accepted. |
| `volume` | Per-clip gain between 0 and 1, multiplied by the user's music or effects volume. Default 1. |
| `loop` | Defaults to true for `music.*`. Effects and stingers always play once, even when this flag is true. |
| `start` | Start offset in seconds, default 0. |
| `end` | Exclusive clip end in seconds, default decoded file duration. Clamped to the real duration. Must exceed `start`. |

An entry may instead be the name of another logical key, as in `music.port` above.
Aliases cannot form cycles. Identical music sources and clip bounds do not restart
when switching between contexts. Several keys may reference different slices of
the same Suno recording; its audio data is fetched and decoded once while cached.

Additional provenance, licence or descriptive fields are ignored by playback.
Keep the actual Suno generation references, download evidence and licence records
in the separate provenance document maintained by the asset pipeline.

All paths are local. Remote URLs, data URLs, backslashes, traversal segments and
encoded traversal segments are rejected. An empty manifest (`{}` or
`{"schemaVersion":1,"clips":{}}`) is valid and results in silence. Missing entries
never cause requests for invented filenames. A missing optional manifest or a
missing/undecodable file is caught and never raises an unhandled exception.
The manifest is read once per player instance, including an empty or absent
manifest, so repeated gestures do not generate repeated missing-file requests.
Reload the page after replacing development audio files or their manifest.

There are 17 logical keys and up to 16 unique recordings when port aliases title:

| Key | Purpose |
| --- | --- |
| `music.title` | Title and crew creation. |
| `music.port` | Port ambience; may alias title. If absent, title is used. |
| `music.travel` | Jump travel, drift and breakdown scenes. |
| `music.threat` | Pirates, repossession and active bank pursuit. |
| `stinger.victory` | One shot on a successful ending. |
| `stinger.defeat` | One shot on any other ending. |
| `sfx.click` | A UI or action confirmation. |
| `sfx.dice` | A task roll or crew generation. |
| `sfx.trade` | A completed purchase, sale, booking, contract acceptance or payment. |
| `sfx.jump` | The number of jumps increases. |
| `sfx.arrival` | Arrival is completed after an encounter. A jump takes priority when both happen in one action. |
| `sfx.laser` | The gunner fires during a resolved combat round. |
| `sfx.impact` | Player hull or structure decreases. |
| `sfx.alarm` | Bank pressure rises or a threatening encounter opens. |
| `sfx.repair` | A repair completes. |
| `sfx.refuel` | Refuelling or a refined-fuel purge completes. |
| `sfx.message` | A bank letter or a secret revelation appears. |

## Player API

```js
import {createAudioPlayer} from './audio/player.js';

const audio = createAudioPlayer({
  onStatus(status) {
    // Update translated UI from status data. Do not display error codes directly.
  }
});

// Call directly from a click, pointer or keyboard gesture.
await audio.unlock();
audio.setContext('title');

audio.setEnabled(true);
audio.setVolumes({music:0.22,sfx:0.55});

// After an accepted reducer action:
audio.onAction(previousState,nextState,action);

// Optional UI-only click. Never send UI_CLICK to the game reducer or save it.
audio.onAction(null,null,{t:'UI_CLICK'});

// On page teardown:
audio.close();
```

`createAudioPlayer()` itself performs no fetch and creates no audio context.
`unlock()` creates and resumes its context synchronously within the user gesture,
then loads the optional manifest and starts the requested music. It resolves to a
boolean; autoplay refusal or unsupported audio resolves false. A later gesture
may retry. Browsers exposing `navigator.userActivation` also require evidence of
a user gesture in this document. No recording can play before a successful unlock.

The enabled preference defaults to true but remains acoustically locked until
`unlock()`. Initial bus volumes are music 0.22 and effects 0.55. Preference reads
and writes use `jump1.audio.v1`, always in `try/catch`; unavailable storage is
harmless. Disabling stops music and all effects and cancels pending playback.
Enabling never bypasses the gesture requirement.

`setContext()` accepts `title`, `port`, `travel`, `threat`, `victory`, `defeat`.
The first four select the corresponding music key; endings fade out music and
play their stinger once. Repeated renders in the same context do not restart
recordings. The UI should call `setContext('title')` when returning home. Accepted
game actions automatically select an appropriate game context.

Music crossfades last 0.9 seconds and use native gain automation. Native buffer
loops obey start/end bounds. There is no animation loop, polling timer or rAF.
At most two music voices overlap during a fade and four effects/stingers can
play together. Older effects are stopped when necessary. The decoder caches at
most six source files, shares in-flight requests and suppresses repeated requests
for a broken file during the current page session. Long music has an additional
limit: only the current voice and its crossfade partner retain PCM. Once the fade
ends, the old source releases its buffer and the inactive music is evicted. A new
music decode waits for an existing retiring voice to finish, so rapid context
changes do not decode three long songs concurrently. Obsolete queued music
requests are skipped. Effects do not interrupt an active music crossfade.

For a stereo float32 decoded buffer, retained PCM bytes are approximately
`durationSeconds * contextSampleRate * 2 * 4`. With the generated 174–188 second
recordings, one full recording occupies approximately:

| Duration | Stereo 44.1 kHz | Stereo 48 kHz |
| --- | --- | --- |
| 174 seconds | 58.54 MiB | 63.72 MiB |
| 188 seconds | 63.25 MiB | 68.85 MiB |

Two 188-second songs during a crossfade retain approximately 126.51–137.70 MiB of
PCM; after the old voice ends this returns to one song. These are calculations
for retained audio data, not measured total browser RAM. Decoder workspace,
compressed files and short effects add transient memory. Clip `start`/`end`
points do not shrink the decoded source. No subjective crop has been selected.

The stopped source's nullable buffer is released according to the
[Web Audio buffer attribute](https://www.w3.org/TR/webaudio/#dom-audiobuffersourcenode-buffer).

Action effects are debounced by key and limited to two per action. A simultaneous
round therefore does not replay every station's dice sound. Invalid actions are
silent. Delayed effects more than four seconds old are dropped. Audio never makes
the reducer wait.

`onStatus` receives:

```js
{
  enabled:true,
  unlocked:false,
  available:false,
  loading:false,
  context:'title',
  playing:false,
  music:0.22,
  sfx:0.55,
  error:null,
  errorKey:null,
  closed:false
}
```

`unlocked` reflects a running audio context. `available` means the manifest has at
least one valid entry. `playing` refers to the music voice. Error codes are
`AUDIO_UNSUPPORTED`, `AUDIO_BLOCKED`, `AUDIO_FILE_UNAVAILABLE`,
`AUDIO_INVALID_CLIP` or `AUDIO_PLAYBACK_FAILED`; `errorKey` identifies a logical
key when available. These are data for the UI's bilingual catalogue. Optional
status callback errors are isolated from audio and gameplay.

`isEnabled()` returns the saved user preference. `setVolumes()` clamps values to
0–1. `close()` is idempotent and releases the audio graph and decoded cache; create
a new player to use audio after closing it.
