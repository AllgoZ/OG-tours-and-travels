import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Config is read from the environment at import time, so each case re-imports the modules.
async function gtmId(env: { gtm?: string; site?: string; node?: string }): Promise<string | null> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GTM_ID", env.gtm ?? "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", env.site ?? "");
  vi.stubEnv("NODE_ENV", env.node ?? "production");
  const { getGtmId } = await import("@/lib/gtm");
  return getGtmId();
}

describe("getGtmId", () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  it("loads the default container in production once a domain is set", async () => {
    expect(await gtmId({ site: "https://example.com" })).toBe("GTM-K42Z4THV");
  });

  it("stays off without a production domain (staging / preview)", async () => {
    expect(await gtmId({ site: "" })).toBeNull();
  });

  it("stays off outside production builds", async () => {
    expect(await gtmId({ site: "https://example.com", node: "development" })).toBeNull();
    expect(await gtmId({ site: "https://example.com", node: "test" })).toBeNull();
  });

  it("can be overridden or disabled with NEXT_PUBLIC_GTM_ID", async () => {
    expect(await gtmId({ site: "https://example.com", gtm: "GTM-ABCD123" })).toBe("GTM-ABCD123");
    expect(await gtmId({ site: "https://example.com", gtm: "off" })).toBeNull();
    expect(await gtmId({ site: "https://example.com", gtm: "OFF" })).toBeNull();
  });

  it("rejects malformed IDs so nothing unexpected reaches the inline script", async () => {
    for (const bad of ["K42Z4THV", "GTM-", "gtm-abcd123", `GTM-AB');alert(1);//`, "GTM-AB CD", "G-12345"]) {
      expect(await gtmId({ site: "https://example.com", gtm: bad })).toBeNull();
    }
  });
});
