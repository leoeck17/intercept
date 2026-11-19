// Keyboard: Space follows the primary button through the phase machine; the other keys do
// their jobs; nothing fires under a modal, while a select has focus, or with a modifier held.
const { run, openGame } = require('./lib');

run('keyboard shortcuts', async browser => {
  const { page, errors } = await openGame(browser);
  const press = async k => { await page.keyboard.press(k); await page.waitForTimeout(40); };
  const layers = () => page.evaluate(() => JSON.stringify(G.layers));

  const phases = [];
  for (let i = 0; i < 5; i++) { phases.push(await page.evaluate(() => G.phase)); await press('Space'); }

  const l0 = await layers(); await press('r'); await press('c'); await press('v');
  const toggled = (await layers()) !== l0;

  const committed = await page.evaluate(() => {
    let g = 0;
    while (G.phase !== 'engage' && G.phase !== 'over' && g++ < 50) {
      if (G.phase === 'move') toEngage(); else if (G.phase === 'resolved') beginCombatTurn(false);
      else if (G.phase === 'lull') endLullTurn(); else break; }
    for (const t of visibleThreats()) for (const u of shooters())
      if (canEngage(u, t) && shotsCap(u) - allocFor(u.uid) > 0 && ammoLeft(u) - allocatedAmmo(u) > 0) { addShot(u, t); break; }
    return G.alloc.length; });
  await press('x');
  const cleared = await page.evaluate(() => G.alloc.length === 0);

  await press('h');
  const helpOpen = await page.evaluate(() => document.getElementById('modal').classList.contains('on'));
  const l1 = await layers(); await press('r');
  const inertUnderModal = (await layers()) === l1;
  await press('Escape');
  const closed = await page.evaluate(() => !document.getElementById('modal').classList.contains('on'));

  await page.evaluate(() => { newGame('uk'); render(); document.getElementById('scnPick').focus(); });
  const l2 = await layers(); await press('r');
  const inertWhileTyping = (await layers()) === l2;

  const ok = phases[0] === 'setup' && phases.includes('engage') && toggled && committed > 0 && cleared
    && helpOpen && inertUnderModal && closed && inertWhileTyping && !errors.length;
  return { ok, detail: ok ? 'Space walked ' + phases.join(' → ')
    : JSON.stringify({ phases, toggled, committed, cleared, helpOpen, inertUnderModal, closed, inertWhileTyping, errors }) };
});
