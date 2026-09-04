import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";
import { resilientRouteComponent, defineResilientAsyncComponent } from "../../../src/logic/utils/resilientComponent.ts";

describe("Resilient Component & Dynamic Route Loader", () => {
  it("successfully loads module on first attempt", async () => {
    const mockModule = { default: { name: "TestComponent" } };
    const loader = vi.fn().mockResolvedValue(mockModule);

    const resilient = resilientRouteComponent(loader);
    const result = await resilient();

    assert.deepStrictEqual(result, mockModule);
    assert.strictEqual(loader.mock.calls.length, 1);
  });

  it("retries and recovers when initial attempts throw Failed to fetch", async () => {
    const mockModule = { default: { name: "RecoveredComponent" } };
    let calls = 0;
    const loader = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) {
        throw new TypeError("Failed to fetch dynamically imported module: /test.vue");
      }
      return mockModule;
    });

    const resilient = resilientRouteComponent(loader, 3);
    const result = await resilient();

    assert.deepStrictEqual(result, mockModule);
    assert.strictEqual(calls, 3);
  });

  it("fails when retries are exhausted", async () => {
    const loader = vi.fn().mockRejectedValue(new TypeError("Persistent network failure"));

    const resilient = resilientRouteComponent(loader, 2);
    await assert.rejects(async () => {
      await resilient();
    }, /Persistent network failure/);
  });

  it("defineResilientAsyncComponent returns a valid async component definition", () => {
    const loader = vi.fn().mockResolvedValue({ default: {} });
    const asyncComp = defineResilientAsyncComponent(loader);
    assert.ok(asyncComp);
  });
});
