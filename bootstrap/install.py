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
    with path.open(encoding="utf-8") as file:
        data: Any = json.load(file)

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
        shutil.rmtree(dest)


def install_link(
    entry: dict[str, str], *, dry_run: bool, make_backup: bool, backup_dir: Path
) -> None:
    source = source_path(entry["source"])
    dest = destination_path(entry["dest"])
    print(f"{entry['name']}: {source} -> {dest}")

    if dest.is_symlink() and dest.resolve() == source:
        print("  already installed")
        return

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
