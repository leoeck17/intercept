// A map saved from the editor survives a page reload with its target TYPES, neutral zones
// and launch corridor intact (all three used to be lost), plays, deletes cleanly, and can
// never shadow a built-in scenario.
const { run, openGame } = require('./lib');

const snap = () => ({
  types: G.targets.map(t => t.id + ':' + t.type).join('|'),
  noDeploy: JSON.stringify(G.noDeploy), spawnZone: JSON.stringify(G.spawnZone),
  land: G.terrain.flat().filter(Boolean).length,
});

run('custom maps persist with types and zones intact', async browser => {
  const ctx = await browser.newContext();
  const { page, errors } = await openGame(browser, ctx);
  const before = await page.evaluate(sn => {
    window.prompt = () => 'Test map'; window.confirm = () => true;
    newGame('uk');
    G.terrain[3][3] = !G.terrain[3][3]; recomputeTerrainDerived();   // a real edit
    enterEditor(); saveCurrentMap();
    return eval('(' + sn + ')')();
  }, snap.toString());

  await page.reload({ waitUntil: 'load' });
  const after = await page.evaluate(sn => {
    window.confirm = () => true; closeModal();
    const listed = [...document.querySelectorAll('#scnPick option')].some(o => o.value === 'map:test-map');
    newGame('map:test-map');
    const s = eval('(' + sn + ')')();
    startGame(); spawnWave();
    const playable = G.threats.length > 0;
    newGame('map:test-map'); deleteSavedMap('map:test-map');
    const gone = !SCENARIOS.some(x => x.id === 'map:test-map')
      && !JSON.parse(localStorage.getItem('intercept_maps') || '[]').length;
    return { s, listed, playable, gone,
      noShadow: mapId('uk') !== 'uk' && SCENARIOS.filter(x => x.id === 'uk').length === 1 };
  }, snap.toString());

  const same = JSON.stringify(before) === JSON.stringify(after.s);
  const ok = same && after.listed && after.playable && after.gone && after.noShadow && !errors.length;
  return { ok, detail: ok ? '' : JSON.stringify({ before, after, errors }) };
});
