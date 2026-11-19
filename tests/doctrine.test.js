// SEAD doctrine: under counter-sensor the enemy aims ballistics at radars; under
// counter-battery it never does. The ballistic rate is forced to every turn so each
// campaign produces plenty of aim points to inspect.
const { run, openGame } = require('./lib');

run('SEAD doctrine decides whether radars are hunted', async browser => {
  const { page, errors } = await openGame(browser);
  const r = await page.evaluate(() => {
    const aims = doctrine => {
      let radar = 0, battery = 0;
      for (let i = 0; i < 3; i++) {
        G.diff = 'regular'; G.seadDoctrine = doctrine; newGame('uk');
        G.dripBand = 20; G.ballisticCap = 40;           // a ballistic every turn
        startGame(); autoplay();
        for (const l of G.log) {
          if (/radar SEAD/.test(l.txt)) radar++;
          if (/battery SEAD/.test(l.txt)) battery++;
        }
      }
      return { radar, battery };
    };
    return { sensor: aims('sensor'), battery: aims('battery') };
  });
  // the log line is "BALLISTIC launch … → radar SEAD (…)", once per launch
  const ok = r.sensor.radar > 0 && r.battery.radar === 0 && r.battery.battery > 0 && !errors.length;
  return { ok, detail: `counter-sensor aimed at ${r.sensor.radar} radars; counter-battery aimed at ` +
    `${r.battery.radar} radars and ${r.battery.battery} batteries` + (errors.length ? '\n' + errors.join('\n') : '') };
});
