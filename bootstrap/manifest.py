"""Manifest and dotfile candidate operations."""

from __future__ import annotations

from pathlib import Path

from bootstrap.install import load_manifest, source_path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOTS = ("home", "system", "hardware")
EXCLUDED_DIRS = {"__pycache__"}
EXCLUDED_SUFFIXES = {".vil", ".pyc"}


def manifest_sources(manifest_path: Path) -> set[str]:
    try:
        return {entry["source"] for entry in load_manifest(manifest_path)}
    except (OSError, ValueError):
        return set()


def is_inside(source: str, roots: set[str]) -> bool:
    """True if source equals or lives under one of the root paths."""
    for root in roots:
        if source == root or source.startswith(root.rstrip("/") + "/"):
            return True
    return False


def list_candidates(manifest_path: Path) -> list[Path]:
    """Files and folders not already covered by a manifest entry.

    Entries inside an already-linked folder are hidden — that folder gets
    symlinked as a whole."""
    covered = manifest_sources(manifest_path)
    candidates: list[Path] = []
    for root_name in SOURCE_ROOTS:
        root = ROOT / root_name
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*")):
            relative = str(path.relative_to(ROOT))
            if EXCLUDED_DIRS.intersection(path.parts):
                continue
            if path.suffix in EXCLUDED_SUFFIXES:
                continue
            if is_inside(relative, covered):
                continue
            candidates.append(path.relative_to(ROOT))
    return candidates


def human_size(size: float) -> str:
    for unit in ("B", "KiB", "MiB"):
        if size < 1024:
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} GiB"


def suggest_dest(source: str) -> str:
    """Mirror repo layout into $HOME by default: home/.config/nvim -> ~/.config/nvim."""
    parts = Path(source).parts
    if parts and parts[0] == "home":
        return "~/" + "/".join(parts[1:])
    if parts and parts[0] in ("system", "hardware"):
        return "~/.config/" + "/".join(parts[1:])
    return "~/.config/" + source
