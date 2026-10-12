import importlib.util
import pathlib
import tempfile
import unittest
import sqlite3
import shutil
import json
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).resolve().parents[2] / "deploy" / "jobsync-operations.py"
spec = importlib.util.spec_from_file_location("operations", SCRIPT)
operations = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operations)


class OperationsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name) / "app"
        self.state = pathlib.Path(self.temp.name) / "state"
        self.root.mkdir()
        (self.root / "data").mkdir()
        (self.root / "data" / "dev.db").write_bytes(b"database")
        for name in (".env", "compose.yml"):
            (self.root / name).write_text("fixture")
        self.old = "ghcr.io/lucapetrh-dev/jobsync@sha256:" + "a" * 64
        self.new = "ghcr.io/lucapetrh-dev/jobsync@sha256:" + "b" * 64
        (self.root / "release.env").write_text("JOBSYNC_IMAGE=" + self.old + "\n")
        self.ops = operations.Operations(self.root, self.state)
        self.commands = []

    def command(self, args, **kwargs):
        self.commands.append(args)
        if "--services" in args:
            return "app\n"
        if args[:3] == ["docker", "image", "inspect"]:
            return self.new + "\n"
        return ""

    def test_unchanged_image_does_not_stop_or_backup(self):
        (self.state / "current-ref").write_text(self.new)
        with patch.object(self.ops, "command", side_effect=self.command):
            self.ops.deploy()
        self.assertFalse(any("stop" in c or c[0] == "restic" for c in self.commands))

    def test_backup_failure_restarts_old_app_and_does_not_switch_image(self):
        with patch.object(self.ops, "command", side_effect=self.command), \
                patch.object(self.ops, "upload", side_effect=RuntimeError("backup failed")):
            with self.assertRaisesRegex(RuntimeError, "backup failed"):
                self.ops.deploy()
        self.assertEqual(self.ops.image(), self.old)
        self.assertTrue(any("start" in c for c in self.commands))
        self.assertFalse((self.state / "blocked").exists())

    def test_failed_migration_blocks_next_deployment(self):
        def fail_start(args, **kwargs):
            result = self.command(args, **kwargs)
            if "up" in args:
                raise RuntimeError("migration failed")
            return result
        with patch.object(self.ops, "command", side_effect=fail_start), \
                patch.object(self.ops, "upload"):
            with self.assertRaisesRegex(RuntimeError, "migration failed"):
                self.ops.deploy()
        self.assertTrue((self.state / "blocked").exists())
        self.assertEqual(self.commands[-1][-4:], ["stop", "-t", "30", "app"])
        self.commands.clear()
        with patch.object(self.ops, "command", side_effect=self.command):
            with self.assertRaisesRegex(RuntimeError, "blocked"):
                self.ops.deploy()
        self.assertEqual(self.commands, [])

    def test_failed_health_check_preserves_previous_ref(self):
        with patch.object(self.ops, "command", side_effect=self.command), \
                patch.object(self.ops, "upload"), \
                patch.object(self.ops, "healthy", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "health"):
                self.ops.deploy()
        self.assertEqual((self.state / "previous-ref").read_text().strip(), self.old)
        self.assertTrue((self.state / "blocked").exists())

    def test_daily_backup_restarts_before_upload_and_copies_files(self):
        def upload(snapshot):
            self.assertTrue(any("start" in c for c in self.commands))
            self.assertEqual((snapshot / "data" / "dev.db").read_bytes(), b"database")
            self.assertEqual((snapshot / ".env").stat().st_mode & 0o777, 0o600)
        with patch.object(self.ops, "command", side_effect=self.command), \
                patch.object(self.ops, "upload", side_effect=upload):
            self.ops.backup()

    def test_concurrent_operation_is_rejected(self):
        with self.ops.lock():
            with self.assertRaisesRegex(RuntimeError, "already running"):
                with self.ops.lock():
                    self.fail("second operation acquired the lock")

    def test_success_records_digest_only_after_health(self):
        with patch.object(self.ops, "command", side_effect=self.command), \
                patch.object(self.ops, "upload"), \
                patch.object(self.ops, "healthy", return_value=True):
            self.ops.deploy()
        self.assertEqual((self.state / "current-ref").read_text().strip(), self.new)
        self.assertFalse((self.state / "blocked").exists())

    def test_restore_supports_a_fresh_installation(self):
        fixture = pathlib.Path(self.temp.name) / "snapshot"
        shutil.copytree(self.root, fixture)
        (fixture / "data" / "dev.db").unlink()
        with sqlite3.connect(fixture / "data" / "dev.db") as db:
            db.execute("CREATE TABLE restored (value TEXT)")
            db.execute("INSERT INTO restored VALUES ('preserved')")
        (fixture / "metadata.json").write_text(json.dumps({"image": self.old}))
        shutil.rmtree(self.root)
        def restore_command(args, **kwargs):
            if args[0] == "restic" and "restore" in args:
                target = pathlib.Path(args[args.index("--target") + 1]) / "snapshot"
                shutil.copytree(fixture, target)
            return self.command(args, **kwargs)
        with patch.object(self.ops, "command", side_effect=restore_command), \
                patch.object(self.ops, "healthy", return_value=True):
            self.ops.restore("12345678")
        with sqlite3.connect(self.root / "data" / "dev.db") as db:
            self.assertEqual(db.execute("SELECT value FROM restored").fetchone()[0], "preserved")


if __name__ == "__main__":
    unittest.main()
