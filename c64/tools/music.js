// The music: seven tunes for two SID voices (voice 1 the melody, voice 2 the
// bass; voice 3 is the sound effects' and the thunder's). Built into
// src/musicdata.s by tools/gen_music.js; played by src/music.s, once a frame
// from the frame interrupt.
//
// A pattern is a list of notes: "E5/4" is E in octave 5 for 4 steps, "r/2" a
// rest, "-/8" holds the note before. Steps are 1, 2, 4 or 8 (longer: hold).
// A tune's tempo is frames per step; a bar is 16 steps.
// A voice's order lists patterns to play; "+3" / "-4" transposes the
// patterns after it by semitones. The order loops.
//
// A tune marked low: true keeps its data (and the patterns only it uses) in
// main memory: the space under the I/O chips is full.
//
// Instruments: wave (0x10 triangle, 0x20 saw, 0x40 pulse, 0x80 noise),
// AD and SR (attack/decay, sustain/release nibbles), pw (pulse width,
// 0-15; pulse voices sweep it slowly for the classic SID shimmer).
'use strict';

const patterns = {
  // ---- basses: root, fifth, octave, fifth -- right for any chord, transposed
  bassR5:   'A2/4 E3/4 A3/4 E3/4',
  bassPump: 'C3/2 r/2 G3/2 r/2 C4/2 r/2 G3/2 r/2',
  bassDrone:'D2/8 A2/8',
  bassRun:  'E2/2 E3/2 E2/2 E3/2 E2/2 E3/2 E2/2 E3/2',

  // ---- the title: "Rainyday" (A minor, Am F C G)
  t1: 'E5/4 D5/2 C5/2 B4/4 C5/4',
  t2: 'A4/8 -/4 C5/4',
  t3: 'G4/4 E5/4 D5/2 C5/2 D5/4',
  t4: 'B4/8 -/8',
  t5: 'E5/4 A5/4 G5/2 E5/2 C5/4',
  t6: 'F5/4 E5/2 D5/2 C5/8',
  t7: 'E5/4 D5/2 C5/2 G4/4 C5/4',
  t8: 'B4/8 r/4 G4/2 B4/2',

  // ---- Drizzlewick (C major, C Am F G)
  v1: 'E5/2 G5/2 C6/4 B5/2 A5/2 G5/4',
  v2: 'A5/4 E5/4 C5/4 E5/4',
  v3: 'F5/2 G5/2 A5/4 G5/2 F5/2 E5/4',
  v4: 'D5/4 G5/4 B4/4 D5/4',
  v6: 'A5/2 B5/2 C6/4 E5/8',
  v7: 'F5/2 E5/2 D5/4 C5/2 D5/2 E5/4',
  v8: 'D5/4 B4/4 C5/8',

  // ---- the gloomy wilds (D minor, Dm Bb Gm A)
  w1: 'r/4 A4/4 D5/4 F5/4',
  w2: 'E5/8 D5/8',
  w3: 'r/4 G4/4 A#4/4 D5/4',
  w4: 'C#5/8 A4/8',
  w5: 'r/4 F5/4 E5/4 D5/4',
  w6: 'F5/8 D5/8',
  w7: 'A#4/4 A4/4 G4/4 A#4/4',
  w8: 'A4/8 -/8',

  // ---- battle (E minor, Em C D B)
  b1: 'E5/2 r/2 E5/2 G5/2 B5/4 A5/2 G5/2',
  b2: 'E5/2 r/2 E5/2 G5/2 C6/4 B5/2 G5/2',
  b3: 'F#5/2 r/2 F#5/2 A5/2 D6/4 C6/2 A5/2',
  b4: 'B5/4 A5/2 G5/2 F#5/4 D#5/4',
  b5: 'E5/2 G5/2 B5/2 E6/2 D6/2 B5/2 G5/2 B5/2',
  b6: 'C6/4 B5/2 A5/2 G5/4 E5/4',
  b7: 'F#5/2 A5/2 D6/2 F#5/2 E5/2 D5/2 F#5/2 A5/2',
  b8: 'B5/8 D#5/4 F#5/4',

  // ---- the Rainycastle (E Lydian: E C#m A B; js/audio.js "clouds": the
  // E major arpeggio, up in the air)
  c1: 'E4/2 G#4/2 B4/2 E5/2 G#5/4 E5/2 B4/2',
  c2: 'C#5/4 B4/2 G#4/2 E4/8',
  c3: 'A4/2 C#5/2 E5/4 D#5/2 C#5/2 B4/4',
  c4: 'B4/8 F#4/4 D#4/4',
  c5: 'E4/2 G#4/2 B4/2 E5/2 G#5/4 A#5/4',
  c6: 'B5/8 G#5/4 E5/4',
  c7: 'A5/4 G#5/2 F#5/2 E5/4 C#5/4',
  c8: 'D#5/8 B4/8',

  // ---- Sog'naroth's realm (js/audio.js "realm": E-flat, its flat second
  // and its tritone, on a sawtooth, slow)
  bassVoid: 'D#2/8 A2/8',
  r1: 'D#4/4 E4/4 A4/8',
  r2: 'A#4/8 -/8',
  r3: 'D#5/4 A#4/4 A4/4 E4/4',
  r4: 'D#4/8 r/8',

  // ---- the dungeons (js/audio.js "dungeon": F Phrygian, sparse, dripping)
  d1: 'F4/2 r/2 C5/2 r/2 C#5/4 C5/4',
  d2: 'F#4/8 F4/8',
  d3: 'r/4 G#4/2 C5/2 C#5/4 F5/4',
  d4: 'C5/8 F4/8',
};

const LEAD = { wave: 0x40, ad: 0x08, sr: 0xA9, pw: 8 };

const songs = [
  { name: 'title', tempo: 7,
    voices: [
      { ...LEAD, order: 't1 t2 t3 t4 t5 t6 t7 t8' },
      { wave: 0x10, ad: 0x08, sr: 0x88, pw: 0, order: 'bassR5 -4 bassR5 +3 bassR5 -2 bassR5 +0 bassR5 -4 bassR5 +3 bassR5 -2 bassR5' },
    ] },
  { name: 'village', tempo: 5,
    voices: [
      { ...LEAD, ad: 0x06, sr: 0x89, pw: 6, order: 'v1 v2 v3 v4 v1 v6 v7 v8' },
      { wave: 0x10, ad: 0x06, sr: 0x00, pw: 0, order: 'bassPump -3 bassPump -7 bassPump -5 bassPump +0 bassPump -3 bassPump -7 bassPump -5 bassPump' },
    ] },
  { name: 'wilds', tempo: 8,
    voices: [
      { ...LEAD, ad: 0x2A, sr: 0x9A, pw: 4, order: 'w1 w2 w3 w4 w5 w6 w7 w8' },
      { wave: 0x10, ad: 0x4A, sr: 0xAA, pw: 0, order: 'bassDrone -4 bassDrone +5 bassDrone +7 bassDrone +0 bassDrone -4 bassDrone +5 bassDrone +7 bassDrone' },
    ] },
  { name: 'battle', tempo: 4,
    voices: [
      { ...LEAD, ad: 0x05, sr: 0x89, pw: 10, order: 'b1 b2 b3 b4 b5 b6 b7 b8' },
      { wave: 0x20, ad: 0x05, sr: 0x00, pw: 0, order: 'bassRun -4 bassRun -2 bassRun -5 bassRun +0 bassRun -4 bassRun -2 bassRun -5 bassRun' },
    ] },
  { name: 'castle', tempo: 6, low: true,
    voices: [
      { ...LEAD, ad: 0x2A, sr: 0xA9, pw: 6, order: 'c1 c2 c3 c4 c5 c6 c7 c8' },
      { wave: 0x10, ad: 0x08, sr: 0x88, pw: 0, order: '-5 bassR5 -8 bassR5 +0 bassR5 +2 bassR5 -5 bassR5 -8 bassR5 +0 bassR5 +2 bassR5' },
    ] },
  { name: 'realm', tempo: 9, low: true,
    voices: [
      { wave: 0x20, ad: 0x4A, sr: 0x8B, pw: 0, order: 'r1 r2 r3 r4 r1 r2 +6 r3 +0 r4' },
      { wave: 0x10, ad: 0x4A, sr: 0xAA, pw: 0, order: 'bassVoid bassVoid bassVoid +1 bassVoid +0 bassVoid bassVoid bassVoid +1 bassVoid' },
    ] },
  { name: 'dungeon', tempo: 8, low: true,
    voices: [
      { wave: 0x10, ad: 0x0A, sr: 0x0A, pw: 0, order: 'd1 d2 d3 d4 d1 d2 d3 d4' },
      { wave: 0x10, ad: 0x4A, sr: 0xAA, pw: 0, order: '+3 bassDrone +3 bassDrone +4 bassDrone +3 bassDrone +3 bassDrone +3 bassDrone +4 bassDrone +3 bassDrone' },
    ] },
];

module.exports = { patterns, songs };
