// e2e — navbar / header: the segmented control and its glide.
//
// The indicator is one continuous value driven by the reference spring, so
// these tests pin the observable consequences: every item renders, the clicked
// item becomes current, and the indicator actually travels rather than jumps.
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

/** Desktop nav item by its exact visible label. */
const nav = (screen: any, label: string) =>
  screen.getByRole('button', { name: label, exact: true });

/** Skip the load intro the same way a returning visitor does. */
async function openApp(browser: any, app: any) {
  await browser.addInitScript(() => {
    sessionStorage.setItem('qr-intro-played', '1');
  });
  await app.open('/');
}

describe('navbar', () => {
  test('every nav item renders and Home is current on load', async ({ app, browser, screen }) => {
    await openApp(browser, app);

    // Read the labels one at a time: a loop over a captured array would keep
    // the assertion inside the `expect`, which is what this pins.
    for (const label of ['Home', 'About', 'Journey', 'Projects', 'Skills', 'Contact']) {
      await expect(nav(screen, label)).toBeVisible();
    }
    await expect(nav(screen, 'Home')).toHaveAttribute('aria-current', 'page');
  });

  test('tapping Projects marks it current', async ({ app, browser, screen }) => {
    await openApp(browser, app);

    await nav(screen, 'Projects').tap();

    await expect(nav(screen, 'Projects')).toHaveAttribute('aria-current', 'page', {
      timeout: 20_000,
    });
  });

  test('the indicator glides instead of jumping', async ({ app, browser }) => {
    await openApp(browser, app);

    // Everything the evaluate body needs lives inside it: e2e serialises the
    // function source, so a closure over test variables would be dropped.
    const result = await browser.evaluate(async () => {
      const read = () => {
        const el = document.querySelector('[data-nara-indicator]');
        return el ? Math.round(el.getBoundingClientRect().left) : null;
      };
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      const target = [...document.querySelectorAll('button')].find(
        (b) => (b.textContent || '').trim() === 'Contact',
      ) as HTMLButtonElement | undefined;
      if (!target) return { error: 'no Contact button', before: null, after: null, distinct: 0 };

      const before = read();
      target.click();

      const seen: number[] = [];
      for (let i = 0; i < 18; i++) {
        await wait(40);
        const v = read();
        if (v !== null && v !== seen[seen.length - 1]) seen.push(v);
      }
      await wait(600);
      const after = read();

      return { error: null, before, after, distinct: seen.length };
    });

    expect(result.error).toBeNull();
    expect(result.before).not.toBeNull();
    expect(result.after).not.toBeNull();
    // A snap yields one or two distinct offsets; the ported spring yields many.
    expect(result.distinct).toBeGreaterThan(2);
    expect(Math.abs((result.after ?? 0) - (result.before ?? 0))).toBeGreaterThan(20);
  });
});
