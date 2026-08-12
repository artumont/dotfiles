#!/usr/bin/env python3
"""Compatibility entry point for bootstrap/install.py."""

import runpy
from pathlib import Path

if __name__ == "__main__":
    runpy.run_path(
        str(Path(__file__).parent / "bootstrap" / "install.py"), run_name="__main__"
    )
