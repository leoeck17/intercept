// Shared helpers for the browser tests.
// Each test opens index.html straight from disk (no server needed), fails on any console
// error or uncaught exception, and reports PASS/FAIL through its exit code.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');

// Set CHROMIUM_PATH to use a browser that is already installed; otherwise Playwright uses
// the one fetched by `npx playwright install chromium`.
async function launch() {
  const opts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  return chromium.launch(opts);
}

// Opens the game with a clean slate: no save, no saved maps, no modal in the way, and the
// movement animation off so turns resolve instantly.
async function openGame(browser, context) {
  const ctx = context || await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(GAME, { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); closeModal(); ANIMATE = false; });
  await page.evaluate(AUTOPLAY);
  return { page, errors, ctx };
}

/* Defines window.autoplay(): plays the current campaign to the end by driving the game's own
   functions, committing every round it legally can. A deliberately crude player — it exists
   to exercise every phase and system, not to play well. Returns what happened. */
const AUTOPLAY = `window.autoplay = function(){
  let guard = 0, sawLull = false;
  while (G.phase !== 'over' && guard++ < 4000) {
    if (G.phase === 'lull') sawLull = true;
    if (G.phase === 'move') toEngage();
    else if (G.phase === 'engage') {
      for (const t of visibleThreats()) for (const u of shooters())
        if (canEngage(u, t) && shotsCap(u) - allocFor(u.uid) > 0 && ammoLeft(u) - allocatedAmmo(u) > 0) addShot(u, t);
      resolveEngagement();
    }
    else if (G.phase === 'resolved') beginCombatTurn(false);
    else if (G.phase === 'lull') endLullTurn();
    else return { stuck: G.phase };
  }
  return { phase: G.phase, sawLull, turns: G.turn, stats: JSON.parse(JSON.stringify(G.stats)),
    inFlight: { ghost: G.threats.filter(t => t.ghost).length,
                drone: G.threats.filter(t => t.type === 'drone').length },
    ballisticLaunched: G.ballisticLaunched };
};`;

// Run one test body; print a verdict and set the exit code.
async function run(name, body) {
  const browser = await launch();
  let ok = false, detail = '';
  try {
    const res = await body(browser);
    ok = res.ok; detail = res.detail || '';
  } catch (e) {
    detail = e.stack || String(e);
  } finally {
    await browser.close();
  }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '\n      ' + detail.split('\n').join('\n      ') : ''}`);
  process.exit(ok ? 0 : 1);
}

module.exports = { launch, openGame, run, GAME };
