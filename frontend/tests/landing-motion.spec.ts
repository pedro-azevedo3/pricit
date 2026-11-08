import { test, expect } from '@playwright/test';

test('animações acompanham ida e volta da rolagem e respeitam movimento reduzido', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  const target = page.locator('#simulador [data-reveal="left"]');
  await expect.poll(() => target.evaluate(el => el.getAnimations().length)).toBe(1);
  const progress = () => target.evaluate(el => Number(el.getAnimations()[0]?.currentTime ?? -1));
  await expect.poll(progress).toBe(0);
  const show = () => target.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 110));
  await show();
  await expect.poll(progress).toBe(1000);
  await target.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY + 80));
  await expect.poll(progress).toBe(0);
  await show();
  await expect.poll(progress).toBe(1000);
  const variants = await page.locator('[data-reveal]').evaluateAll(els => [...new Set(els.map(el=>el.getAttribute('data-reveal')))]);
  expect(variants.length).toBeGreaterThanOrEqual(5);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(() => target.evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(target).toHaveCSS('opacity','1');
  await expect.poll(() => page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
});
