/* Helper condivisi dai test UI: guidano forecast call e giorno di chiusura. */
export async function driveForecast(page, mode = 'honest') {
  await page.waitForSelector('.fcsheet .fcrow', { timeout: 30000 });
  await page.evaluate((m) => {
    const X = CL.ui.S.fcx;
    const rows = document.querySelectorAll('.fcsheet .fcrow');
    X.entries.forEach((e, i) => {
      const cat = m === 'honest' ? e.truth : m === 'inflate' ? 'commit' : ['commit', 'best', 'pipe', 'out'][Math.floor(Math.random() * 4)];
      rows[i].querySelector(`.segb[data-k="${cat}"]`).click();
    });
  }, mode);
  await page.getByRole('button', { name: 'Presenta il forecast' }).click();
  for (let g = 0; g < 120; g++) {
    const st = await page.evaluate(() => ({ screen: CL.ui.S.screen, ph: CL.ui.S.fcPhase, opts: (CL.ui.S.fcOpts || []).map((o) => o.kind) }));
    if (st.screen !== 'forecast') return;
    if (st.ph === 'choose') {
      const pref = mode === 'honest' ? ['honest', 'evidence', 'plan'] : mode === 'inflate' ? ['bluff', 'bad'] : [];
      let i = -1;
      for (const k of pref) { i = st.opts.indexOf(k); if (i >= 0) break; }
      if (i < 0) i = Math.floor(Math.random() * st.opts.length);
      await page.keyboard.press(String(i + 1));
      await page.waitForTimeout(30);
    } else if (st.ph === 'fb') {
      await page.locator('.fcfb [data-next]').click({ timeout: 3000 }).catch(() => {});
    } else if (st.ph === 'end') {
      await page.locator('.fcsheet.final [data-next]').click();
      return;
    } else await page.waitForTimeout(60);
  }
  throw new Error('forecast call non terminata');
}

export async function driveClosing(page) {
  for (let g = 0; g < 200; g++) {
    const st = await page.evaluate(() => CL.ui.S.screen);
    if (st !== 'closing') return;
    const btn = page.locator('.fcarea [data-next]').first();
    if (await btn.count()) await btn.click({ timeout: 2000 }).catch(() => {}); else await page.waitForTimeout(80);
  }
  throw new Error('giorno di chiusura non terminato');
}
