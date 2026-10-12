# JobSync on OVH

The primary installation is `https://jobs.lucapetracca.com`. Its SQLite database,
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

Cloudflare Access allows only `admin@lucapetracca.com` to the browser application,
using an email code and then JobSync's normal sign-in. The exact `/api/mcp` path
has a separate Service Auth application. Machine requests require both
`CF-Access-Client-Id` / `CF-Access-Client-Secret` and the existing JobSync
`Authorization: Bearer …` header. The machine credential has no browser access.
The hostname bypasses caching; `/healthz` additionally sends `Cache-Control: no-store`.

The root-owned desktop credential file is not needed on the server. Store desktop
MCP credentials in protected local storage and configure the MCP client to load
headers from there. Rotate the Cloudflare service token before its one-year
expiry and verify the replacement before revoking the old credential. Rotate
the JobSync bearer token through application settings. Authentication-secret
rotation signs out browser sessions; encryption-key rotation requires
re-encrypting saved provider keys before switching the key.

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

Daily backups run at 00:30 Europe/Berlin. JobSync briefly stops while capturing
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
and quiet runs when nothing changes. Its recorded schedule is daily at 02:00
Europe/Berlin. Verify its saved schedule when changing the endpoint. Hosting
JobSync does not move this scheduler off the desktop machine.
