import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { handleRequest } from "../../deploy/landing/worker.mjs";

const page = {
  html: "<!doctype html><title>Jobs</title><h1>Jobs is a private workspace.</h1>",
  contentSecurityPolicy: "default-src 'none'; style-src 'sha256-test'; img-src data:",
};

afterEach(() => mock.restoreAll());

test("builds a self-contained page with a matching stylesheet security hash", async () => {
  execFileSync(process.execPath, ["build.mjs"], {
    cwd: new URL("../../deploy/landing/", import.meta.url),
  });
  const rendered = await import("../../deploy/landing/.build/page.mjs");
  assert.match(rendered.html, /Jobs is a private workspace\./);
  assert.match(rendered.html, /It isn’t available to the public\./);
  assert.doesNotMatch(rendered.html, /<script\b|<form\b|<a\b|https?:\/\//i);
  const css = rendered.html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const hash = createHash("sha256").update(css).digest("base64");
  assert.ok(rendered.contentSecurityPolicy.includes(`style-src 'sha256-${hash}'`));
  assert.ok(rendered.contentSecurityPolicy.includes("script-src 'none'"));
  assert.match(rendered.html, /data:image\/png;base64,iVBOR/);
  assert.match(rendered.html, /data:font\/woff2;base64,/);
  assert.doesNotMatch(rendered.html, /__[A-Z_]+__/);
});

for (const path of ["/", "/?next=/dashboard", "/?message=%3Cscript%3Ealert(1)%3C/script%3E"]) {
  test(`serves only the static homepage for ${path}`, async () => {
    const origin = mock.method(globalThis, "fetch", () => {
      throw new Error("The public homepage must not contact the origin");
    });
    const response = await handleRequest(new Request(`https://jobs.lucapetracca.com${path}`), page);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), page.html);
    assert.equal(origin.mock.callCount(), 0);
    assert.equal(response.headers.get("Set-Cookie"), null);
    assert.equal(response.headers.get("Location"), null);
    assert.equal(response.headers.get("Content-Security-Policy"), page.contentSecurityPolicy);
    assert.equal(response.headers.get("X-Frame-Options"), "DENY");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
    assert.match(response.headers.get("Content-Type"), /text\/html; charset=utf-8/);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  });
}

test("HEAD returns the homepage headers without a response body", async () => {
  const response = await handleRequest(new Request("https://jobs.lucapetracca.com/", { method: "HEAD" }), page);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("Content-Security-Policy"), page.contentSecurityPolicy);
});

for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
  test(`rejects ${method} on the homepage without forwarding it`, async () => {
    const origin = mock.method(globalThis, "fetch", () => {
      throw new Error("Rejected homepage methods must not contact the origin");
    });
    const response = await handleRequest(new Request("https://jobs.lucapetracca.com/?next=/api/mcp", { method }), page);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), "GET, HEAD");
    assert.equal(origin.mock.callCount(), 0);
  });
}

for (const path of ["/dashboard", "/signin", "/signup", "/api/auth/session", "/api/mcp", "/unknown", "/%2Fdashboard", "//dashboard"]) {
  test(`preserves the protected origin response for ${path}`, async () => {
    const request = new Request(`https://jobs.lucapetracca.com${path}`, {
      method: "POST",
      headers: {
        Authorization: "Bearer test-only",
        Cookie: "session=test-only",
        "Cf-Access-Jwt-Assertion": "test-only",
        "Content-Type": "application/json",
      },
      body: '{"message":"unchanged"}',
    });
    const originResponse = new Response("protected response", {
      status: 401,
      headers: { "Cache-Control": "no-store", "Set-Cookie": "session=test-only; HttpOnly" },
    });
    mock.method(globalThis, "fetch", async (forwarded) => {
      assert.equal(forwarded, request);
      assert.equal(await forwarded.text(), '{"message":"unchanged"}');
      return originResponse;
    });
    const response = await handleRequest(request, page);
    assert.equal(response, originResponse);
  });
}

test("streams protected downloads without buffering their body", async () => {
  let pulled = false;
  const originResponse = new Response(new ReadableStream({
    pull(controller) {
      pulled = true;
      controller.enqueue(new TextEncoder().encode("download"));
      controller.close();
    },
  }, { highWaterMark: 0 }));
  mock.method(globalThis, "fetch", async () => originResponse);
  const response = await handleRequest(new Request("https://jobs.lucapetracca.com/api/files/resume"), page);
  assert.equal(pulled, false);
  assert.equal(response, originResponse);
  assert.equal(await response.text(), "download");
});
