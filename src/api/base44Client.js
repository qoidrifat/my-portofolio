import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const hasConfiguredBase44App = Boolean(
  import.meta.env.VITE_BASE44_APP_ID && import.meta.env.VITE_BASE44_APP_BASE_URL
);

// In development, the serverUrl should be a relative path to the proxy.
// In production, it should be the absolute URL from the environment variables.
const serverUrl = import.meta.env.DEV ? '/api' : appBaseUrl;

const noopBase44Client = {
  auth: {
    me: async () => null,
    logout: () => {},
    redirectToLogin: () => {},
  },
  appLogs: {
    logUserInApp: async () => null,
  },
};

//Create a client with authentication required
export const base44 = hasConfiguredBase44App ? createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl
}) : noopBase44Client;
