// Difficulty scales what the enemy brings and never what you are given: ammunition and
// victory bands are identical at every setting, the wave ladder grows, and changing
// difficulty and campaign length in either order — or repeatedly — never compounds.
const { run, openGame } = require('./lib');

run('difficulty composes with campaign length', async browser => {
  const { page, errors } = await openGame(browser);
  const r = await page.evaluate(() => {
    const snap = () => JSON.stringify({ reserve: G.reserve, ladder: G.waveSizes, bands: bandBar(),
      drip: dripBand(), cap: ballisticCap(), drone: droneFrac(), ghost: ghostFrac() });
    const rows = {};
    for (const [id] of DIFFICULTY) { G.diff = id; G.seadDoctrine = null; newGame('uk');
      rows[id] = { reserve: JSON.stringify(G.reserve), bands: JSON.stringify(bandBar()), top: G.waveSizes[G.waveSizes.length - 1] }; }
    G.diff = 'regular'; newGame('uk'); G.maxWaves = 2; rescaleAmmo(); G.diff = 'nightmare'; newGame('uk'); G.maxWaves = 2; rescaleAmmo();
    const A = snap();
    G.diff = 'nightmare'; newGame('uk'); G.maxWaves = 2; rescaleAmmo();
    const B = snap();
    G.diff = 'nightmare'; newGame('uk'); const once = snap(); newGame('uk'); newGame('uk'); const thrice = snap();
    return { rows, orderIndependent: A === B, noCompounding: once === thrice };
  });
  const ids = Object.keys(r.rows), first = r.rows[ids[0]];
  const ammoSame = ids.every(k => r.rows[k].reserve === first.reserve);
  const bandsSame = ids.every(k => r.rows[k].bands === first.bands);
  const ladderGrows = ids.every((k, i) => i === 0 || r.rows[k].top > r.rows[ids[i - 1]].top);
  const ok = ammoSame && bandsSame && ladderGrows && r.orderIndependent && r.noCompounding && !errors.length;
  return { ok, detail: ok ? '' : JSON.stringify({ ammoSame, bandsSame, ladderGrows, r, errors }) };
});
