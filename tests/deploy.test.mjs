import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

// Create mock functions for blocklet module only
const mockGetComponentInfoWithMountPoint = mock();
const mockGetComponentInfo = mock();

// Mock only the blocklet module globally (it's safe as it's specific to this functionality)
mock.module("../utils/blocklet.mjs", () => ({
  getComponentInfoWithMountPoint: mockGetComponentInfoWithMountPoint,
  getComponentInfo: mockGetComponentInfo,
}));

// Import the real utils module and deploy function
import { deploy } from "../utils/deploy.mjs";
import * as utils from "../utils/utils.mjs";

describe("deploy function", () => {
  let originalFetch;
  let originalConsole;
  let consoleOutput;
  let saveValueToConfigSpy;
  let mockOpen;

  beforeEach(async () => {
    // Reset environment
    process.env.DOC_SMITH_BASE_URL = "https://test.example.com";

    // Mock console to capture output
    consoleOutput = [];
    originalConsole = {
      log: console.log,
      error: console.error,
    };
    console.log = (...args) => consoleOutput.push({ type: "log", args });
    console.error = (...args) => consoleOutput.push({ type: "error", args });

    // Mock fetch
    originalFetch = global.fetch;

    // Use spyOn to mock saveValueToConfig without affecting other tests
    saveValueToConfigSpy = spyOn(utils, "saveValueToConfig").mockResolvedValue();

    // Create mock for open module
    mockOpen = mock(() => Promise.resolve());

    // Mock the dynamic import of 'open' module by intercepting global import
    const originalImport =
      global.import || (await import("node:module")).createRequire(import.meta.url);
    global.import = async (module) => {
      if (module === "open") {
        return { default: mockOpen };
      }
      // For other modules, use original import
      if (typeof originalImport === "function") {
        return originalImport(module);
      }
      // Fallback to dynamic import
      return import(module);
    };

    // Reset blocklet mocks
    mockGetComponentInfoWithMountPoint.mockReset();
    mockGetComponentInfo.mockReset();

    // Set default mock implementations
    mockGetComponentInfoWithMountPoint.mockResolvedValue({
      mountPoint: "/payment",
      PAYMENT_LINK_ID: "test-payment-id",
    });

    mockGetComponentInfo.mockResolvedValue({
      status: "running",
    });
  });

  afterEach(() => {
    // Restore originals
    global.fetch = originalFetch;
    console.log = originalConsole.log;
    console.error = originalConsole.error;

    // Restore spies
    if (saveValueToConfigSpy) {
      saveValueToConfigSpy.mockRestore();
    }

    // Reset mocks
    if (mockOpen) {
      mockOpen.mockReset();
    }
  });

  test("successful deployment flow", async () => {
    // Mock API responses for the complete flow
    let callCount = 0;
    global.fetch = mock(async (url) => {
      callCount++;

      // Step 1: Create payment session
      if (url.includes("/api/checkout-sessions/start")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            checkoutSession: { id: "checkout-123" },
            paymentUrl: "https://payment.test/checkout-123",
          }),
        };
      }

      // Step 2-4: Poll payment/installation/service status
      if (url.includes("/api/vendors/order/checkout-123/status")) {
        if (callCount <= 2) {
          // First call: payment completed, installation in progress
          return {
            ok: true,
            status: 200,
            json: async () => ({
              payment_status: "paid",
              vendors: [{ id: "vendor-1", progress: 50, appUrl: null }],
            }),
          };
        } else {
          // Subsequent calls: installation complete
          return {
            ok: true,
            status: 200,
            json: async () => ({
              payment_status: "paid",
              vendors: [{ id: "vendor-1", progress: 100, appUrl: "https://app.test" }],
            }),
          };
        }
      }

      // Step 5: Get order details
      if (url.includes("/api/vendors/order/checkout-123/detail")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vendors: [
              {
                appUrl: "https://app.test",
                dashboardUrl: "https://dashboard.test",
                homeUrl: "https://home.test",
                token: "auth-token-123",
              },
            ],
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await deploy();

    // Verify result
    expect(result).toEqual({
      appUrl: "https://app.test",
      homeUrl: "https://home.test",
      token: "auth-token-123",
    });

    // Verify saveValueToConfig was called
    expect(saveValueToConfigSpy).toHaveBeenCalledWith(
      "checkoutId",
      "checkout-123",
      "Checkout ID for document deployment service",
    );
    expect(saveValueToConfigSpy).toHaveBeenCalledWith(
      "paymentUrl",
      expect.stringContaining("payment"),
      "Payment URL for document deployment service",
    );

    // Verify console output shows progress
    const logs = consoleOutput.filter((o) => o.type === "log").map((o) => o.args.join(" "));
    expect(logs.some((log) => log.includes("Step 1/4: Waiting for payment"))).toBe(true);
    expect(logs.some((log) => log.includes("Step 2/4: Installing service"))).toBe(true);
    expect(logs.some((log) => log.includes("Step 3/4: Starting service"))).toBe(true);
    expect(logs.some((log) => log.includes("Step 4/4: Getting service URL"))).toBe(true);
    expect(logs.some((log) => log.includes("Your website is available at"))).toBe(true);
  });

  test("handles missing payment link ID", async () => {
    mockGetComponentInfoWithMountPoint.mockResolvedValue({
      mountPoint: "/payment",
      PAYMENT_LINK_ID: null,
    });

    await expect(deploy()).rejects.toThrow("Payment link ID not found");
  });

  test("handles payment session creation failure", async () => {
    global.fetch = mock(async (url) => {
      if (url.includes("/api/checkout-sessions/start")) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: "Payment creation failed" }),
        };
      }
    });

    await expect(deploy()).rejects.toThrow("Failed to create payment session");

    const errors = consoleOutput.filter((o) => o.type === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  test("handles network errors gracefully", async () => {
    global.fetch = mock(async () => {
      throw new Error("Network connection failed");
    });

    await expect(deploy()).rejects.toThrow("Failed to create payment session");
  });

  test("handles browser opening failure gracefully", async () => {
    // Mock successful API flow
    global.fetch = mock(async (url) => {
      if (url.includes("/api/checkout-sessions/start")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            checkoutSession: { id: "checkout-123" },
            paymentUrl: "https://payment.test/checkout-123",
          }),
        };
      }

      if (url.includes("/status")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            payment_status: "paid",
            vendors: [{ id: "vendor-1", progress: 100, appUrl: "https://app.test" }],
          }),
        };
      }

      if (url.includes("/detail")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vendors: [
              {
                appUrl: "https://app.test",
                homeUrl: "https://home.test",
                token: "auth-token-123",
              },
            ],
          }),
        };
      }
    });

    // Mock open to fail
    mockOpen.mockRejectedValue(new Error("Cannot open browser"));

    // Call deploy without cached parameters - should still succeed
    const result = await deploy();

    // Should still complete successfully despite browser opening failure
    expect(result.appUrl).toBe("https://app.test");
    expect(result.homeUrl).toBe("https://home.test");
    expect(result.token).toBe("auth-token-123");
  });

  test("handles cached checkout ID", async () => {
    // Mock successful status check for cached ID
    global.fetch = mock(async (url) => {
      if (url.includes("/status")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            payment_status: "paid",
            vendors: [{ id: "vendor-1", progress: 100, appUrl: "https://app.test" }],
          }),
        };
      }

      if (url.includes("/detail")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vendors: [
              {
                appUrl: "https://app.test",
                homeUrl: "https://home.test",
                token: "auth-token-123",
              },
            ],
          }),
        };
      }
    });

    const result = await deploy("existing-checkout-id", "https://cached-payment.url");

    expect(result.appUrl).toBe("https://app.test");

    // Should not call open since using cached checkout
    expect(mockOpen).not.toHaveBeenCalled();
  });
});
