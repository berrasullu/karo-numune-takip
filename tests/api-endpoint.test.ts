import { describe, it, expect } from "vitest";

describe("API Endpoint Configuration", () => {
  it("should have EXPO_PUBLIC_API_BASE_URL set", () => {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(apiBaseUrl).toBeDefined();
    expect(apiBaseUrl).toBeTruthy();
    expect(apiBaseUrl).toMatch(/^https?:\/\//);
  });

  it("should have valid API base URL format", () => {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(apiBaseUrl).toBe("https://karotakip-iqibkabs.manus.space");
  });

  it("should construct valid tRPC endpoint URL", () => {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    const trpcUrl = `${apiBaseUrl}/api/trpc`;
    expect(trpcUrl).toBe("https://karotakip-iqibkabs.manus.space/api/trpc");
  });
});
