// Boots with no errors; the board, units and all seven unit icons render.
const { run, openGame } = require('./lib');

run('boots clean and draws the board', async browser => {
  const { page, errors } = await openGame(browser);
  const s = await page.evaluate(() => {
    render();
    const uses = [...document.querySelectorAll('#board use')];
    return {
      phase: G.phase,
      hexes: document.querySelectorAll('#board polygon[data-c]').length,
      units: G.units.filter(u => !u.dead).length,
      icons: uses.length,
      emptyIcons: uses.filter(u => u.getBBox().width === 0).length,   // a <use> that resolved to nothing
      primary: PRIMARY && PRIMARY.textContent,
    };
  });
  const ok = !errors.length && s.phase === 'setup' && s.hexes === 900
    && s.icons === s.units && s.emptyIcons === 0 && /Start campaign/.test(s.primary || '');
  return { ok, detail: ok ? '' : JSON.stringify({ s, errors }) };
});
