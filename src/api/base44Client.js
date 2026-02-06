import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// In development, the serverUrl should be a relative path to the proxy.
// In production, it should be the absolute URL from the environment variables.
const serverUrl = import.meta.env.DEV ? '/api' : appBaseUrl;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl
});
