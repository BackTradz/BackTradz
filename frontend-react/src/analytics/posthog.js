import posthog from 'posthog-js';

const KEY  = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST; // https://eu.posthog.com

if (!KEY || !HOST) {
  console.warn('[PostHog] missing envs', { KEY: !!KEY, HOST });
} else {
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true, // 1er pageview auto
  });
  // expose pour test console
  // eslint-disable-next-line no-undef
  window.posthog = posthog;
  console.log('[PostHog] initialized');
}

export default posthog;
