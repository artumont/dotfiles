#!/usr/bin/env python3
"""Abre la GUI del dotfiles manager."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "bootstrap" / "manifest.json"


def main() -> int:
    if not MANIFEST.exists():
        sys.exit(f"no encontré {MANIFEST}")
    if not os.environ.get("DISPLAY") and not os.environ.get("WAYLAND_DISPLAY"):
        sys.exit("esto necesita sesión gráfica")

    from gi.repository import Gtk  # type: ignore[import-not-found]

    from bootstrap.ui.window import ToolsWindow

    window = ToolsWindow(ROOT, MANIFEST)
    window.connect("destroy", Gtk.main_quit)
    window.show_all()
    Gtk.main()
    return 0


if __name__ == "__main__":
    sys.exit(main())
