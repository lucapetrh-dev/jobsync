# Jobs on OVH

The private workspace is `https://jobs.lucapetracca.com/dashboard`. Its SQLite database,
uploaded files, and saved settings live on OVH. The desktop MCP client writes
directly to this installation; changing application data does not deploy code.

## Runtime and access

The independent Compose project is `/opt/jobsync/compose.yml`, installed from
`deploy/compose.production.yml`. Its application mounts `/opt/jobsync/data` at
`/data`. The tunnel is pinned separately from the application image. Neither
container publishes a host port. Application and tunnel memory limits are 1 GiB
and 128 MiB respectively. Wallet uses its own project and services.

`/opt/jobsync/.env` contains persistent application secrets and provider settings.
`/opt/jobsync/release.env` contains only `JOBSYNC_IMAGE`, pinned by SHA-256 digest.
`/opt/jobsync/secrets/tunnel-token` contains the dedicated tunnel credential.
Protect secret files with mode `0600`, parent secret directories with `0700`, and
never place them in source control or container build contexts.

The exact homepage is a static public landing page served by a separate Worker.
Cloudflare Access allows only `admin@lucapetracca.com` to the browser application,
using an email code and then Jobs's normal sign-in. The exact `/api/mcp` path
has a separate Service Auth application. Machine requests require both
`CF-Access-Client-Id` / `CF-Access-Client-Secret` and the existing Jobs
`Authorization: Bearer …` header. The machine credential has no browser access.
The hostname bypasses caching; `/healthz` additionally sends `Cache-Control: no-store`.

The root-owned desktop credential file is not needed on the server. Store desktop
MCP credentials in protected local storage and configure the MCP client to load
headers from there. Rotate the Cloudflare service token before its one-year
expiry and verify the replacement before revoking the old credential. Rotate
the Jobs bearer token through application settings. Authentication-secret
rotation signs out browser sessions; encryption-key rotation requires
re-encrypting saved provider keys before switching the key.

## Public landing page

The Worker in `deploy/landing` serves only `/` for `GET` and `HEAD`. Other methods
receive `405`. The page is identical for signed-in and anonymous visitors and
ignores query parameters. All logos, fonts, styling, and favicon are embedded;
it never fetches the application. Bookmark `/dashboard` for private access.

The browser Access application's destination retains
`uri: jobs.lucapetracca.com` with exactly this public override:

```json
[{ "path_pattern": "/", "behavior": "public" }]
```

This is a destination override, not an application with a root-path Bypass
policy. Overrides do not implicitly match subpaths. Never use `/*` or remove
the hostname-wide owner policy. Preserve the browser application's reusable
policy attachment, `720h` session, identity provider, cookie settings, and all
other existing settings. Do not change the MCP Access application or tunnel's
required JWT validation.

Use Node.js 22 or later for the separate Worker toolchain:

```sh
npm ci
npm ci --prefix deploy/landing
npm --prefix deploy/landing test
npm --prefix deploy/landing run check
npx playwright install chromium
npm --prefix deploy/landing run test:browser
```

The production workflow runs these checks before image promotion. Worker
publication is a separate operator deployment; application image updates do
not publish it. `npm --prefix deploy/landing run deploy` publishes through
Wrangler with the operator's Cloudflare credentials. A connected Cloudflare
operator tool can alternatively upload the dry-run's compiled `entry.js` as
an ES module, using `main_module: entry.js`, the configured compatibility date,
no bindings, and the same observability settings. Disable both `workers.dev`
and preview URLs before attaching a production route.

For the initial rollout:

1. Save protected snapshots of the browser and MCP Access applications, Worker
   routes, and tunnel configuration. Record the current Worker version, if any.
2. Deploy the tested Worker while the hostname-wide Access protection remains
   unchanged. Set its production routes as follows, preserving unrelated routes:

   | Pattern | Script |
   | --- | --- |
   | `jobs.lucapetracca.com/*` | `jobs-private-landing` |
   | `jobs.lucapetracca.com/api/mcp*` | None |

   Create the no-script exclusion through the zone Worker Routes API with
   `{ "pattern": "jobs.lucapetracca.com/api/mcp*" }` (omit `script`). It is
   maintained separately from Wrangler's routes. Recheck it after every deploy.
3. Confirm anonymous homepage/dashboard requests are still challenged and
   anonymous MCP remains denied. Confirm authenticated MCP initialization and
   tool discovery before and after routing changes.
4. Read-modify-write the browser application's `destinations` with the one
   exact homepage override. Attach existing reusable policies by ID rather
   than copying inline policy definitions. Read back the whole application
   and verify all unrelated fields and the MCP/tunnel configuration are unchanged.
5. Verify `/` and query-string variants return the branded page without cookies,
   redirects, or external requests. Check light/dark, desktop/mobile, and 200%
   text size. Verify `HEAD` and rejected write methods. Check protected paths,
   unknown/encoded paths, forged identity headers, existing owner access,
   sign-in, and authenticated/anonymous MCP behavior.

Stop if exact overrides are rejected or not retained; do not substitute a broad
bypass. Roll back immediately if a private path becomes public or owner/MCP
access regresses. Restore the original browser destination first, verify the
homepage is protected again, and then remove the new Worker routes or restore
the previous Worker version. Keep snapshots and the published Worker version
with the deployment verification record. This change requires no database
migration or change to the OVH containers.

## Installation

Install Python 3, Docker Compose, and Restic. Install `jobsync-operations.py` as
`/usr/local/lib/jobsync/jobsync-operations.py` with root ownership and mode `0750`.
Install the four `deploy/jobsync-*.service` / `.timer` units in
`/etc/systemd/system`. Create `/var/lib/jobsync` with root ownership and mode
`0700`. Set `/etc/jobsync-backup.env` to the exported values of the existing
encrypted backup storage configuration, using mode `0600`. Resolve shell
escapes or substitutions before writing this systemd EnvironmentFile; copying
a shell configuration verbatim can change credential values. Restic credentials must work under systemd's
`ProtectHome=true`; the password file must be outside home directories.

Create the Access policies before publishing DNS. A dedicated, remotely managed
`jobsync-ovh` tunnel routes this hostname to `http://app:3737`, with an unmatched
route returning 404. Preserve the public hostname in the origin Host header.

Pause scheduled imports and stop the local application before making the final
copy of the entire data directory. Preserve record IDs, uploaded files, and
encrypted settings. Validate SQLite integrity, table counts, file checksums, and
settings decryption before enabling writes on the server. Initially pin the
validated bootstrap image. Keep the stopped local installation as a fallback;
after hosted writes begin, copy current hosted data back before returning to it.

Validate systemd units and start the independent project:

```sh
sudo systemd-analyze verify /etc/systemd/system/jobsync-*.service /etc/systemd/system/jobsync-*.timer
sudo systemctl daemon-reload
sudo docker compose --project-name jobsync --project-directory /opt/jobsync \
  --env-file /opt/jobsync/release.env -f /opt/jobsync/compose.yml up -d
sudo systemctl start jobsync-backup.service
sudo systemctl enable --now jobsync-backup.timer
```

Enable `jobsync-deploy.timer` after the reviewed production workflow is on `main`
and the initial production tag resolves to the accepted image digest.

## Releases

Every update to this fork's `main` runs the production workflow: type checking,
lint, application tests, deployment tests, and an amd64 Docker build. A validated
image receives a `sha-<commit>` tag. Only a run whose commit is still `main` can
promote `production`; runs share a non-cancelling concurrency group. The upstream
release workflow does not run in the fork.

The five-minute deployment timer resolves `production` to an immutable digest.
An unchanged digest does nothing. A changed digest is pulled before stopping
the application. An exclusive operation lock serializes deployments, backups,
and restores. A complete off-server backup must succeed before switching the
image and running its migrations. Readiness checks require a successful SQLite
query, not merely a reachable login page.

```sh
sudo systemctl status jobsync-deploy.timer jobsync-backup.timer
sudo journalctl -u jobsync-deploy.service -u jobsync-backup.service --since today
sudo cat /var/lib/jobsync/current-ref
sudo cat /var/lib/jobsync/last-backup
```

Health, migration, or image-start failures leave `/var/lib/jobsync/blocked` and
stop subsequent automatic deployments. The journal records the error. A backup
failure before switching restarts the old application and preserves its image.
The timer itself may be active even when the last service run failed; inspect
the service result and journal when checking deployment health.

## Backups and recovery

Daily backups run at 00:30 Europe/Berlin. Jobs briefly stops while capturing
the full data directory, secret files, Compose configuration, image reference,
and recovery metadata. It restarts before the encrypted off-server upload.
Failed uploads preserve the private local snapshot. Successful backups remove
the staging copy. Retention is scoped to host `jobsync-ovh` and tag `jobsync`,
grouped by host and tags: seven daily, four weekly, and six monthly snapshots.
Repository locks are retried for up to ten minutes. Wallet's retention is scoped
to its own tag.

To recover, stop automatic deployment, select the matching pre-release snapshot
from the journal, and restore data and image together:

```sh
sudo systemctl stop jobsync-deploy.timer
sudo systemd-run --wait --pipe --collect \
  --property=EnvironmentFile=/etc/jobsync-backup.env \
  /usr/local/lib/jobsync/jobsync-operations.py restore SNAPSHOT_ID
```

Restore verifies the downloaded files and SQLite integrity, pulls the recorded
image, and backs up the current state before replacing data. It clears the
blocked marker only after the restored installation passes readiness. Review
the `production` tag before re-enabling the deployment timer, so it does not
immediately reapply the failed release. Never remove the blocked marker or
downgrade an image without reviewing database migrations.

Recovery also supports a fresh host. For an incomplete installation, surviving
application containers are stopped and remaining files are backed up first.
These partial recovery snapshots have no runnable image reference; retain them
for diagnosis rather than selecting them as a complete restore source.

Verify a restore in an isolated directory and Compose project periodically.
After deployment, test browser sign-in, job updates, CV upload/download, MCP
initialization and writes, container recreation, and Wallet health. A bare GET
to `/api/mcp` returning 405 is expected; readiness testing uses `/healthz`.

## Scheduled email imports

The existing desktop scheduler remains responsible for Gmail imports. It uses
the hosted MCP endpoint and preserves the three-day overlap, duplicate checks,
read-only Gmail access, evidence-based status changes, existing enrichment,
and quiet runs when nothing changes. The migrated desktop schedule preserves
the current task's cadence: Mondays at 02:00 Europe/Berlin. The previous cloud
task remains paused to prevent duplicate writers. Hosting Jobs does not
move the desktop scheduler off the desktop machine.
