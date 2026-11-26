// @ts-check
// e2e config — scoped to the two areas under audit: the NARA guide and the
// navbar/header. Everything else in the portfolio is out of scope on purpose,
// so a run stays short and its numbers stay comparable between runs.
//
// The app under test is the local harness on :5640, which serves the real
// production build from dist/ and runs the real answer pipeline. Point APP_URL
// at a preview deployment to test that instead.
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// The provider NARA itself talks to. No new paid gateway.
const provider = createOpenAICompatible({
  name: 'nara-provider',
  baseURL: process.env.NARA_DEPLOY_BASE_URL
    ? `${process.env.NARA_DEPLOY_BASE_URL}/api/v1`
    : 'https://api-cdn.deploy.com/api/v1',
  apiKey: process.env.DEPLOY_API_KEY ?? '',
});

export default {
  // Only these two files. The glob is the scope statement.
  tests: ['tests/e2e/nara.e2e.ts', 'tests/e2e/navbar.e2e.ts'],

  // Keep run artifacts apart from the hand-rolled audit scripts.
  output: '.e2e',

  // Video for every attempt: the recording is the deliverable, not just a
  // failure aid.
  video: 'on',
  trace: 'retain-on-failure',

  targets: [
    {
      name: 'web',
      engine: web(),
      app: { url: process.env.APP_URL ?? 'http://127.0.0.1:5640' },
    },
  ],

  // Total model-call ceiling across the run. With deterministic locators doing
  // the work, the agent budget stays small on purpose.
  agents: {
    default: {
      model: provider('zai-org/glm-5.3-flash'),
      system:
        'You are a meticulous QA agent for a dark-themed developer portfolio. ' +
        'Interact only with what is visible. Prefer clicking buttons by their text. ' +
        'Never invent elements that are not on screen.',
      maxModelCalls: 6,
    },
  },
} satisfies E2EConfig;
