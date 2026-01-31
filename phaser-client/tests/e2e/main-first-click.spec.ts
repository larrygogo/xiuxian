import { test, expect } from '@playwright/test';

test('entering main scene accepts first click', async ({ page }) => {
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[browser:${type}] ${text}`);
  });

  await page.addInitScript(() => {
    (window as any).__E2E__ = true;
    (window as any).__E2E_FIRST_CLICK__ = 0;
    (window as any).__E2E_STATE__ = {
      characterId: 1,
      name: 'E2E',
      level: 1,
      qi: 0,
      lingshi: 0,
      hp: 10,
      maxHp: 10,
      mp: 5,
      maxMp: 5,
      statPoints: 0,
      baseStats: { str: 1, agi: 1, vit: 1, int: 1, spi: 1 },
      combatStats: {
        hit: 1,
        pdmg: 1,
        pdef: 1,
        spd: 1,
        mdmg: 1,
        mdef: 1,
        maxHp: 10,
        maxMp: 5
      },
      lastTs: Date.now(),
      eventLog: [],
      inventory: new Array(20).fill(null),
      equipment: {}
    };
  });

  await page.goto('/');
  await page.waitForFunction(() => (window as any).__E2E_READY__ === true);

  const canvas = page.locator('canvas');
  await canvas.click();

  const clickCount = await page.evaluate(() => (window as any).__E2E_FIRST_CLICK__ ?? 0);
  expect(clickCount).toBe(1);
});
