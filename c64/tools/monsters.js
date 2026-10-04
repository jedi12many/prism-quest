// The battle portraits, drawn for the C64: 24 x 21 pixels, shown doubled.
// Each is up to four stacked hi-res sprites, one colour each:
//   o        the outline (on top)
//   a b c    colours, each its own sprite (a over b over c)
//   .        transparent
// (Not multicolour: the hero's fill sprite owns the shared sprite colours.)
// Rows are the left half (12 pixels); the right half mirrors it.
// The order matches the battle sprite numbers in data.c.
'use strict';
module.exports = [
  { name: 'slime', colors: { o: 0, a: 5, b: 13, c: 1 },     // green, light green, white eyes
    rows: [
      '............', '............', '............', '............',
      '............', '.........ooo', '.......oobbb', '......obbbaa',
      '.....obbaaaa', '....obbaaaaa', '....obaaaaaa', '...obaacccaa',
      '...obaaccoaa', '...oaaacccaa', '...oaaaaaaaa', '..oaaaaaaaoo',
      '..oaaaaaaaaa', '..oaaaaaaaaa', '...oaaaaaaaa', '....oooooooo',
      '............',
    ] },
  { name: 'bat', colors: { o: 0, a: 4, b: 6, c: 7 },        // purple, blue wings, yellow eyes
    rows: [
      '............', '............', '............', '.........o..',
      '.........oao', 'oo.......oaa', 'oao.....oaaa', 'obao...oaaaa',
      'obbao.oaaaaa', 'obbbaoaaacca', 'obbbbaaaacoa', 'obbbbbaaaaaa',
      'obbbbbbaaaao', '.obbbbbbaaaa', '..obbbobaaaa', '...obo.obaaa',
      '....o...oaaa', '.........oaa', '..........oo', '............',
      '............',
    ] },
  { name: 'shroom', colors: { o: 0, a: 2, b: 1, c: 15 },    // red cap, white spots, cream stem
    rows: [
      '............', '............', '........oooo', '......ooaaaa',
      '.....oaaabba', '....oaaaabba', '...oaaaaaaaa', '..oaabbaaaaa',
      '..oaabbaaaab', '.oaaaaaaaabb', '.oaaaaaaaaaa', '.ooooooooooo',
      '......occccc', '......ococcc', '......occccc', '......occcoo',
      '......occccc', '......occccc', '.....occcccc', '.....ooooooo',
      '............',
    ] },
  { name: 'fox', colors: { o: 0, a: 8, b: 1, c: 9 },        // orange, white muzzle, brown ears
    rows: [
      '............', '..oo........', '..oco.......', '..occo......',
      '..occao.....', '..oaaaao....', '..oaaaaaoooo', '..oaaaaaaaaa',
      '..oaaaaooaaa', '..oaaaaooaaa', '..oaaaabbaaa', '...oaabbbbaa',
      '...oabbbbbbb', '....obbbbbbb', '.....obbbbbo', '......obbbbb',
      '.......obbbb', '........oooo', '............', '............',
      '............',
    ] },
  { name: 'golem', colors: { o: 0, a: 12, b: 11, c: 3 },    // grey, dark grey, cyan eyes and core
    rows: [
      '............', '............', '.......ooooo', '......oaaaaa',
      '......oaacca', '......oaaaaa', '..ooooobaaaa', '.oaaaaobaaaa',
      'oaaaaaoaaaaa', 'oabaaaoaaacc', 'oabaaaoaaacc', 'oabaaaoaaaaa',
      'oaaaaoobaaaa', 'obbbbo.obaaa', 'obbbbo.obaaa', '.oooo..oaaaa',
      '.......oaabo', '.......oaabo', '.......oaabo', '......oaaabo',
      '......oooooo',
    ] },
  { name: 'gazer', colors: { o: 0, a: 6, b: 1, c: 4 },      // blue, white eye, purple tentacles
    rows: [
      '............', '........oooo', '......ooaaaa', '.....oaaaaaa',
      '....oaaabbbb', '....oaabbbbb', '...oaabbbboo', '...oaabbbboo',
      '...oaabbbboo', '....oaabbbbb', '....oaaaabbb', '.....oaaaaaa',
      '......oaaaaa', '......ocococ', '.....oc.c.c.', '....oc..c..c',
      '....c...c...', '...c....c..c', '...c........', '............',
      '............',
    ] },
  { name: 'spawnling', colors: { o: 0, a: 4, b: 13, c: 6 }, // purple, light green eyes, blue drips
    rows: [
      '............', '............', '............', '............',
      '............', '............', '............', '.........ooo',
      '.......ooaaa', '......oaaaaa', '.....oaaaaaa', '.....oabbaaa',
      '....oaabboaa', '....oaaaaaaa', '....oaaaaaaa', '....ocaaaaaa',
      '....occaaaaa', '....oaocaoca', '....o.oc.o.c', '.......o...o',
      '............',
    ] },
  { name: 'bogmaw', colors: { o: 0, a: 5, b: 13, c: 1 },    // green, light green belly, white eyes
    rows: [
      '............', '............', '..oooo......', '.occcco.....',
      '.occooco....', '.occooco....', '.occcco.....', '..oaaaoooooo',
      '.oaaaaaaaaaa', 'oaaaaaaaaaaa', 'oaaaaaaaaaaa', 'oaoooooooooo',
      'oaaaaaaaaaaa', 'oaabbbbbbbbb', 'oaabbbbbbbbb', 'oaabbbbbbbbb',
      '.oaabbbbbbbb', '..oaaabbbbbb', '.oaaoaaaaaaa', 'oaaaoooooooo',
      '.ooo........',
    ] },
  { name: 'voltra', colors: { o: 0, a: 3, b: 7, c: 6 },     // cyan, yellow sparks, blue belly
    rows: [
      '............', '........oooo', '......ooaaaa', '.....oaaaaaa',
      '....oaaaaaaa', '....oaabbaaa', '....oaabboaa', '....oaaaaaaa',
      '.....oaaaaao', '......oaaaco', '.......oaacc', '........oacc',
      '........oacc', '........oacc', '....ooooaacc', '..ooaaaaaaaa',
      '.oaabaaaaaaa', '.oaaacccccbc', '..ooaaaaaaaa', '....oooooooo',
      '............',
    ] },
  { name: 'mildew', colors: { o: 0, a: 5, b: 7, c: 9 },     // green, yellow spores, brown
    rows: [
      '............', '........oo.o', '......oobbob', '.....obbaaoo',
      '....oaaaaaaa', '...oaabaaaaa', '..oaaaaaaaab', '..oaaaaaaaaa',
      '.oaabaaaaaaa', '.oaaaaaoooaa', '.oaaaaaaoaaa', '.oaaaaaaaaaa',
      '.oabaaaaaaaa', '.oaaaaaaaaba', '.oaaaaaooooo', '.ocaaaaaaaaa',
      '..ocaaaaaaaa', '..occaaaaaaa', '...occcaaaaa', '....oooooooo',
      '............',
    ] },
  { name: 'umbrella', colors: { o: 0, a: 6, b: 14, c: 7 },  // blue, light blue, yellow
    rows: [
      '.........c.c', '.........ccc', '.........ooo', '.......ooaab',
      '.....ooaaaab', '....oaaaaabb', '...oaaaccabb', '..oaaaacoabb',
      '.oaaaaaaaabb', 'oaaaaaaaaabb', 'ooaoooaoooao', '...........c',
      '...........c', '...........c', '...........c', '...........c',
      '...........c', '.........c.c', '.........ccc', '............',
      '............',
    ] },
  // the dungeon keepers: their art is resident, not under I/O (keeper: true)
  { name: 'gloomtroll', keeper: true, colors: { o: 0, a: 5, b: 9, c: 1 },   // green, brown loincloth, white eyes and tusks
    rows: [
      '............', '.......ooooo', '......oaaaaa', '.....oaaaaaa',
      '.....oaacoaa', '.....oaaaaaa', '.....oaaaaco', '..oooooaaaaa',
      '.oaaaaaaaaaa', 'oaaaaaaaaaaa', 'oaaaoaaaaaaa', 'oaaaoaaaaaaa',
      'oaaaoaaaaaaa', 'oaao.oaaaaaa', 'oaao.obbbbbb', '.oo..obbbbbb',
      '.....obbbbbb', '......oaaoo.', '......oaao..', '.....oaaao..',
      '.....ooooo..',
    ] },
  { name: 'revenant', keeper: true, colors: { o: 0, a: 12, b: 11, c: 3 },  // grey stone, dark grey, cyan eyes and runes
    rows: [
      '......o...o.', '......oo.ooo', '......oaoaaa', '......oaaaaa',
      '.......obbbb', '.......obcbb', '.......obbbb', '..ooooooaaaa',
      '.oaaaaobaaaa', 'oaabbaobaaac', 'oaabbaobaacc', 'oaaaaaobaaac',
      '.oaaaaobaaaa', '..oaao.obaaa', '...oo..obaaa', '.......obaaa',
      '.......obaaa', '......obbbbb', '.....oaaaaaa', '.....oaaaaaa',
      '.....ooooooo',
    ] },
  { name: 'poltergeist', keeper: true, colors: { o: 0, a: 1, b: 14, c: 4 }, // white, light blue shade, purple eyes and mouth
    rows: [
      '............', '........oooo', '......ooaaaa', '.....oaaaaaa',
      '....oaaaaaaa', '....oaaccaaa', '....oaaccaaa', '....oaaaaaaa',
      'oo..oaaaaacc', 'oao.oaaaaacc', '.oaooaaaaaaa', '..oaaaaaaaaa',
      '...ooaaaaaaa', '....obaaaaaa', '....obaaaaaa', '.....obaaaab',
      '.....obaaabo', '......obabo.', '......obao..', '.......oo...',
      '............',
    ] },
];
