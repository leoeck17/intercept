// Save/resume across a real page reload, mid-engagement with rounds committed. Checks the
// things that break quietly: the terrain distance fields (Infinity, which JSON turns into
// null), the unit id counter (a collision on the next unit built), and a corrupt save.
const { run, openGame } = require('./lib');

const fingerprint = () => ({
  phase: G.phase, turn: G.turn, waveNum: G.waveNum, enemyVP: G.enemyVP,
  diff: G.diff, doctrine: doctrine().name, drip: dripBand(), cap: ballisticCap(),
  units: G.units.map(u => [u.uid, u.type, u.col, u.row, u.mag, u.dead].join(',')).join('|'),
  aircraft: G.aircraft.map(a => [a.uid, a.state, a.ammo].join(',')).join('|'),
  threats: G.threats.map(t => [t.tid, t.type, t.col, t.row, !!t.ghost].join(',')).join('|'),
  alloc: JSON.stringify(G.alloc), reserve: JSON.stringify(G.reserve), stats: JSON.stringify(G.stats),
  UID, TID,
  infinities: G.distToLand.flat().filter(v => v === Infinity).length,
  nulls: G.distToLand.flat().filter(v => v === null).length,
  fill: G.hexFill[5][5] + G.hexFill[20][20],
});

run('save and resume across a page reload', async browser => {
  const ctx = await browser.newContext();
  const { page, errors } = await openGame(browser, ctx);
  const before = await page.evaluate(fp => {
    G.diff = 'veteran'; G.seadDoctrine = 'sensor'; newGame('uk'); startGame();
    for (let i = 0; i < 6 && G.phase !== 'over'; i++) {
      if (G.phase === 'move') toEngage();
      else if (G.phase === 'engage') resolveEngagement();
      else if (G.phase === 'resolved') beginCombatTurn(false);
      else if (G.phase === 'lull') endLullTurn();
    }
    if (G.phase === 'move') toEngage();
    for (const t of visibleThreats()) for (const u of shooters())
      if (canEngage(u, t) && shotsCap(u) - allocFor(u.uid) > 0 && ammoLeft(u) - allocatedAmmo(u) > 0) addShot(u, t);
    render(); saveGame();
    return eval('(' + fp + ')')();
  }, fingerprint.toString());

  await page.reload({ waitUntil: 'load' });
  const prompt = await page.evaluate(() => !!document.getElementById('rsGo'));
  if (prompt) await page.click('#rsGo');
  const after = await page.evaluate(fp => {
    const f = eval('(' + fp + ')')();
    const taken = new Set(G.units.concat(G.aircraft).map(u => u.uid));
    f.collides = taken.has(mkUnit('SAM', { col: 1, row: 1 }).uid);
    return f;
  }, fingerprint.toString());
  const collides = after.collides; delete after.collides;
  const diffs = Object.keys(before).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));

  // a corrupt save must fall back to a fresh campaign, not crash
  await page.evaluate(() => localStorage.setItem('intercept_save', '{"v":1,"g":{"phase":"engage","garbage":'));
  await page.reload({ waitUntil: 'load' });
  const recovered = await page.evaluate(() => !!(G && G.phase === 'setup') && !document.getElementById('rsGo'));

  const ok = prompt && !diffs.length && !collides && after.nulls === 0 && recovered && !errors.length;
  return { ok, detail: ok ? `${Object.keys(before).length} aspects of state identical after reload`
    : JSON.stringify({ prompt, diffs, collides, nulls: after.nulls, recovered, errors }) };
});
