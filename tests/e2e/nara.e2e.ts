// e2e — NARA guide: the thinking indicator and the answer reveal.
//
// Deterministic first: the locator + assertion steps call no model, so the same
// commit always produces the same result. The single `agent.act` at the end is
// the one step that needs judgement, and it is where the run's token numbers
// come from.
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const launcher = (screen: any) => screen.getByTestId('nara-launcher');
const dialog = (screen: any) => screen.getByRole('dialog', { name: /NARA/ });

/** The portfolio plays a full-screen intro on load; NARA only mounts after it
 *  finishes. Skipping it is what a returning visitor sees, and it makes the
 *  suite measure the guide instead of the intro. */
async function openWithNara(browser: any, app: any) {
  await browser.addInitScript(() => {
    sessionStorage.setItem('qr-intro-played', '1');
  });
  await app.open('/');
}

/**
 * The greeting bubble offers a ready-made question; tapping it opens the chat
 * and sends that question automatically. It lives in the bubble (a live
 * region), not inside the chat dialog.
 */
async function askSuggestedQuestion(screen: any) {
  await screen.getByRole('button', { name: /strongest projects/i }).tap();
}

describe('nara', () => {
  test('the guide opens from the floating launcher', async ({ app, browser, screen }) => {
    await openWithNara(browser, app);
    await launcher(screen).waitFor();

    await launcher(screen).tap();

    await expect(dialog(screen)).toBeVisible();
    await expect(dialog(screen).getByPlaceholder(/Ask about skills/)).toBeVisible();
  });

  test('thinking shows a shimmering label with a live second counter', async ({ app, browser, screen }) => {
    await openWithNara(browser, app);
    await launcher(screen).waitFor();

    await askSuggestedQuestion(screen);

    // Thinking is transient — it vanishes the moment the answer lands — so the
    // whole check is a single assertion over the live region.
    //
    // DOM order matters here: the label, then the seconds, then the stage line.
    // The odometer contributes its digit stack to textContent (it is
    // aria-hidden, so assistive tech hears only "Ns"), hence the loose \d+.
    const status = screen.getByRole('status');
    await expect(status).toContainText(/Thinking[\s\S]*\d+[\s\S]*Reading your question/, {
      timeout: 20_000,
    });
  });

  test('the answer types in and settles on portfolio facts', async ({ app, browser, screen }) => {
    await openWithNara(browser, app);
    await launcher(screen).waitFor();

    await askSuggestedQuestion(screen);

    // Post-thinking line reports the measured duration.
    await expect(screen.getByText(/Thought for \d+s/)).toBeVisible({ timeout: 60_000 });

    // The answer must be grounded in this portfolio, not a generic reply.
    await expect(dialog(screen)).toContainText(/SuperFood|Explore Bali|Laravel|PHP|Python/i, {
      timeout: 60_000,
    });
  });

  test('the agent can open the guide and ask about skills', async ({ app, agent, browser, screen }) => {
    await openWithNara(browser, app);

    await agent.act('tap the floating NARA launcher at the bottom right of the page');

    await expect(dialog(screen)).toBeVisible({ timeout: 25_000 });
  });
});
