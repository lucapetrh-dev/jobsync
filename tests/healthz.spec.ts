// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ default: { $queryRaw: vi.fn() } }));

import prisma from "@/lib/db";

describe("GET /healthz", () => {
  it("returns uncached readiness when SQLite is available", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ready: 1 }]);
    const { GET } = await import("@/app/healthz/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 503 without exposing database errors", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("private database path"));
    const { GET } = await import("@/app/healthz/route");
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
