# ADR 0002: Public Jobs landing page at the edge

Date: 2026-10-19

Status: Accepted

Owner: Luca Petracca

## Decision

Serve the exact homepage of `jobs.lucapetracca.com` from a separate Cloudflare
Worker. Bundle the existing Jobs logos, Geist font, favicon, and stylesheet in
the static response. The public page has no scripts, forms, application calls,
or external resources. It does not vary with cookies or query parameters.

Keep the hostname-wide browser Access application and add one destination
override: `{ "path_pattern": "/", "behavior": "public" }`. Unlike an Access
application's path, this override matches only the exact homepage. Preserve
the existing owner policy, browser session duration, and tunnel JWT validation.
If exact overrides are unavailable, retain the protected homepage; never replace
the override with a hostname-wide Bypass policy.

The Worker forwards non-homepage requests unchanged and streams responses.
A more specific no-script route for `jobs.lucapetracca.com/api/mcp*` keeps MCP
outside Worker execution. Its existing Service Auth and application bearer
authentication remain independent from browser access.

## Reason

Visitors should see Jobs branding and a clear private-workspace message without
reaching the application or seeing a login prompt at the homepage. Serving the
page at the edge separates public presentation from the private application,
database, credentials, and deployment lifecycle.

## Consequences

The homepage always shows the landing page, including for signed-in users.
The owner opens `/dashboard` directly. Other paths retain their Access challenge;
omitting a login link is a presentation choice, not an authorization control.

The Worker has no data bindings or stored credentials. Its deployment and the
Access override are separate operations. Rollback removes the public override
before disabling the Worker. The existing tunnel JWT check remains enabled, so
a Worker outage cannot turn the public homepage into anonymous origin access.

Worker source and tests are versioned in this repository. The deployment owner
publishes the Worker separately from the application image, checks both route
entries and the exact override after deployment, and verifies public, owner,
and machine access. The deployment guide contains the rollout and rollback
procedure.

## References

- [Access destination overrides](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/update/)
- [Worker route matching and no-script exclusions](https://developers.cloudflare.com/workers/configuration/routing/routes/)
