"""Safe pull: detach or restore symlinked configs whose repo source disappears."""

from __future__ import annotations

import argparse
import io
import json
import shutil
import subprocess
import sys
import tarfile
import tempfile
from dataclasses import dataclass
from pathlib import Path

from bootstrap.install import (
    DEFAULT_BACKUP_DIR,
    DEFAULT_MANIFEST,
    ROOT,
    backup_path,
    destination_path,
    is_within,
    load_manifest,
    resolve_safely,
    source_path,
)


class PullError(Exception):
    pass


@dataclass(frozen=True)
class Conflict:
    name: str
    source: str
    dest: Path
    deleted: tuple[str, ...]


def _git(*args: str, root: Path = ROOT) -> str:
    result = subprocess.run(
        ["git", *args], cwd=root, capture_output=True, text=True, check=False
    )
    if result.returncode != 0:
        raise PullError(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result.stdout


def _git_bytes(*args: str, root: Path = ROOT) -> bytes:
    result = subprocess.run(
        ["git", *args], cwd=root, capture_output=True, check=False
    )
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", "replace").strip()
        raise PullError(message or f"git {' '.join(args)} failed")
    return result.stdout


def _git_optional(*args: str, root: Path = ROOT) -> str | None:
    result = subprocess.run(
        ["git", *args], cwd=root, capture_output=True, text=True, check=False
    )
    return result.stdout.strip() if result.returncode == 0 else None


def fetch(root: Path = ROOT) -> None:
    _git("fetch", "--prune", root=root)


def upstream_ref(root: Path = ROOT) -> str:
    return _git(
        "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}", root=root
    ).strip()


def is_behind(root: Path = ROOT) -> bool:
    ahead = _git("rev-list", "--count", f"HEAD..{upstream_ref(root)}", root=root)
    return int(ahead.strip() or 0) > 0


def incoming_deletions(root: Path = ROOT) -> set[str]:
    output = _git(
        "diff", "--name-status", "-M", f"HEAD..{upstream_ref(root)}", root=root
    )
    deleted: set[str] = set()
    for line in output.splitlines():
        fields = line.split("\t")
        if len(fields) < 2:
            continue
        # Renames keep only the old path here: that is the one that vanishes.
        if fields[0][:1] in ("D", "R"):
            deleted.add(fields[1])
    return deleted


def find_conflicts(
    entries: list[dict[str, str]], deleted: set[str], *, root: Path = ROOT
) -> list[Conflict]:
    conflicts: list[Conflict] = []
    for entry in entries:
        source = entry["source"].rstrip("/")
        hits = tuple(
            sorted(
                path
                for path in deleted
                if path == source or path.startswith(source + "/")
            )
        )
        if not hits:
            continue
        dest = destination_path(entry["dest"])
        if not _is_repo_link(dest, root):
            continue
        conflicts.append(Conflict(entry["name"], entry["source"], dest, hits))
    return conflicts


def detach(
    conflict: Conflict, *, root: Path = ROOT, backup_dir: Path = DEFAULT_BACKUP_DIR
) -> Path:
    """Replace the symlink with a real copy of its content, return the backup."""
    if not _is_repo_link(conflict.dest, root):
        raise PullError(
            f"{conflict.dest} is not a symlink into the repo; refusing to touch it"
        )

    source = source_path(conflict.source)
    backup = backup_path(conflict.dest, backup_dir)
    backup.parent.mkdir(parents=True, exist_ok=True)
    _copy(source, backup)

    conflict.dest.unlink()
    _copy(source, conflict.dest)
    return backup


def pull(root: Path = ROOT) -> str:
    return _git("pull", "--ff-only", root=root)


def missing_sources(entries: list[dict[str, str]], *, root: Path = ROOT) -> list[str]:
    return [
        entry["name"]
        for entry in entries
        if not (root / entry["source"].rstrip("/")).exists()
    ]


def ensure_hooks(root: Path = ROOT) -> str:
    hooks = "bootstrap/hooks"
    current = _git_optional("config", "--get", "core.hooksPath", root=root)
    if current is None:
        _git("config", "core.hooksPath", hooks, root=root)
        return f"enabled git hooks from {hooks}"
    if Path(current).resolve() == (root / hooks).resolve():
        return ""
    return f"warning: core.hooksPath is {current}; the repair hook is not active"


def previous_head(root: Path = ROOT) -> str | None:
    for ref in ("ORIG_HEAD", "HEAD@{1}"):
        commit = _git_optional("rev-parse", "--verify", f"{ref}^{{commit}}", root=root)
        if commit:
            return commit
    return None


def manifest_at(commit: str, root: Path = ROOT) -> list[dict[str, str]]:
    data = json.loads(_git("show", f"{commit}:bootstrap/manifest.json", root=root))
    links = data.get("links") if isinstance(data, dict) else None
    return [entry for entry in links or [] if isinstance(entry, dict)]


def repair_dangling(
    *, root: Path = ROOT, backup_dir: Path = DEFAULT_BACKUP_DIR
) -> list[Path]:
    """Restore symlinked configs whose source a pull deleted, from the pre-pull commit."""
    commit = previous_head(root)
    if commit is None:
        return []

    repaired: list[Path] = []
    for entry in manifest_at(commit, root):
        dest = destination_path(entry["dest"])
        if not dest.is_symlink():
            continue
        resolved = resolve_safely(dest)
        if resolved is None or not is_within(resolved, root) or resolved.exists():
            continue

        source = entry["source"].rstrip("/")
        kind = _git_optional("cat-file", "-t", f"{commit}:{source}", root=root)
        if kind is None:
            continue

        backup = backup_path(dest, backup_dir)
        backup.parent.mkdir(parents=True, exist_ok=True)
        _restore(commit, source, backup, kind, root=root)
        dest.unlink()
        _copy(backup, dest)
        repaired.append(dest)
    return repaired


def _restore(commit: str, source: str, dest: Path, kind: str, *, root: Path) -> None:
    if kind == "tree":
        archive = _git_bytes("archive", "--format=tar", commit, source, root=root)
        with tempfile.TemporaryDirectory() as tmp:
            with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
                try:
                        tar.extractall(tmp, filter="data")
                except TypeError:  # filter= needs Python 3.12+
                        tar.extractall(tmp)
            shutil.copytree(Path(tmp) / source, dest, symlinks=True)
        return

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(_git_bytes("show", f"{commit}:{source}", root=root))


def _is_repo_link(dest: Path, root: Path) -> bool:
    if not dest.is_symlink():
        return False
    resolved = resolve_safely(dest)
    return resolved is not None and is_within(resolved, root)


def _copy(source: Path, dest: Path) -> None:
    if source.is_dir():
        shutil.copytree(source, dest, symlinks=True)
    else:
        shutil.copy2(source, dest)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest", type=Path, default=DEFAULT_MANIFEST, help="Manifest JSON path"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report conflicts without changing anything (exit 1 if any)",
    )
    parser.add_argument(
        "--yes", action="store_true", help="Detach without asking"
    )
    parser.add_argument(
        "--repair",
        action="store_true",
        help="Restore links a pull already broke (used by the post-merge hook)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or [])

    try:
        if args.repair:
            for dest in repair_dangling():
                print(f"restored {dest}")
            return 0

        manifest = args.manifest.expanduser().resolve()
        entries = load_manifest(manifest)

        fetch()
        if not args.check:
            note = ensure_hooks()
            if note:
                print(note)

        if not is_behind():
            print("already up to date")
            return 0

        conflicts = find_conflicts(entries, incoming_deletions())
        if conflicts:
            print("these linked configs disappear upstream:")
            for conflict in conflicts:
                print(f"  {conflict.name}: {conflict.dest}")
            if args.check:
                return 1
        elif args.check:
            print("no linked config is deleted upstream")
            return 0

        for conflict in conflicts:
            if not args.yes and not _confirm(f"detach {conflict.name} and keep a copy?"):
                print("pull cancelled")
                return 1
            backup = detach(conflict)
            print(f"detached {conflict.dest} (backup: {backup})")

        print(pull().strip() or "pulled")
    except (OSError, ValueError, json.JSONDecodeError, PullError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    missing = missing_sources(load_manifest(manifest))
    if missing:
        print(f"warning: manifest sources missing: {', '.join(missing)}")
    return 0


def _confirm(prompt: str) -> bool:
    answer = input(f"  {prompt} (Y/n): ").strip().lower()
    return answer in ("", "y", "yes")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
