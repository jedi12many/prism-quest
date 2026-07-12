// Prism Quest — faceted gemstone renderer (canvas + SVG flavors, shared geometry)

const GEM_SHAPE = {
  // pentagon-cut gem in a -50..50 space: table edge A-B, girdle C/E, culet D
  pts: { A: [-30, -38], B: [30, -38], C: [50, -8], D: [0, 44], E: [-50, -8], T: [0, -4] },
  // facet fan from center T; each entry: [corner1, corner2, light/shade overlay]
  facets: [
    ['A', 'B', 'rgba(255,255,255,0.50)'],  // table — brightest
    ['B', 'C', 'rgba(255,255,255,0.22)'],  // upper right
    ['C', 'D', 'rgba(0,0,0,0.10)'],        // lower right
    ['D', 'E', 'rgba(0,0,0,0.30)'],        // lower left — deepest
    ['E', 'A', 'rgba(255,255,255,0.08)'],  // upper left
  ],
  rainbow: ['#ff5c8a', '#ffb84a', '#ffe94a', '#5cff8a', '#5cc9ff'],
};

// Inline SVG gem for DOM (bag, recipes, polishing wheel)
function gemSVG(mineralId, size = 28) {
  const min = MINERALS[mineralId];
  const P = GEM_SHAPE.pts;
  const pt = k => P[k][0] + ',' + P[k][1];
  let facets = '';
  GEM_SHAPE.facets.forEach(([c1, c2, overlay], i) => {
    const tri = `${pt(c1)} ${pt(c2)} ${pt('T')}`;
    const base = min.rainbow ? GEM_SHAPE.rainbow[i] : min.color;
    facets += `<polygon points="${tri}" fill="${base}"/><polygon points="${tri}" fill="${overlay}"/>`;
  });
  const outline = ['A', 'B', 'C', 'D', 'E'].map(pt).join(' ');
  return `<svg class="gem" width="${size}" height="${size}" viewBox="-58 -58 116 116" aria-hidden="true">
    ${facets}
    <polygon points="${outline}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="-15" cy="-22" r="6" fill="rgba(255,255,255,0.9)"/>
    <circle cx="-4" cy="-31" r="3" fill="rgba(255,255,255,0.8)"/>
  </svg>`;
}

// Canvas gem for the overworld map. Prismatite cycles hues over time.
function drawGemCanvas(ctx, cx, cy, r, mineralId, time = 0) {
  const min = MINERALS[mineralId];
  const P = GEM_SHAPE.pts;
  const s = r / 50;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  GEM_SHAPE.facets.forEach(([c1, c2, overlay], i) => {
    ctx.beginPath();
    ctx.moveTo(P[c1][0], P[c1][1]);
    ctx.lineTo(P[c2][0], P[c2][1]);
    ctx.lineTo(P.T[0], P.T[1]);
    ctx.closePath();
    ctx.fillStyle = min.rainbow ? `hsl(${(time * 60 + i * 65) % 360}, 90%, 64%)` : min.color;
    ctx.fill();
    ctx.fillStyle = overlay;
    ctx.fill();
  });
  ctx.beginPath();
  ['A', 'B', 'C', 'D', 'E'].forEach((k, i) =>
    i ? ctx.lineTo(P[k][0], P[k][1]) : ctx.moveTo(P[k][0], P[k][1]));
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-15, -22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
