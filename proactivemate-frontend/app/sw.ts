import { registerRoute } from "@serwist/routing";
import { NetworkFirst } from "@serwist/strategies";
import { ExpirationPlugin } from "@serwist/expiration";
import { precacheAndRoute } from "@serwist/precaching";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | PrecacheEntry)[];
};

type PrecacheEntry = string | { url: string; revision?: string };

// Precache all static pages from the build
precacheAndRoute(self.__SW_MANIFEST);

// Custom: cache /api/ calls with network-first
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
    ],
  })
);
