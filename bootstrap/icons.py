"""Icon management: validation, scaling, install, remove, scan."""

from __future__ import annotations

import contextlib
import shutil
from pathlib import Path
from typing import TYPE_CHECKING

from defusedxml import ElementTree as ET

if TYPE_CHECKING:
    from xml.etree.ElementTree import Element

ROOT = Path(__file__).resolve().parents[1]
REPO_ICONS_DIR = ROOT / "desktop" / "icons"

HICOLOR_BASE = Path("~/.local/share/icons/hicolor").expanduser()

# Vector icons live in one directory, not one per size.
SCALABLE_DIR = HICOLOR_BASE / "scalable"

# Sentinel "size" for icons stored in scalable/. Sorts before every real size.
SCALABLE_SIZE = 0

# Standard hicolor sizes (px)
ICON_SIZES = [16, 22, 24, 32, 48, 64, 96, 128, 192, 256, 512, 1024]

# HiDPI @2x sizes
ICON_SIZES_2X = [s * 2 for s in ICON_SIZES]

MIN_ICON_SIZE = 1024
# Raster floor only. SVG is vector, so the floor is meaningless there —
# _validate_svg only rejects degenerate dimensions.

ICON_CATEGORIES = [
    ("apps", "Applications (launchers, .desktop)"),
    ("mimetypes", "File type associations"),
    ("devices", "Hardware devices"),
    ("categories", "App categories (folders)"),
    ("emblems", "Emblems / overlays"),
    ("status", "Status icons"),
    ("panel", "Panel / taskbar"),
]

CATEGORY_NAMES = {cat for cat, _ in ICON_CATEGORIES}

ICON_FORMATS = {".png", ".svg", ".xpm"}


def size_label(size: int) -> str:
    if size == SCALABLE_SIZE:
        return "scalable"
    px = f"{size}x{size}"
    if size % 1024 == 0 and size >= 1024:
        return f"{px}  ({size // 1024}K)"
    if size % 512 == 0 and size >= 512:
        return f"{px}  ({size // 512}×½K)"
    return px


def install_dir(size: int, category: str) -> Path:
    """Return the hicolor directory for a given size + category."""
    return HICOLOR_BASE / f"{size}x{size}" / category


def category_dir(size: int, category: str) -> Path:
    """Install directory for a size, accepting the SCALABLE_SIZE sentinel."""
    if size == SCALABLE_SIZE:
        return SCALABLE_DIR / category
    return install_dir(size, category)


# --- repo icons scan --------------------------------------------------------


class RepoIcon:
    """An icon source file found in the repo's icons/ folder."""

    def __init__(self, path: Path, category: str, name: str) -> None:
        self.path = path
        self.category = category
        self.name = name

    def __repr__(self) -> str:
        return f"RepoIcon({self.category}/{self.name}, {self.path})"


def scan_repo_icons() -> list[RepoIcon]:
    """Scan icons/ folder for source icon files.

    Expected layout:
        desktop/icons/
          apps/myapp.png
          mimetypes/mytype.svg
          devices/mydevice.png

    Files directly in icons/ (no category subdir) are reported as
    category="uncategorized" and need manual category assignment.
    """
    if not REPO_ICONS_DIR.is_dir():
        return []

    found: list[RepoIcon] = []

    for item in sorted(REPO_ICONS_DIR.iterdir()):
        if item.is_dir():
            # category subfolder
            cat_name = item.name
            if cat_name.startswith((".", "_")):
                continue
            for icon_file in sorted(item.iterdir()):
                if icon_file.is_file() and icon_file.suffix.lower() in ICON_FORMATS:
                    found.append(RepoIcon(icon_file, cat_name, icon_file.stem))
        elif item.is_file() and item.suffix.lower() in ICON_FORMATS:
            # file directly in icons/ — uncategorized
            found.append(RepoIcon(item, "uncategorized", item.stem))

    return found


def ensure_repo_icons_dir() -> Path:
    """Create desktop/icons/ folder with category subdirs if missing."""
    REPO_ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for cat_name, _ in ICON_CATEGORIES:
        (REPO_ICONS_DIR / cat_name).mkdir(exist_ok=True)
    return REPO_ICONS_DIR


def repo_icons_by_category() -> dict[str, list[RepoIcon]]:
    """Scan and group by category."""
    icons = scan_repo_icons()
    by_cat: dict[str, list[RepoIcon]] = {}
    for ri in icons:
        by_cat.setdefault(ri.category, []).append(ri)
    return by_cat


# --- validation -------------------------------------------------------------


def validate_source(path: Path) -> tuple[bool, str]:
    """Validate a source icon file. Returns (ok, error_message)."""
    if not path.exists():
        return False, f"File not found: {path}"

    if not path.is_file():
        return False, f"Not a file: {path}"

    if path.suffix.lower() not in ICON_FORMATS:
        return (
            False,
            f"Unsupported format '{path.suffix}' — use PNG, SVG, or XPM",
        )

    # SVG is vector — check declared dimensions
    if path.suffix.lower() == ".svg":
        return _validate_svg(path)

    # Raster: check pixel dimensions
    return _validate_raster(path)


def _svg_length(value: str | None) -> int | None:
    """Parse an SVG length attribute into px. None when not a plain number."""
    if not value:
        return None
    cleaned = value.strip().lower().removesuffix("px").removesuffix("pt")
    try:
        return int(float(cleaned))
    except ValueError:
        return None


def _svg_dimensions(root: Element) -> tuple[int, int] | None:
    """Declared width/height in px, falling back to the viewBox."""
    w = _svg_length(root.get("width"))
    h = _svg_length(root.get("height"))
    if w is not None and h is not None:
        return w, h

    viewbox = (root.get("viewBox") or "").replace(",", " ").split()
    if len(viewbox) == 4:
        with contextlib.suppress(ValueError):
            return int(float(viewbox[2])), int(float(viewbox[3]))
    return None


def _validate_svg(path: Path) -> tuple[bool, str]:
    """SVG is vector — MIN_ICON_SIZE does not apply.

    A 602x734 SVG is crisp at every size, so the raster floor would reject
    perfectly good icons. Only reject degenerate dimensions.
    """
    with contextlib.suppress(Exception):
        tree = ET.parse(path)
        root = tree.getroot()
        if root is None:
            return True, ""
        dims = _svg_dimensions(root)
        if dims is not None and (dims[0] <= 0 or dims[1] <= 0):
            return False, f"SVG has invalid dimensions {dims[0]}x{dims[1]}"
    # unparseable SVG: accept it anyway
    return True, ""


def _validate_raster(path: Path) -> tuple[bool, str]:
    try:
        from PIL import Image

        with Image.open(path) as img:
            w, h = img.size
    except ImportError:
        return False, "Pillow not installed — needed for raster icon validation"
    except Exception as error:
        return False, f"Cannot read image: {error}"

    if w < MIN_ICON_SIZE or h < MIN_ICON_SIZE:
        return (
            False,
            f"Image is {w}x{h}px — minimum is {MIN_ICON_SIZE}x{MIN_ICON_SIZE}px",
        )

    if w != h:
        return False, f"Image is {w}x{h}px — icons should be square"

    return True, ""


def get_image_dimensions(path: Path) -> tuple[int, int] | None:
    """Return (width, height) for raster images, None on error.

    For SVG this is the declared size (or viewBox), reported for display only.
    """
    if path.suffix.lower() == ".svg":
        with contextlib.suppress(Exception):
            tree = ET.parse(path)
            root = tree.getroot()
            if root is None:
                return None
            return _svg_dimensions(root)
        return None

    try:
        from PIL import Image

        with Image.open(path) as img:
            return img.size
    except Exception:
        return None


# --- scaling ----------------------------------------------------------------


def scale_icon(source: Path, size: int, dest: Path) -> None:
    """Scale a raster icon to the target size and write to dest."""
    from PIL import Image

    with Image.open(source) as img:
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "PNG")


def copy_svg(source: Path, dest: Path) -> None:
    """Copy SVG verbatim — vector, no scaling needed."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)


# --- installed icons scan ----------------------------------------------------


def installed_icons() -> dict[str, dict[str, list[int]]]:
    """Scan ~/.local/share/icons/hicolor/ and return {name: {category: [sizes]}}.

    Icons in scalable/ are reported under the SCALABLE_SIZE sentinel.
    """
    icons: dict[str, dict[str, list[int]]] = {}
    if not HICOLOR_BASE.is_dir():
        return icons

    for size_path in sorted(HICOLOR_BASE.iterdir()):
        if not size_path.is_dir():
            continue
        size_str = size_path.name.split("@")[0]
        if size_str == SCALABLE_DIR.name:
            size = SCALABLE_SIZE
        else:
            parts = size_str.split("x")
            if len(parts) != 2:
                continue
            try:
                size = int(parts[0])
            except ValueError:
                continue
            if parts[0] != parts[1]:
                continue

        for cat_dir in sorted(size_path.iterdir()):
            if not cat_dir.is_dir():
                continue
            category = cat_dir.name
            for icon_file in cat_dir.iterdir():
                if icon_file.is_file() and icon_file.suffix.lower() in ICON_FORMATS:
                    name = icon_file.stem
                    icons.setdefault(name, {}).setdefault(category, []).append(size)
    return icons


def remove_icon_files(name: str, icons_db: dict[str, dict[str, list[int]]]) -> int:
    """Remove all files for a given icon name. Returns count of removed files."""
    if name not in icons_db:
        return 0

    removed = 0
    for cat, sizes in icons_db[name].items():
        for size in sizes:
            for ext in ICON_FORMATS:
                target = category_dir(size, cat) / f"{name}{ext}"
                if target.exists():
                    try:
                        target.unlink()
                        _clean_empty_parents(target.parent)
                        removed += 1
                    except OSError:
                        pass
    return removed


def _clean_empty_parents(path: Path) -> None:
    """Remove empty parent directories up to HICOLOR_BASE."""
    while path != HICOLOR_BASE and path.parent != path:
        if path.is_dir() and not any(path.iterdir()):
            path.rmdir()
            path = path.parent
        else:
            break
