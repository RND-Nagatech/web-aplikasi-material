/**
 * MSW mock layer toggle.
 * Disabled by default.
 * Set VITE_ENABLE_MOCKS="true" to enable mock handlers.
 */
export async function startMocks() {
  const flag = import.meta.env.VITE_ENABLE_MOCKS as string | undefined;
  const enabled = flag === "true";
  if (!enabled) return;

  const { worker } = await import("./browser");
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
  // eslint-disable-next-line no-console
  console.info("[mocks] MSW enabled — requests to /api/v1 are mocked.");
}
