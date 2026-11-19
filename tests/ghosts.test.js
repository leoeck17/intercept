// OECM leak audit: before it is revealed, a jamming ghost must be indistinguishable from a
// real cruise missile on every surface the player can see. Then burn-through: a sensor close
// enough exposes the ghost, hands back rounds committed to it, and leaves the real one alone.
const { run, openGame } = require('./lib');

run('ghosts are indistinguishable until burned through', async browser => {
  const { page, errors } = await openGame(browser);
  const r = await page.evaluate(() => {
    newGame('uk'); startGame();
    G.threats = [];
    const tgt = aliveTargets()[0];
    const mk = () => makeThreat('cruise', tgt.col + 6, tgt.row, tgt.id);
    const real = mk(), ghost = mk(); ghost.ghost = true;
    G.threats.push(real, ghost); G.phase = 'engage';

    const mask = s => s.replace(/\d+/g, '#').replace(/class="primary"/g, 'class=""');  // ids and "which one is selected" legitimately differ
    const shape = t => { const o = { ...t }; delete o.tid; delete o.ghost; return JSON.stringify(o); };
    const probe = t => ({
      shape: shape(t), detected: isDetected(t), tracked: isTracked(t), heading: headingOf(t),
      aimKnown: targetKnown(t), odds: shooters().map(u => JSON.stringify(shotProfile(u, t))).join('|'),
      firingSolution: mask(assignmentHTML(t)),
    });
    const a = probe(real), b = probe(ghost);
    const diffs = Object.keys(a).filter(k => a[k] !== b[k]);
    const list = threatList(true);
    const entry = tid => { const m = list.match(new RegExp('<div class="threat[^>]*data-th="' + tid + '"[\\s\\S]*?(?=<div class="threat|$)')); return m ? mask(m[0]) : null; };
    renderBoard();
    const words = /ghost|jamm/i;
    const leaks = [words.test(list) && 'contact list', words.test(document.getElementById('board').innerHTML) && 'board',
                   words.test(assignmentHTML(ghost)) && 'firing solution'].filter(Boolean);

    // burn-through: park a battery on the ghost's hex with two rounds committed to it
    const u = G.units.find(x => !x.dead && !x.sensor);
    u.col = ghost.col; u.row = ghost.row;
    G.alloc = [{ uid: u.uid, tid: ghost.tid, rounds: 2 }];
    const burned = burnThroughPass();
    return { diffs, entriesMatch: entry(real.tid) === entry(ghost.tid), leaks, burned,
      released: G.alloc.length === 0,
      ghostGone: !G.threats.some(t => t.tid === ghost.tid),
      realKept: G.threats.some(t => t.tid === real.tid) };
  });
  const ok = !r.diffs.length && r.entriesMatch && !r.leaks.length && r.burned === 1
    && r.released && r.ghostGone && r.realKept && !errors.length;
  return { ok, detail: ok ? '' : JSON.stringify({ r, errors }) };
});
