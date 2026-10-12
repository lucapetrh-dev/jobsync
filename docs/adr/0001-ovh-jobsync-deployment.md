# ADR 0001: Independent JobSync deployment on OVH

Date: 2026-10-12

Status: Accepted

Owner: Luca Petracca

## Decision

Run JobSync alongside Wallet on the existing OVH server as an independent Docker
Compose project. Use SQLite and the existing file storage layout. Publish
`jobs.lucapetracca.com` through a dedicated Cloudflare Tunnel, with email-based
browser access and separate machine authentication for `/api/mcp`.

Build container images in GitHub Actions, validate every release, and promote
the current `main` commit's immutable image to `production`. The server polls
that tag and deploys only after a consistent encrypted off-server backup.

## Reason

This preserves the application's existing database and filesystem contracts,
avoids adding public server ports, and limits the operational impact on Wallet.
Building outside OVH reduces memory pressure on the shared server. Separate
Access policies allow unattended MCP writes without granting browser access.

## Consequences

The OVH installation becomes the primary source of application data. The local
installation is retained as a stopped fallback, with no continuous database
synchronization. Scheduled Gmail imports remain on the desktop machine and
write through hosted MCP. Releases and consistent snapshots introduce brief
maintenance periods. Migration failures require explicit recovery of matching
data and image rather than an automatic image-only downgrade.

Operational ownership includes credential rotation, failed-service review,
off-server backup verification, and periodic restore tests. The implementation
and recovery procedure are documented in `docs/deployment/jobsync-ovh.md`.
