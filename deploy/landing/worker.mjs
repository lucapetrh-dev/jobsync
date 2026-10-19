/**
 * Serve the exact homepage locally. Cloudflare Access and the tunnel retain
 * responsibility for authenticating every request forwarded to the origin.
 * @param {Request} request
 * @param {{ html: string, contentSecurityPolicy: string }} page
 * @returns {Promise<Response>}
 */
export async function handleRequest(request, page) {
  if (new URL(request.url).pathname !== "/") {
    return fetch(request);
  }

  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": page.contentSecurityPolicy,
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { ...headers, Allow: "GET, HEAD" },
    });
  }

  return new Response(request.method === "HEAD" ? null : page.html, { headers });
}
