"""Manifest and dotfile candidate operations."""

from __future__ import annotations

import json
import os
from pathlib import Path

from bootstrap.install import load_manifest

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOTS = ("home", "desktop", "system", "hardware")
EXCLUDED_DIRS = {"__pycache__"}
EXCLUDED_SUFFIXES = {".vil", ".pyc"}


def read(manifest_path: Path) -> dict:
    """Manifest completo; ValueError si no se puede leer o no es un objeto."""
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise ValueError(f"no pude leer el manifest: {error}") from error
    if not isinstance(data, dict):
        raise ValueError("el manifest no es un objeto JSON")  # noqa: TRY004
    return data


def save_links(manifest_path: Path, links: list[dict]) -> None:
    """Reemplaza solo `links`, sin perder las demás secciones."""
    data = read(manifest_path)
    data["links"] = links
    tmp = manifest_path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(manifest_path)


def expected_secrets(manifest_path: Path) -> list[tuple[str, str, str, str]]:
    """Secretos declarados: (servicio, cuenta, etiqueta, de dónde sale)."""
    return [
        (entry.get("service", ""), entry.get("account", ""), entry.get("label", ""), entry.get("source", ""))
        for entry in read(manifest_path).get("secrets", [])
    ]


def link_state(entry: dict, root: Path = ROOT) -> str:
    dest = Path(os.path.expanduser(entry["dest"]))
    source = root / entry["source"]
    if dest.is_symlink():
        try:
            if dest.resolve() == source.resolve():
                return "enlazado"
            return f"enlace a {dest.resolve()}"
        except OSError:
            return "enlace roto"
    if dest.exists():
        return "archivo real (se respalda)"
    return "sin instalar"


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
    if parts and parts[0] == "desktop":
        return "~/.local/share/" + "/".join(parts[1:])
    return "~/.config/" + source
