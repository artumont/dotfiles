#!/usr/bin/env python3
"""Install dotfiles as symlinks without touching generated application state."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = Path(__file__).with_name("manifest.json")
DEFAULT_BACKUP_DIR = Path("~/.local/state/dotfiles-backups").expanduser()


def load_manifest(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(encoding="utf-8") as file:
            data: Any = json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Cannot read manifest {path}: {error}") from error

    links = data.get("links") if isinstance(data, dict) else None
    if not isinstance(links, list):
        raise ValueError(f"Manifest {path} must contain a 'links' list")

    result: list[dict[str, str]] = []
    for index, link in enumerate(links):
        if not isinstance(link, dict):
            raise ValueError(f"Manifest entry {index} must be an object")
        name = link.get("name")
        source = link.get("source")
        dest = link.get("dest")
        if not isinstance(name, str) or not name:
            raise ValueError(f"Manifest entry {index} needs a non-empty name")
        if not isinstance(source, str) or not source:
            raise ValueError(f"Manifest entry {index} needs a non-empty source")
        if not isinstance(dest, str) or not dest:
            raise ValueError(f"Manifest entry {index} needs a non-empty dest")
        result.append({"name": name, "source": source, "dest": dest})
    return result


def source_path(raw_source: str) -> Path:
    path = Path(os.path.expandvars(os.path.expanduser(raw_source)))
    if not path.is_absolute():
        path = ROOT / path
    path = path.resolve()
    if not path.exists():
        raise FileNotFoundError(f"Source does not exist: {path}")
    return path


def destination_path(raw_dest: str) -> Path:
    path = Path(os.path.expandvars(os.path.expanduser(raw_dest)))
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def is_within(path: Path, root: Path) -> bool:
    """True if path equals or lives under root."""
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def resolve_safely(path: Path) -> Path | None:
    """Resolve symlinks, returning None for loops or unreadable paths."""
    try:
        return path.resolve()
    except (OSError, RuntimeError):
        return None


def guard_repo_destination(dest: Path) -> None:
    """Refuse destinations whose write would land inside the repository.

    A manifest entry nested inside an already-linked parent resolves
    through that parent's symlink: the child source gets removed and
    replaced by a self-referential symlink (ELOOP), so the app sees it as
    missing. Link only the parent.
    """
    parent = resolve_safely(dest.parent)
    if parent is not None and is_within(parent, ROOT):
        raise ValueError(
            f"Destination {dest} would be written inside the repository "
            f"({parent}) — link only the parent directory"
        )
    if not dest.is_symlink():
        resolved = resolve_safely(dest)
        if resolved is not None and is_within(resolved, ROOT):
            raise ValueError(
                f"Destination {dest} resolves inside the repository ({resolved}) "
                "— refusing to modify repo sources"
            )


def validate_entries(entries: list[dict[str, str]]) -> None:
    """Reject entries nested inside another entry.

    Linking a child whose parent is already a symlink writes through that
    symlink back into the repository: the child source gets deleted and
    replaced by a self-referential symlink (ELOOP), so the app sees it as
    missing. Only the parent should be linked.
    """
    for field in ("source", "dest"):
        paths = [(entry["name"], Path(entry[field])) for entry in entries]
        for index, (name_a, path_a) in enumerate(paths):
            for name_b, path_b in paths[index + 1 :]:
                if path_a == path_b:
                    continue
                if is_within(path_a, path_b) or is_within(path_b, path_a):
                    raise ValueError(
                        f"Manifest entries '{name_a}' and '{name_b}' overlap on "
                        f"{field} path ({path_a} vs {path_b}) — link only the parent"
                    )


def backup_path(dest: Path, backup_dir: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    relative = Path(str(dest).lstrip("/"))
    candidate = backup_dir / stamp / relative
    suffix = 1
    while candidate.exists() or candidate.is_symlink():
        candidate = backup_dir / f"{stamp}-{suffix}" / relative
        suffix += 1
    return candidate


def backup_existing(dest: Path, backup_dir: Path) -> Path:
    backup = backup_path(dest, backup_dir)
    backup.parent.mkdir(parents=True, exist_ok=True)

    if dest.is_symlink():
        backup.symlink_to(os.readlink(dest), target_is_directory=dest.resolve().is_dir())
    elif dest.is_dir():
        shutil.copytree(dest, backup, symlinks=True)
    else:
        shutil.copy2(dest, backup)

    return backup


def remove_existing(dest: Path, backup_dir: Path, make_backup: bool) -> None:
    if not (dest.exists() or dest.is_symlink()):
        return

    if make_backup:
        backup = backup_existing(dest, backup_dir)
        print(f"  backup: {dest} -> {backup}")

    if dest.is_symlink() or dest.is_file():
        dest.unlink()
    else:
        try:
            shutil.rmtree(dest)
        except OSError as error:
            raise OSError(f"Cannot remove existing destination {dest}: {error}") from error


def install_link(
    entry: dict[str, str], *, dry_run: bool, make_backup: bool, backup_dir: Path
) -> None:
    source = source_path(entry["source"])
    dest = destination_path(entry["dest"])
    print(f"{entry['name']}: {source} -> {dest}")

    if dest.is_symlink() and resolve_safely(dest) == source:
        print("  already installed")
        return

    guard_repo_destination(dest)

    if dry_run:
        if dest.exists() or dest.is_symlink():
            print("  would replace existing destination")
        else:
            print("  would create symlink")
        return

    remove_existing(dest, backup_dir, make_backup)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.symlink_to(source, target_is_directory=source.is_dir())
    print("  installed")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest", type=Path, default=DEFAULT_MANIFEST, help="Manifest JSON path"
    )
    parser.add_argument(
        "--only", action="append", help="Install only named entry; repeatable"
    )
    parser.add_argument("--dry-run", action="store_true", help="Show changes only")
    parser.add_argument(
        "--no-backup", action="store_true", help="Replace destinations without backups"
    )
    parser.add_argument(
        "--backup-dir", type=Path, default=DEFAULT_BACKUP_DIR, help="Backup directory"
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = args.manifest.expanduser()
    if not manifest.is_absolute():
        manifest = Path.cwd() / manifest

    try:
        entries = load_manifest(manifest.resolve())
        selected = set(args.only or [])
        if selected:
            known = {entry["name"] for entry in entries}
            unknown = selected - known
            if unknown:
                raise ValueError(f"Unknown --only entry: {', '.join(sorted(unknown))}")
            entries = [entry for entry in entries if entry["name"] in selected]

        validate_entries(entries)

        backup_dir = args.backup_dir.expanduser().resolve()
        if not args.dry_run and not args.no_backup:
            backup_dir.mkdir(parents=True, exist_ok=True)

        for entry in entries:
            install_link(
                entry,
                dry_run=args.dry_run,
                make_backup=not args.no_backup,
                backup_dir=backup_dir,
            )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
