// The heroes, drawn for the C64: 24 x 21 pixels, three stacked hardware
// sprites each (see gen_assets.js):
//   o        the outline: a hi-res sprite, black, on top
//   d        one detail colour: a hi-res sprite (stars, eyes, trim)
//   A B C    the fill: a multicolour sprite underneath, at 2-pixel-wide
//            resolution -- A and B are the shared sprite multicolours
//            ($D025/$D026, set per hero), C is the sprite's own colour.
//            Each 2-pixel pair takes the first fill letter it holds; an
//            outline or detail pixel over it hides it anyway.
//   .        transparent
// Rows are the left half (12 pixels); the right half mirrors it.
'use strict';
module.exports = {
  mage: {
    colors: { o: 0, d: 7, A: 6, B: 14, C: 10 },   // black; yellow; blue, light blue; light red skin
    rows: [
      '...........d',
      '.........ddd',
      '..........dd',
      '..........oB',
      '.........oBB',
      '........oABB',
      '.......oAABB',
      '......oAAABB',
      '.....oAAAddd',
      '..oooooooooo',
      '.oBBBBBBBBBB',
      '..ooooCCCCCC',
      '......oCCoCC',
      '......oCCCCC',
      '.......oCCoo',
      '....ooAABBBB',
      '...oAAABBBBd',
      '..oCAAABBBBB',
      '..oCoAABBddd',
      '...ooAAABBBB',
      '....oooooooo',
    ],
  },
  knight: {
    colors: { o: 0, d: 1, A: 3, B: 14, C: 6 },    // black; white; cyan, light blue; blue
    rows: [
      '...........d',
      '..........oA',
      '.........oAA',
      '........oAAB',
      '........oABB',
      '........oddB',
      '........oBBB',
      '.........oCB',
      '...oooooooAA',
      '..oAAdAABBBB',
      '.oAAAAABBBdB',
      '.oAAAoABBBBB',
      '.oCAo.oBBBCB',
      '.oCCo.oBBBCB',
      '..oo..oBBBBB',
      '.......oBBBo',
      '.......oBBo.',
      '.......oBBo.',
      '......oCBBo.',
      '......oCBBo.',
      '......ooooo.',
    ],
  },
  whisperer: {
    colors: { o: 0, d: 1, A: 4, B: 7, C: 10 },    // black; white; purple, golden hair; light red skin
    rows: [
      '...........d',
      '..........dd',
      '.........oBd',
      '........oBBB',
      '.......oBBBB',
      '......oBBCCC',
      '......oBCCCC',
      '......oBCCoC',
      '......oBCCCC',
      '......oBBCoo',
      '.....oBBoAAA',
      '....oBBoAAdA',
      '.....ooAAAAA',
      '....oCoAAAAA',
      '....oCoAAAdA',
      '.....ooAAAAA',
      '.....oAAAAAA',
      '....oAAAAAAA',
      '....oAAAAAAA',
      '....oooooooo',
      '.......oo...',
    ],
  },
};
