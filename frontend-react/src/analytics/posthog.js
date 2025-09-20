import posthog from 'posthog-js';

const KEY  = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST; // https://eu.posthog.com

if (KEY && HOST) {
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true, // 1er pageview auto
  });
}

export default posthog;
