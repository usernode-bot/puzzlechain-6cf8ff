# Audio assets

Background-music and other audio assets served statically from `/audio/…`
(via `express.static('public')` in `server.js`).

## `minesweeper-bg.mp3`

The looping background track for Minesweeper. It is loaded by the
`startBackgroundMusic()` audio manager in `public/app.jsx`, decoded with the
Web Audio API's `decodeAudioData`, and played on a `loop: true` buffer source.

**This committed file is a placeholder.** It is a small (~344 KB), royalty-free,
procedurally-generated ambient pad (a 4-chord progression that swells in and out
so it loops seamlessly). It can be swapped for a real, properly-mastered MP3 at
any time — drop a replacement at this same path and nothing in the code needs to
change.

Note: `decodeAudioData` decodes from the raw bytes, independent of the file
extension or HTTP `Content-Type`, so the loader works regardless of the exact
container of the asset placed here.
