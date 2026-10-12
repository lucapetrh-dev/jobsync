#!/usr/bin/env python3
"""Serialize JobSync image deployment, consistent backups, and recovery."""

import argparse
import contextlib
import fcntl
import json
import os
import pathlib
import re
import shutil
import sqlite3
import subprocess
import tempfile
import time

IMAGE = "ghcr.io/lucapetrh-dev/jobsync"
DIGEST = re.compile(re.escape(IMAGE) + r"@sha256:[a-f0-9]{64}$")


class Operations:
    def __init__(self, root=pathlib.Path("/opt/jobsync"), state=pathlib.Path("/var/lib/jobsync")):
        self.root, self.state = pathlib.Path(root), pathlib.Path(state)
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)

    def command(self, args, timeout=900):
        # Command output can contain operational details. Keep it in the journal,
        # but never print command environments or the application configuration.
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        if result.returncode:
            raise RuntimeError(f"{args[0]} failed ({result.returncode}): {result.stderr.strip()}")
        return result.stdout.strip()

    def compose(self, *args):
        return self.command(["docker", "compose", "--project-name", "jobsync",
                             "--project-directory", str(self.root), "--env-file",
                             str(self.root / "release.env"), "-f", str(self.root / "compose.yml"), *args])

    def write(self, path, content):
        temporary = path.with_suffix(".tmp")
        temporary.write_text(content)
        temporary.chmod(0o600)
        temporary.replace(path)

    @contextlib.contextmanager
    def lock(self):
        with (self.state / "operation.lock").open("a") as handle:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise RuntimeError("A JobSync operation is already running") from error
            try:
                yield
            finally:
                fcntl.flock(handle, fcntl.LOCK_UN)

    def image(self):
        lines = (self.root / "release.env").read_text().splitlines()
        image = next((line.split("=", 1)[1] for line in lines if line.startswith("JOBSYNC_IMAGE=")), "")
        if not DIGEST.fullmatch(image):
            raise RuntimeError("release.env must pin the approved registry image by digest")
        return image

    def running(self):
        return "app" in self.compose("ps", "--status", "running", "--services").splitlines()

    def healthy(self):
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            try:
                self.compose("exec", "-T", "app", "wget", "--spider", "-q",
                             "http://127.0.0.1:3737/healthz")
                return True
            except RuntimeError:
                time.sleep(3)
        return False

    def capture(self, complete=True):
        parent = self.state / "snapshots"
        parent.mkdir(mode=0o700, exist_ok=True)
        snapshot = pathlib.Path(tempfile.mkdtemp(prefix="snapshot-", dir=parent))
        for name in ("data", "secrets", ".env", "compose.yml", "release.env"):
            source = self.root / name
            if not source.exists():
                if name == "secrets" or not complete:
                    continue
                raise RuntimeError(f"Required backup path is missing: {name}")
            if source.is_symlink() or (source.is_dir() and any(p.is_symlink() for p in source.rglob("*"))):
                raise RuntimeError(f"Backup path contains a symbolic link: {name}")
            if source.is_dir():
                shutil.copytree(source, snapshot / name)
            else:
                shutil.copy2(source, snapshot / name)
            for p in [snapshot / name, *(snapshot / name).rglob("*")] if source.is_dir() else [snapshot / name]:
                p.chmod(0o700 if p.is_dir() else 0o600)
        image = self.image() if complete else None
        self.write(snapshot / "metadata.json", json.dumps({"image": image, "captured_at": time.time()}))
        return snapshot

    def block(self, error):
        self.write(self.state / "blocked", f"{time.time()}: {error}\n")
        # Stop explicitly so restart: unless-stopped cannot rerun a failed migration.
        self.compose("stop", "-t", "30", "app")

    def upload(self, snapshot):
        output = self.command(["restic", "--retry-lock", "10m", "backup", "--json",
                               "--host", "jobsync-ovh", "--tag", "jobsync", str(snapshot)])
        summary = next((json.loads(line) for line in output.splitlines()
                        if json.loads(line).get("message_type") == "summary"), None)
        if not summary or not summary.get("snapshot_id"):
            raise RuntimeError("Restic did not confirm an off-server snapshot")
        self.write(self.state / "last-backup", summary["snapshot_id"] + "\n")
        print("Backup confirmed: " + summary["snapshot_id"], flush=True)

    def backup(self, keep_stopped=False):
        was_running = self.running()
        snapshot = None
        completed = False
        try:
            if was_running:
                self.compose("stop", "-t", "30", "app")
            snapshot = self.capture()
            if was_running and not keep_stopped:
                self.compose("start", "app")
            self.upload(snapshot)
            completed = True
            return snapshot
        finally:
            if was_running and not completed:
                self.compose("start", "app")
            # Failed uploads retain the private local snapshot for diagnosis.
            if snapshot and completed:
                shutil.rmtree(snapshot)

    def prune(self):
        self.command(["restic", "--retry-lock", "10m", "forget", "--host", "jobsync-ovh",
                      "--tag", "jobsync", "--group-by", "host,tags", "--keep-daily", "7", "--keep-weekly", "4",
                      "--keep-monthly", "6", "--prune"])

    def deploy(self):
        if (self.state / "blocked").exists():
            raise RuntimeError("Deployment is blocked; inspect the journal and restore a matching backup")
        self.command(["docker", "pull", IMAGE + ":production"])
        references = self.command(["docker", "image", "inspect", "--format",
                                   "{{range .RepoDigests}}{{println .}}{{end}}", IMAGE + ":production"])
        target = next((ref for ref in references.splitlines() if DIGEST.fullmatch(ref)), None)
        if not target:
            raise RuntimeError("Published image does not have an approved immutable digest")
        current_file = self.state / "current-ref"
        if current_file.exists() and current_file.read_text().strip() == target:
            print("Image unchanged", flush=True)
            return
        old = self.image()
        self.backup(keep_stopped=True)
        self.write(self.state / "previous-ref", old + "\n")
        try:
            self.write(self.root / "release.env", "JOBSYNC_IMAGE=" + target + "\n")
            self.compose("up", "-d", "--no-build", "--pull", "never", "app")
            if not self.healthy():
                raise RuntimeError("Application health check failed after deployment")
            self.write(current_file, target + "\n")
            print("Deployed " + target, flush=True)
        except Exception as error:
            self.block(error)
            raise

    def restore(self, snapshot_id):
        if not re.fullmatch(r"[a-f0-9]{8,64}", snapshot_id):
            raise RuntimeError("Use a specific Restic snapshot ID")
        with tempfile.TemporaryDirectory(prefix="restore-", dir=self.state) as directory:
            stage = pathlib.Path(directory)
            self.command(["restic", "--retry-lock", "10m", "restore", snapshot_id,
                          "--target", str(stage), "--verify"])
            manifests = list(stage.rglob("metadata.json"))
            if len(manifests) != 1:
                raise RuntimeError("Snapshot must contain exactly one JobSync backup")
            restored = manifests[0].parent
            image = json.loads(manifests[0].read_text())["image"]
            if not DIGEST.fullmatch(image):
                raise RuntimeError("Snapshot has an invalid image reference")
            for name in ("data/dev.db", ".env", "compose.yml", "release.env"):
                if not (restored / name).exists():
                    raise RuntimeError(f"Snapshot is incomplete: {name}")
            with sqlite3.connect(f"file:{restored / 'data/dev.db'}?mode=ro", uri=True) as db:
                if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise RuntimeError("Restored SQLite integrity check failed")
            self.command(["docker", "pull", image])
            required = ("data", ".env", "compose.yml", "release.env")
            if all((self.root / name).exists() for name in required):
                self.backup(keep_stopped=True)
            elif self.root.exists() and any(self.root.iterdir()):
                containers = self.command(["docker", "ps", "-aq", "--filter",
                                           "label=com.docker.compose.project=jobsync", "--filter",
                                           "label=com.docker.compose.service=app"]).splitlines()
                if containers:
                    self.command(["docker", "stop", *containers])
                remnants = self.capture(complete=False)
                self.upload(remnants)
                # Keep partial local recovery material until it is inspected.
            self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
            try:
                for name in ("data", "secrets", ".env", "compose.yml", "release.env"):
                    source, target = restored / name, self.root / name
                    if not source.exists():
                        continue
                    if target.is_dir():
                        shutil.rmtree(target)
                    elif target.exists():
                        target.unlink()
                    if source.is_dir():
                        shutil.copytree(source, target)
                    else:
                        shutil.copy2(source, target)
                self.write(self.root / "release.env", "JOBSYNC_IMAGE=" + image + "\n")
                self.compose("up", "-d", "--no-build", "--pull", "never", "app")
                if not self.healthy():
                    raise RuntimeError("Application health check failed after restore")
                self.write(self.state / "current-ref", image + "\n")
                (self.state / "blocked").unlink(missing_ok=True)
            except Exception as error:
                self.block(error)
                raise


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["backup", "deploy", "restore"])
    parser.add_argument("snapshot", nargs="?")
    args = parser.parse_args()
    operations = Operations()
    with operations.lock():
        if args.operation == "deploy":
            operations.deploy()
        elif args.operation == "restore":
            if not args.snapshot:
                parser.error("restore requires a snapshot ID")
            operations.restore(args.snapshot)
        else:
            operations.backup()
            operations.prune()


if __name__ == "__main__":
    main()
