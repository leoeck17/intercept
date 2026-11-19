// Full campaigns on both maps at the easiest and hardest settings play through to the end,
// and every drone and every jamming ghost is accounted for — resolved one way or another,
// or still in flight when the campaign ended. A drone that never arrived would hold a wave
// open; a ghost that never expired would deadlock the lull.
const { run, openGame } = require('./lib');

run('campaigns complete and every drone and ghost resolves', async browser => {
  const { page, errors } = await openGame(browser);
  const lines = [], problems = [];
  for (const diff of ['recruit', 'nightmare']) for (const scn of ['uk', 'random']) {
    const r = await page.evaluate(([d, s]) => {
      G.diff = d; G.seadDoctrine = null; newGame(s); startGame(); return autoplay();
    }, [diff, scn]);
    const S = r.stats || {};
    const ghostsOk = S.ghostSpawned === S.ghostBurned + S.ghostShot + S.ghostFaded + r.inFlight.ghost;
    const dronesOk = S.droneSpawned === S.droneKilled + S.droneLeaked + r.inFlight.drone;
    const label = `${diff}/${scn}`;
    if (r.phase !== 'over') problems.push(`${label} did not finish (${JSON.stringify(r)})`);
    if (!ghostsOk) problems.push(`${label} ghosts unaccounted`);
    if (!dronesOk) problems.push(`${label} drones unaccounted`);
    if (diff === 'recruit' && !r.sawLull) problems.push(`${label} never reached a lull`);
    lines.push(`${label}: ${r.turns} turns, ${S.cruiseSpawned} cruise, ${S.droneSpawned} drones, ${S.ghostSpawned} ghosts`);
  }
  const ok = !problems.length && !errors.length;
  return { ok, detail: ok ? lines.join('\n') : problems.concat(errors).join('\n') };
});
