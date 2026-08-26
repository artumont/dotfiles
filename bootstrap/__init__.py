"""Dotfiles bootstrap package.

Ensures required directories exist on import.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Categories from icons/.paths
ICON_CATEGORIES = [
    "apps",
    "categories",
    "devices",
    "emblems",
    "mimetypes",
    "panel",
    "status",
]


def ensure_dirs() -> None:
    """Create missing icon category dirs and hicolor base."""
    icons_dir = ROOT / "icons"
    hicolor_base = Path("~/.local/share/icons/hicolor").expanduser()

    for cat in ICON_CATEGORIES:
        (icons_dir / cat).mkdir(parents=True, exist_ok=True)

    hicolor_base.mkdir(parents=True, exist_ok=True)


# run on import — keeps dirs in sync without a separate setup step
ensure_dirs()
